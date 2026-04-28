# 04 — 外部集成（Provider）

MVP 把每一个外部依赖都隐藏在 `domain` 中的**端口（接口）**之后。每个端口
拥有：
- 一个 **Mock** 适配器（`infrastructure/<area>/mock`），用于 MVP 演示；
- 一个 **真实供方桩实现**（`infrastructure/<area>/<vendor>`），后端团队
  在桩内补齐调用细节即可（配置、HTTP 客户端、签名都已就位，仅留 TODO）。

切换 provider 是 `application.yaml` 中的一行配置：

```yaml
obita:
  custody.provider: mock         # mock | cobo | safeheron | fireblocks
  ramp.provider:    mock         # mock | circle | banxa | local-psp
  bridge.provider:  mock         # mock | layerzero | wormhole | squid
```

## 1. ChainAdapter — 多链抽象

```java
public interface ChainAdapter {
    ChainId chainId();

    /** 当前最终块。 */
    long latestBlock();

    /** 订阅指定地址集的入账事件，回调推送至 sink。 */
    void scan(BlockRange range, Set<Address> watch, Consumer<ChainCredit> sink);

    /** 读取原生币或 token 余额。 */
    BigDecimal balanceOf(Address addr, AssetCode asset);

    /** 查询 tx 收据 + 确认数。 */
    TxStatus status(String txHash);

    /** 估算 (asset, amount, to) 的转账手续费。 */
    FeeQuote estimateFee(TransferIntent intent);
}
```

实现：
- `EvmChainAdapter`（web3j）—— 一个类，按 chainId 通过
  `application.yaml` 实例化多份。覆盖 ETH、BSC、Polygon、Arbitrum、
  Optimism、Base。
- `TronChainAdapter`（trident-java）—— TRC20。
- `SolanaChainAdapter` —— 直连 JSON-RPC。

适配器**自身不签名、不广播交易** —— 那是 `CustodyProvider` 的职责。
这样链相关包永远碰不到密钥材料。

### 配置示例

```yaml
obita:
  chains:
    ETH:
      family: EVM
      network: testnet
      rpc-url: ${OBITA_RPC_ETH}
      confirmations: 12
      gas-price-strategy: eip1559
    BSC:
      family: EVM
      network: testnet
      rpc-url: ${OBITA_RPC_BSC}
      confirmations: 15
    TRON:
      family: TRON
      network: testnet
      rpc-url: ${OBITA_RPC_TRON}
      confirmations: 19
```

## 2. CustodyProvider — 钱包创建、签名、广播

这是系统中**安全敏感度最高**的接口。MVP 用 Mock；生产对接托管厂商。

```java
public interface CustodyProvider {
    /** 为 (merchant, chain) 申请入金地址。 */
    WalletAddressIssued issue(MerchantId merchant, ChainId chain, AddressPurpose purpose);

    /** 提交一笔转账。供方签名 + 广播，返回 custody_ref。 */
    CustodyTxRef submit(TransferIntent intent);

    /** 查状态。生产环境托管 webhook 也会回调 /webhooks/custody。 */
    CustodyTxStatus status(CustodyTxRef ref);

    /** 列出该供方为商户管理的全部地址（用于对账）。 */
    Stream<WalletSnapshot> snapshot(MerchantId merchant);

    /** 供方能力（支持哪些链、MPC/冷钱包、日限额）。 */
    CustodyCapabilities capabilities();
}
```

### Mock 实现 `MockCustodyProvider`
- 从 `application.yaml`（仅 dev）的种子派生 HD 钱包地址；
  种子不出 JVM，测试 profile 每次启动重置。
- "提交"转账时入内存队列；定时任务在配置延迟（默认 5 秒）后转为
  `CONFIRMED`，模拟链上确认。
- 用于无须烧测试网代币的离线 UI 演示。

### 真实供方桩
- `CoboCustodyProvider`（推荐主选）
  - `Cobo Custody Web3 API` —— REST，HMAC-SHA256 签名，IP 白名单。
  - 已就位字段：`apiKey`、`apiSecret`、`host`、`walletId`。
  - TODO 标记 3 个 RPC：`createAddress`、`submitTransaction`、`getTransaction`。
- `SafeheronCustodyProvider`
  - MPC，原生支持 EVM 与 TRON。
  - Webhook 签名格式与 Cobo 不同，代码注释中已说明。
- `FireblocksCustodyProvider`
  - 国际备选，月费更高。

### 迁移路径：Mock → Cobo

1. 在 Cobo Custody 创建 **org** 与每商户的 sub-wallet。
2. 配置环境：`OBITA_CUSTODY_PROVIDER=cobo`，`OBITA_COBO_*` 系列 key。
3. 启动 `mvn -pl api spring-boot:run`。DB 中 mock 数据保留，
   `wallet_address.custody_ref` 字段需要通过一次性脚本回填为 Cobo 钱包 ID
   （`db/src/main/resources/migration-scripts/M0001_migrate_custody_refs.sql` 占位）。
4. 跑对账：`POST /admin/custody/reconcile` —— 拉取 Cobo 全量地址并校验
   DB 一致。
5. 通过 `merchant.metadata.custodyMode` 灰度切换商户。

## 3. FiatRampProvider — 法币上下匝道

```java
public interface FiatRampProvider {
    /** 报价：X CNY 能换多少稳定币？ */
    RampQuote quoteIn(FiatAmount fiat, AssetCode targetStable);

    /** 启动入金：返回托管页 URL 或银行汇款指令。 */
    RampSession startIn(PaymentIntentId intent, RampQuote quote);

    /** 报价：X 稳定币换多少 CNY？ */
    RampQuote quoteOut(StablecoinAmount stable, FiatCode targetFiat);

    /** 启动出金：返回供方 tx ref。 */
    RampSession startOut(WithdrawalId withdrawal, RampQuote quote);

    /** 查询状态。 */
    RampStatus status(RampSessionRef ref);
}
```

### Mock
- 提供假银行页 `/mock-bank/{sessionId}`，内含"模拟收到付款"按钮。
  点击向 `/webhooks/ramp/mock` 触发合成 webhook 完成流程。
- 出金延迟可配置后模拟到账。

### 真实供方桩
- **Circle Mint**（USDC ↔ USD）—— 最适合美元稳定币流。
- **Banxa / MoonPay / Transak** —— 卡支付买币，自带 KYC。
- **PingPong / Airwallex / 连连**（国内通道）—— 人民币流量。
- 接口刻意建模为 **session**，因为每个真实供方都是托管页或回调形式。

### 为何把 `RampQuote` 单独建模

报价有 TTL（一般 30 秒）。在用户确认前锁价能避免滑点套利。结算时
**仅按锁定的报价**记账，而不是执行时刻的实时价。

## 4. BridgeProvider — 跨链转账

MVP **不**实现真实桥。只定义接口 + 一个 Mock：在 ledger 中借源链贷
目标链以伪装跨链。后端团队 v1 阶段挑选真实桥（或聚合器）落地。

```java
public interface BridgeProvider {
    /** 资产跨链报价 + 预计耗时。 */
    BridgeQuote quote(BridgeRequest req);

    /** 发起跨链。返回桥 tx ref。 */
    BridgeTxRef initiate(BridgeRequest req, BridgeQuote acceptedQuote);

    /** 状态查询。多数桥都有 explorer 风格 API。 */
    BridgeStatus status(BridgeTxRef ref);

    Set<BridgePair> supportedRoutes();
}
```

### 候选供方

| 供方 | 风格 | 适配 |
|---|---|---|
| **Squid Router** | Axelar 之上的聚合器 | 集成最简、直接对接最少 |
| **LayerZero v2** | 原生消息 + token OFT | 自发币时优势大；其他场景较复杂 |
| **Wormhole** | 直接消息 + token bridge | 成熟、审计充分 |
| **deBridge** | 流动性桥 | 快路径好，依赖流动性 |
| **Stargate** | Pool 模式 | 路由有限 |

推荐 v1 用 **Squid Router**，因为它把"选哪个底层桥"这层决策抽象掉。
等量级足够时再直接对接底层。

### 为什么不自建桥
- 自建意味着自己跑 relayer + 验证人多签，托管被桥资产 ——
  **DeFi 历史上攻击面最大的一类**（累计被盗 > 20 亿美元）。
- 不在本团队 MVP 阶段的风险偏好范围内。

## 5. KYC / AML（接口已留，本期不做）

```java
public interface KycProvider {
    KycSession start(MerchantId merchant, KycLevel level);
    KycStatus status(KycSessionRef ref);
}
```

候选：**Sumsub**、**Persona**、**Onfido**。Mock 立即返回 `APPROVED`，
日志中显著标注，避免与真实审批混淆。

## 6. 出站 webhook

```java
public interface OutboundWebhook {
    void deliver(MerchantWebhookEndpoint endpoint, WebhookEvent event);
}
```

真实实现：以商户级密钥做 HMAC-SHA256 签名，附 `Webhook-Timestamp` 与
`Webhook-Id`，按指数退避重试（60 秒、5 分钟、30 分钟、4 小时、1 天）；
最终失败入 `dead_letter_event`。

## 7. Provider 配置矩阵

| 关注点 | MVP 默认 | 生产目标 |
|---|---|---|
| 托管 | `mock` | Cobo Custody（主）/ Safeheron（备） |
| 法币（CNY） | `mock` | PingPong / 连连 |
| 法币（USD/USDC） | `mock` | Circle Mint |
| 跨链桥 | `mock` | Squid Router |
| KYC | `mock` | Sumsub |
| 链 RPC | 公开 testnet | Alchemy / Infura / QuickNode（付费） |
| 邮件 | `mock`（仅日志） | SES / Resend |

## 8. 集成测试矩阵

每个 provider 端口都提供两个测试类：
- `XxxContractTest` —— 用 Mock 实现验证**接口契约**。每个 PR 都跑，
  作为行为契约的活文档。
- `XxxLiveTest` —— 标签 `@Tag("live")`，对真实供方 sandbox 调用。
  夜间 CI 用 vault 注入凭证执行。

如此契约即代码，真实实现的合规性持续在 staging 被验证。
