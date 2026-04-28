# 07 — 交接计划

本文档面向接手 MVP 并将其推向生产的后端团队。

## 1. 你接手的内容

| 产物 | 交接时状态 |
|---|---|
| `backend/pom.xml` + 5 个模块 | ✅ 可编译，能产出可执行 jar |
| `docker-compose.yml` | ✅ 一行命令本地起栈 |
| `db/.../V1..V3__*.sql` | ✅ identity / ledger / orders / vault 的 schema |
| `db/.../V4__cashier.sql` | 🚧 桩 —— 详见 [03-DOMAIN_MODEL.md §7](03-DOMAIN_MODEL.md) |
| `domain/` 端口与聚合 | 🚧 骨架；关键接口已草拟 |
| `infrastructure/*/mock/*Provider` | 🚧 托管 / ramp / bridge 的 Mock |
| `infrastructure/*/<vendor>/*Provider` | 🚧 类壳 + TODO |
| `api/` 控制器 | 🚧 仅有大纲，详见端点矩阵 |
| Spring Security + JWT | 🚧 登录链路画好，MFA 留骨架 |
| `docs/` 00–07 + `docs/zh/` | ✅ 本文档集 |
| OpenAPI spec | 🚧 接通 API 后自动生成 |
| 测试套件 | 🚧 分录不变量测试 + Mock provider 契约测试 |

✅ = 可直接使用；🚧 = 已搭骨架，需补实现。

## 2. 第一周上手节奏

**Day 1**
- 按 [00–07] 顺序通读。
- `git clone`、`cp .env.example .env`、`docker compose up -d`、`mvn verify`。
- 冒烟：用种子数据 `merchant.code='DEMO'` / 用户 `demo/demo` 调
  `POST /v1/auth/login`。

**Day 2**
- 逐行读 [V1__baseline.sql]，对照 [03-DOMAIN_MODEL.md §4 账户与复式记账]。
  跑触发器测试 `LedgerInvariantTest`。
- 端到端跟踪一次创建订单：`POST /v1/orders` →
  `OrderApplicationService.createOrder` → `OrderRepository.save` →
  `outbox_event` → `RocketMQ` → 出站 webhook。

**Day 3**
- 选一个 provider，对照 `MockCustodyProvider` 与 `CoboCustodyProvider`
  空壳，与 Cobo Custody API 文档并排阅读。
- 跑 `mvn test -Dgroups=contract -Dtest='*CustodyContractTest'`。

**Day 4**
- 在 `CoboCustodyProvider` 中实现一个 TODO 方法，补一条契约测试。
  本地 `.env` 切换 profile，重跑冒烟。

**Day 5**
- 配对完成**第一条真实链集成**（推荐 BSC testnet —— 便宜、快、USDT/BEP-20
  广泛）。扫块器跑一个有充值的 testnet 地址。

## 3. 待办（优先级排序）

### P0 —— 任何生产流量之前必须就绪

1. **真实托管对接**（`CoboCustodyProvider`）。
2. **真实 EVM 扫块器** + 重组处理（当前粗糙，需要 `ChainCursor` 在重组时回退）。
3. **出金风控规则**（不止"超限"）。
4. **OFAC / 链上分析**对入金 / 出金地址筛查。
5. **审计日志投递 WORM 存储**（S3 + Object Lock）。光靠 DB 行不合规。
6. **`MERCHANT_ADMIN` 强制 MFA**（TOTP 已搭骨架）。
7. **限流策略 review + 生产调优**。
8. **出站 webhook 签名密钥轮换流程**。
9. **告警接线** —— 指标定义已存在，Prometheus 规则尚未提交。
10. **DR 灾备 runbook**（RPO / RTO 目标 + 备份测试）。

### P1 —— 公开 beta 之前应当就绪

1. 真实法币通道（USDC 用 Circle Mint，CNY 用 PingPong）。
2. KYC 接入（推荐 Sumsub）。
3. 跨链桥经 Squid Router 接入。
4. 结算报表 + 对账作业（与托管对账）。
5. 部分退款的 UI（后端 V2 已就绪）。
6. 启用 PG 行级安全策略。
7. 第三方安全公司渗透测试。

### P2 —— 锦上添花

1. 高级商户的 WebAuthn。
2. 多区域主备。
3. `ledger_entry` 月分区。
4. 商户分级 SLA 告警。
5. 基于 OpenAPI 自动生成 SDK（TypeScript + Java）。

## 4. 安全切换 provider 的标准流程

以托管为例（ramp / bridge 同理）：

1. **实现** 真实适配器，跑 `CustodyContractTest`，全部断言通过。
2. **预发布环境**接入供方 sandbox。
3. **对账**：`POST /v1/admin/custody/reconcile`，DB 与供方快照一致。
4. **影子模式**（P0 待补）—— 24 小时新旧 provider 同时收命令，仅旧 provider
   生效，记录差异。
5. **切换**：翻转 `obita.custody.provider` 配置，部署。
6. **回退方案**：旧 provider 配置保留 7 天。

## 5. 后端团队继承的风险

| 风险 | 严重度 | 当前 / 后续缓解 |
|---|---|---|
| Mock provider 误上生产 | 高 | `application-prod.yaml` 用 `@Validated` 拒绝 `mock`；CI 部署门禁双保险 |
| 分录触发器在大数据量下的开销 | 中 | 分区 `ledger_entry`；触发器 O(行数 / tx) 仍可控 |
| 链上重组超过 `confirmations` | 高 | 各链调优 confirmations；现在就设计反向入账（接口已留，实现 TBD） |
| 供方 API 变更 | 中 | 契约测试夜间跑捕获回归 |
| RocketMQ 消息丢失 | 高 | Outbox 模式 + 手工 ack + `dead_letter_event` |
| JWT / webhook 签名时钟漂移 | 低 | 全局 NTP；±5 分钟容忍已写入文档 |
| Postgres 长事务阻塞分录 | 高 | `statement_timeout=5s`；长任务用游标 + 小批次 |

## 6. 本地→生产迁移检查表

后端团队准备好 staging 时：

- [ ] 通过 secret manager 替换所有 `obita_dev_pwd`。
- [ ] `OBITA_AUTH_JWT_SECRET` 替换为 `openssl rand -base64 64` 生成的随机串。
- [ ] 替换 `OBITA_AUTH_PASSWORD_PEPPER`（用户需重设密码 —— 交接时用户少，成本低）。
- [ ] 配置 `application-prod.yaml`：
      - `spring.datasource.url` 指向托管 Postgres；
      - `spring.data.redis.*` 指向托管 Redis；
      - `rocketmq.name-server` 指向托管 RocketMQ；
      - `obita.*.provider` 改为非 mock；
      - `management.endpoints.web.exposure.include=health,info,prometheus`。
- [ ] CI 部署门禁：任何 `mock` provider 启用即拒绝部署。
- [ ] 托管 Postgres 参数组开启 `pgaudit`。
- [ ] 对 staging DB 跑 `mvn -pl api flyway:migrate`。
- [ ] 灌入参考数据（`chain`、`asset`、`merchant.code='PLATFORM'`）。
- [ ] 跑全链路 E2E 冒烟。

## 7. 留给后端团队的待定决策

按真实负载与成本数据决策，不在 MVP 阶段拍板：

- **`ledger_entry` 分片策略**（建议月分区）。
- **历史订单 / 出金的冷存储**（S3 + JSON dump vs PG 归档表）。
- **GDPR / 个人信息保护法擦除**：`merchant.code` 保留 vs PII 字段；
  `audit_log.payload` 中可能夹带 PII，需要专门的脱敏作业。
- **多区域**：成本 vs RPO。默认计划是单区域主 + 跨区只读副本作 DR。
- **实时风控信号**：规则引擎 vs ML。
- **稳定币持有的风险加权**（财务策略）—— 分录已支持，UI 未做。

## 8. 决策记录

后端团队的不同决策请记录为 ADR（架构决策记录），存于
`docs/adr/NNNN-标题.md`。建议格式：

```
# ADR-0001 —— RocketMQ 切换 Kafka

日期：2026-MM-DD
状态：accepted

## 背景
...
## 决定
...
## 影响
...
```

文档需要持续更新。任何"运维真相"导致原文档过期，**在同一个 PR 中改代码和改文档**。
过期文档比没文档更糟。
