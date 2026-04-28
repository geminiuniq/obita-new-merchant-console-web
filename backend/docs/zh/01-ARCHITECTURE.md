# 01 — 架构

## 1. 架构风格

后端采用**分层 + 六边形（端口与适配器）架构**，与 Maven 多模块一一对应：

```
┌─────────────────────────────────────────────────────────────┐
│                      api  (Spring Boot)                     │
│  REST 控制器 · 安全 · 应用服务编排 · DTO                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ 依赖
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌────────────────────┐    ┌──────────────┐
│   domain      │    │  infrastructure    │    │     db       │
│ 聚合 + 端口    │◀──▶│  MyBatis 映射器、  │    │ Flyway SQL   │
│ （接口）       │    │  Redis、RocketMQ、 │    │  迁移脚本    │
└──────┬────────┘    │  链适配器、       │    └──────────────┘
       │             │  Mock 提供者       │
       ▼             └────────────────────┘
┌──────────────┐
│   common     │  ← Money、Result、ChainId、异常、ID 生成
└──────────────┘
```

### 为什么这样分层

- **`domain`** 不依赖 Spring / MyBatis / Redis。可以脱离框架做单元测试，
  后端团队替换适配器时不会触及业务规则。
- **`infrastructure`** 承载所有"边界"：DB、缓存、MQ、链上 RPC、托管、
  法币通道。每个边界都是 `domain` 中**端口（接口）**的实现。
- **`api`** 是唯一感知 HTTP / 安全 / Spring 装配的模块，作为**唯一入口**；
  CLI 或定时任务作为新增模块以同样方式装配。
- **`db`** 单独成模块，让 DBA 可以独立于应用镜像执行迁移
  （蓝绿部署、回滚等）。

### 依赖方向（强制）

```
api → infrastructure → domain → common
            ↓             ↑
            └──实现端口───┘
```

`domain` **不可**依赖 `infrastructure`。违反的话 Maven 编译失败 + ArchUnit
测试失败（在 `api/test` 中保障）。

## 2. 业务模块边界

`domain` 与 `infrastructure` 内部按**限界上下文**组织，而非按技术种类：

```
com.obita
├── identity        — 商户、用户、认证令牌
├── account         — 账户、复式记账分录
├── orders          — 商户订单 + 状态机 + 退款
├── cashier         — 支付意向、法币通道、结算
├── vault           — 钱包地址、入金、出金
├── chain           — ChainAdapter 抽象 + EVM/Tron/Solana 实现
├── custody         — CustodyProvider 端口 + Mock + Cobo/Safeheron 桩
├── ramp            — FiatRampProvider 端口 + Mock + Circle/Banxa 桩
├── bridge          — BridgeProvider 端口（LayerZero / Wormhole 桩）
├── audit           — 只追加审计日志 + AOP 切面
├── idempotency     — Idempotency-Key 处理
└── notification    — 出站 webhook + RocketMQ 生产者
```

一个上下文跨越三个层级，例如：
- `domain/orders/Order.java`（聚合根）
- `infrastructure/orders/OrderMapper.java`（MyBatis 映射）
- `api/orders/OrderController.java`（REST 控制器）

## 3. 横切关注点

| 关注点 | 实现 | 模块 |
|---|---|---|
| ID 生成 | UUID v7（时间序）通过 `IdGenerator` | `common` |
| 金额 | `Money(amount: BigDecimal, asset: AssetCode)` 值对象，**禁用** `double`/`float` | `common` |
| 错误模型 | `Result<T>` + `BusinessException` + 稳定的错误码注册表 | `common` |
| 幂等 | `@Idempotent` 注解 → AOP → `idempotency_key` 表 | `infrastructure/idempotency` |
| 审计 | `@Audited` 注解 → AOP → `audit_log`（只追加） | `infrastructure/audit` |
| 分布式锁 | Redisson `RLock` 包装 | `infrastructure` |
| 状态机 | Spring StateMachine；每个聚合一个配置（Order、Withdrawal、PaymentIntent） | 规则在 `domain`，持久化在 `infrastructure` |
| Outbox | `outbox_event` 表 → RocketMQ relay（事务性 outbox 模式） | `infrastructure/notification` |
| 链路追踪 | Micrometer + OpenTelemetry SDK；每条日志带 `traceId` | `api` |

## 4. 请求生命周期（典型示例：创建订单）

```
HTTP POST /v1/orders
  │
  ▼
[1] OrderController              — DTO 校验、JWT 主体提取
  │
  ▼
[2] @Idempotent 切面             — 读取 Idempotency-Key，命中即重放
  │
  ▼
[3] OrderApplicationService      — 编排，@Transactional
  │   ├─ 通过 MerchantRepository（端口）加载 Merchant
  │   ├─ 构建 Order 聚合（纯领域）
  │   ├─ 通过 OrderRepository（端口）持久化
  │   ├─ 追加 OrderEvent（状态转移日志）
  │   └─ 通过 OutboxPublisher 发布 OrderCreated 事件
  │
  ▼
[4] @Audited 切面                — 同事务追加 audit_log 行
  │
  ▼
[5] @Idempotent 切面（after）    — 把响应缓存到幂等键
  │
  ▼
HTTP 201 + 响应体
```

**Outbox 调度器**（独立线程）周期读取 `outbox_event` 表中 `PENDING` 行，
推送到 RocketMQ；**Webhook 派送器**订阅 RocketMQ 事件，通过 HMAC 签名
推送到商户配置的 URL。

## 5. 并发模型

- **DB 写入**涉及余额 / 订单状态变更：**`SELECT ... FOR UPDATE` + 版本字段**
  （读取乐观锁、变更时悲观锁）。
- **跨聚合工作流**：通过 RocketMQ 事件做 **Saga**，**禁止**分布式事务。
- **Java 21 虚拟线程**承载所有以 IO 等待为主的线程（链上 RPC、托管 webhook、
  扫块器）。配置：`spring.threads.virtual.enabled=true`。
- **幂等**对所有 `POST` / `PATCH` / `DELETE` 强制要求。客户端通过
  `Idempotency-Key` 头携带；服务端缓存 `(merchant_id, key) → response` 24 小时。

## 6. 部署拓扑（目标）

```
        ┌────────────┐         ┌──────────────┐
        │ 前端 SPA   │  HTTPS  │  API 网关    │ ── (mTLS / JWT)
        └─────┬──────┘────────▶│  + WAF       │
                                └──────┬───────┘
                                       │
                ┌─────────────────────┼─────────────────────┐
                ▼                     ▼                     ▼
        ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
        │   api Pod    │      │  scanner     │      │  outbox /    │
        │ （无状态）   │      │ （按链分组） │      │  webhook     │
        └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
               │                     │                     │
               └─────────────────────┼─────────────────────┘
                                     ▼
                ┌────────────────────┴───────────────────┐
                │     PostgreSQL（主 + 只读副本）        │
                │     Redis（哨兵）                       │
                │     RocketMQ 集群                       │
                └────────────────────────────────────────┘

                ┌────────────┐  ┌──────────────┐  ┌────────────┐
                │  托管供方  │  │  法币通道供方│  │  链 RPC    │
                └────────────┘  └──────────────┘  └────────────┘
```

三个部署单元共用同一个 Jar：

| 单元 | profile | 角色 |
|---|---|---|
| **api** | `--spring.profiles.active=api` | REST + RPC（Web 层） |
| **scanner** | `...=scanner` | 拉取区块、写入 deposit |
| **dispatcher** | `...=dispatcher` | 读 outbox、推 RocketMQ、派送 webhook |

拆开有利于让写入压力大的扫块器独立扩容。

## 7. MVP 暂未实现的内容（仅留骨架）

- 扫块器的高可用（单实例 + leader 选举待补）。
- 托管 / ramp / bridge 的真实实现（仅 Mock + 接口桩）。
- `ledger_entry` 分片 / 分区。MVP 量级足够；后端团队按 `created_at`
  做月分区即可（表已只追加，分区轻松）。
- 多区域多活。MVP 单区域主备已足够。
- 高级风控 / ML — Withdrawal 仅有 `RISK_REVIEW` 状态与 `risk_score` 字段，
  规则桩存在但未生效。
