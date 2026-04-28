# 03 — 领域模型

本文是**逻辑 schema + 状态机规范**。`db/src/main/resources/db/migration`
下的 Flyway 迁移是它的可执行版本。两者冲突时本文为规范，需要通过迁移
PR 同步对齐。

## 1. 实体地图

```
              ┌────────────┐
              │  merchant  │
              └─────┬──────┘
        ┌──────────┼──────────┬─────────────┐
        ▼          ▼          ▼              ▼
┌──────────┐  ┌──────────┐ ┌──────────────┐ ┌──────────────┐
│ app_user │  │ account  │ │ merchant_    │ │ wallet_      │
│  （认证）│  │          │ │   order      │ │ address      │
└──────────┘  └────┬─────┘ └──────┬───────┘ └──────┬───────┘
                   │              │                │
                   ▼              ▼                ▼
           ┌──────────────┐  ┌────────────┐   ┌──────────┐
           │ ledger_tx    │  │order_event │   │ deposit  │
           │ ledger_entry │  │order_refund│   │withdrawal│
           └──────────────┘  └────────────┘   └──────────┘

参考 / 配置：
   chain · asset · audit_log · idempotency_key · outbox_event
```

## 2. 参考数据

### `chain`
| 字段 | 说明 |
|---|---|
| chain_id（PK） | `ETH`、`BSC`、`POLYGON`、`ARB`、`OP`、`BASE`、`TRON`、`SOL` |
| family | `EVM` / `TRON` / `SOLANA` / `BTC` |
| network | `mainnet` / `testnet` |
| confirmations | 入金确认数下限 |

### `asset`
| 字段 | 说明 |
|---|---|
| asset_code（PK） | `USDT-TRC20`、`USDC-ETH`、`USDC-POLYGON`、`CNY`、`USD` |
| asset_type | `FIAT` / `STABLECOIN` / `CRYPTO` |
| chain_id | 法币为 NULL |
| contract_address | 链原生币或法币为 NULL |
| decimals | USDT/USDC 为 6，ETH 为 18，CNY 为 2 |

> **为何用 asset_code 而非 (symbol, chain)？** 因为同样符号在不同链上**不是同一资产**——
> 合约不同、费用不同、桥接风险不同。把它们当作同一资产在交易所历史上多次造成实际损失。

## 3. 身份

### `merchant`
- `code` 是用于 API 与控制台的**对外公开**标识。
- `kyc_status` 与 `risk_tier` 决定操作准入（如 `PENDING` KYC 不允许外部出金）。

### `app_user`
- 一个用户属于一个商户，**MVP 不支持跨商户用户**。
- `password_hash` 使用 Argon2id + 实例级 pepper（环境变量）。
- `roles` 为 PG 数组，MVP 只用到 `MERCHANT_OPERATOR` / `MERCHANT_ADMIN` /
  `RISK_REVIEWER`，细粒度 RBAC 在后续完善。

## 4. 账户与复式记账

整个代码库最重要的一条规则：

> **所有资金流动都是平衡的复式分录。account 行上的"余额"是**派生**的，不是真相源。**

### 表结构

- `account` —— 每个 `(merchant, account_type, asset)` 唯一一行。
  - `account_type ∈ { AVAILABLE, PENDING, RESERVED, FEE, SETTLEMENT }`
  - 每个商户每种资产至少持有一个 `AVAILABLE` 与 `PENDING` 账户。
- `ledger_tx` —— 一笔逻辑交易，聚合多条 `ledger_entry`。
- `ledger_entry` —— 只追加日记账。DB 约束触发器（延迟到 commit）保证
  `sum(D) == sum(C)` per `tx_id`。

### 典型分录模式

> "**`A → B` 金额 X**" 表示：账户 A 借方、账户 B 贷方、金额 X。

| 流程 | 分录 |
|---|---|
| 检测到入金，等待确认 | `LIABILITY_CHAIN → MERCHANT_PENDING` |
| 入金确认入账 | `MERCHANT_PENDING → MERCHANT_AVAILABLE` |
| 订单结算（链上支付） | `MERCHANT_AVAILABLE → MERCHANT_SETTLEMENT` |
| 平台费 | `MERCHANT_SETTLEMENT → PLATFORM_FEE` |
| 提现申请 | `MERCHANT_AVAILABLE → MERCHANT_RESERVED` |
| 提现完成 | `MERCHANT_RESERVED → LIABILITY_CHAIN` |
| 提现失败 | `MERCHANT_RESERVED → MERCHANT_AVAILABLE`（反向） |
| 退款 | `MERCHANT_AVAILABLE → MERCHANT_REFUND_OUT` |

`LIABILITY_CHAIN` 与 `PLATFORM_FEE` 是**平台级**账户，归属一个特殊的
`merchant.code = 'PLATFORM'` 行。

### 为何 `balance_after` 写在每条分录上

让团队能：
- 单行审计（无需重算）；
- 检测事后篡改（序列断裂即异常）；
- 不扫全表也能查"任意时间点 T 的余额"。

它**不是真相源** —— 是应用在**同一个 `SELECT ... FOR UPDATE` 内**填上去的派生字段。
触发器只校验借贷平衡，不重算余额。

### 不变量（commit 时必须为真）

1. 同 `tx_id` 内 `sum(D) == sum(C)`（触发器保障）。
2. 不允许透支的账户 `balance_after >= 0`（应用层保障，违反即回滚）。
3. 每条 entry 的 account 必须**属于** `ledger_tx` 的 merchant（或平台账户）。
4. `ledger_tx` 与业务记录（订单 / 出金）必须在同一 DB 事务内写入。

## 5. 订单模块

### `merchant_order` 重要列

- `merchant_order_no` 是**商户提供**的；唯一索引为
  `(merchant_id, merchant_order_no)`。**不要**当作全局键。
- `quote_*` 是商户报价币种；`settle_*` 是商户选择的结算币种
  （可不同——CNY 报价、USDC 结算）。
- `expires_at` 对 `CRYPTO` 通道必填；扫块器在过期时自动取消未支付订单。

### 状态机

```
                ┌─────────┐
                │ CREATED │
                └────┬────┘
                     │ submit
                     ▼
              ┌─────────────────┐    expire / cancel
              │ PENDING_PAYMENT ├────────────────────┐
              └────────┬────────┘                    │
                       │ payment confirmed           │
                       ▼                             ▼
                  ┌──────┐                       ┌──────────┐
                  │ PAID │                       │ CANCELLED│
                  └──┬───┘                       └──────────┘
                     │ settle
                     ▼
                ┌──────────┐
                │ SETTLED  │
                └─────┬────┘
              ┌───────┼───────────┐
              ▼       ▼           ▼
        ┌─────────┐ ┌─────────┐ ┌──────────┐
        │REFUNDING│ │DISPUTED │ │ （终态） │
        └────┬────┘ └─────────┘ └──────────┘
             │ refund completed
             ▼
        ┌─────────┐
        │REFUNDED │
        └─────────┘
```

只允许图中存在的转移；其他抛 `ConflictException`。每次转移都写一行
`order_event`（含 `from_status`、`to_status`、actor、reason）。

### 退款
- 一个订单可发起多次部分退款，总额 ≤ `settle_amount`。
- 每次退款独立一笔 `REFUND` 类型 `ledger_tx`。

## 6. 保险柜模块

### `wallet_address`
- MVP 阶段**每个 `(merchant, chain, purpose)` 仅一个地址**。
  我们刻意**不**做 HD 风格的每笔入金轮换地址（运维复杂度过高），
  地址轮换是 v2 议题。
- `custody_ref` 是供方的不透明 ID（如 Cobo 子钱包 ID 或 Mock HD 路径）。
- **绝不**在此存私钥。

### `deposit`
- `(chain_id, tx_hash, log_index)` 唯一，扫块器可重跑。
- 生命周期：

```
DETECTED ──→ CONFIRMING ──→ CREDITED
                    │
                    └──→ REJECTED  （重组 / 灰尘 / 黑名单）
```

- `DETECTED` 时立即入分录 `LIABILITY_CHAIN → MERCHANT_PENDING`，让商户在
  控制台看到"入金中"。`CREDITED` 时（`chain.confirmations` 之后）入分录
  `MERCHANT_PENDING → MERCHANT_AVAILABLE`。这是行业常见 UX。

### `withdrawal`
- 生命周期：

```
REQUESTED ─→ RISK_REVIEW ─→ APPROVED ─→ SUBMITTED ─→ CONFIRMING ─→ COMPLETED
                  │                                                    │
                  ├──→ REJECTED                                        ├──→ FAILED
                  │                                                    │
                  └─── （超限自动拒绝）                                └── RESERVED → AVAILABLE 反向
```

- `REQUESTED` 入 `AVAILABLE → RESERVED`（冻结余额）。
- `COMPLETED` 入 `RESERVED → LIABILITY_CHAIN`。
- `FAILED` / `REJECTED` 反向 `RESERVED → AVAILABLE`。
- 审批人必须与申请人不同（**4-eyes 原则**），服务层强制。可按商户分级配置。

## 7. 收银模块（草案 —— 完整 schema 见 `V4__cashier.sql`）

| 表 | 用途 |
|---|---|
| `payment_intent` | 商户的法币收款 / 出款意图 + 选定的 `FiatRampProvider` |
| `ramp_transaction` | 供方一侧交易记录 + 状态回调 |
| `settlement_quote` | 法币与稳定币之间的冻结报价（TTL ~30 秒） |
| `settlement` | 已执行的结算，关联 payment_intent → ledger_tx |

法币入金 → 稳定币 生命周期：

```
PaymentIntent.CREATED
    → AWAITING_FIAT  （供方返回银行信息或托管页 URL）
    → FIAT_RECEIVED  （供方 webhook）
    → CONVERTING     （锁定 settlement_quote 中的报价）
    → SETTLED        （`DEPOSIT` 类型 ledger_tx 入账稳定币）
    → FAILED / EXPIRED
```

稳定币 → 法币 出金：

```
PaymentIntent.CREATED（channel=FIAT_OUT）
    → STABLECOIN_RESERVED   （AVAILABLE → RESERVED）
    → CONVERTING            （锁定报价、推送供方）
    → FIAT_DISPATCHED       （供方确认银行已出款）
    → SETTLED               （ledger_tx 完成 RESERVED → LIABILITY_FIAT）
    → FAILED                （RESERVED → AVAILABLE 反向）
```

## 8. 审计、幂等、Outbox

### `audit_log`（只追加）
- 触发器禁止 `UPDATE` 与 `DELETE`。
- 通过 `@Audited` 切面在每个命令服务方法写入。
- 字段：actor（用户/系统/webhook）、action（`ORDER.CREATE` 等）、
  resource id、request id、IP、payload（脱敏）、result（`OK`/`DENIED`/`ERROR`）。

### `idempotency_key`
- 复合主键 `(merchant_id, key)`。
- `request_hash` 是规范化请求体的 sha256。同一 key + 不同 body 返回 **HTTP 422**。
- 24 小时过期清理。

### `outbox_event`（V5 引入）
- 事务性 outbox：状态变更 + outbox 事件**同事务**写入 DB。调度器读取
  `status='PENDING'` 行推送到 RocketMQ，ack 后置 `SENT`。
- 这样避免经典的 "DB 已提交、MQ 失败" 不一致问题。

## 9. ID 策略

- 主键统一使用 **UUID v7**（时间序）—— 应用侧通过 `IdGenerator` 生成。
  v7 既保证全局唯一，又对 B-tree 插入友好。
- URL 中的对外 ID 与主键相同，MVP 阶段不区分内部/外部 ID。
- 唯一例外是 `ledger_entry.id`，使用 `BIGSERIAL` —— 纯追加场景下按主键
  顺序扫描最便宜。
