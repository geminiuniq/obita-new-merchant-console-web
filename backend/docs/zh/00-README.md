# Obita 后端 — MVP 架构与交接文档（中文）

> **目的**：本目录沉淀 Obita Web2+Web3 商户操作台 MVP 的架构设计、技术
> 选型与集成契约。它是后续接手开发的后端团队**唯一真相源**。`backend/`
> 目录下的代码是这套文档的参考实现；**当代码与文档冲突时，以文档为准**
> —— 通过 PR 同步更新两者。
>
> 本中文版与英文版逐一对照，编号一致。两版同步维护，任何变更需要同时更新。

## 阅读顺序

| # | 文件 | 适合谁 | 用时 |
|---|---|---|---|
| 01 | [架构](01-ARCHITECTURE.md) | 全员 | 10 分钟 |
| 02 | [技术栈](02-TECH_STACK.md) | 技术负责人 | 8 分钟 |
| 03 | [领域模型](03-DOMAIN_MODEL.md) | 全体研发 | 15 分钟 |
| 04 | [外部集成](04-INTEGRATIONS.md) | 托管/Web3 研发 | 12 分钟 |
| 05 | [安全](05-SECURITY.md) | 全员 — 必读 | 8 分钟 |
| 06 | [API 约定](06-API.md) | 后端 + 前端 | 8 分钟 |
| 07 | [交接计划](07-HANDOFF.md) | 项目负责人、后端团队 | 6 分钟 |
| — | [**项目进度**](PROGRESS.md) | 全员 — 当前状态、已验证内容、下一步 | 8 分钟 |
| — | [ADR-0001](../adr/0001-backend-stack-java-spring-boot.md) | 技术负责人 — 选型依据 | 7 分钟 |

## 项目目标

Obita 是一个连接 **Web2 商业**（订单、法币结算、银行/卡支付）与
**Web3 链上能力**（多链稳定币托管、链上结算、跨链转账）的**商户操作台**。
MVP 必须打通三个端到端流程：

1. **订单（Orders）** —— 商户创建商业订单，可见从创建到结算/退款的完整生命周期。
2. **收银（Cashier）** —— 通过可插拔的法币上下匝道（ramp provider）完成法币入金 / 出金 + 稳定币兑换。
3. **保险柜（Vault）** —— 多链钱包地址、入金扫块、出金 + 风控审核。

## 明确不做的事

- **不**自建跨链桥 —— 通过 `BridgeProvider` 接口适配 LayerZero / Wormhole / deBridge / Squid。
- **不**自建托管 —— 通过 `CustodyProvider` 接口隔离，MVP 阶段交付 Mock 实现，目标对接 **Cobo Custody** 或 **Safeheron MPC**。
- **不**自建 PSP 通道 —— 通过 `FiatRampProvider` 接口对接（Circle Mint / Banxa / 国内通道）。
- **不**实现 MFA、复杂 RBAC、运营管理后台 —— 仅留骨架，后续团队补齐。

## 快速开始（MVP 本地开发）

```bash
cd backend
cp .env.example .env
docker compose up -d              # 启动 Postgres / Redis / RocketMQ / Adminer
./mvnw -pl api spring-boot:run    # 在 :8080 启动 API
```

- Adminer：http://localhost:18081
- RocketMQ Dashboard：http://localhost:18080
- Swagger UI：http://localhost:8080/swagger-ui.html

## 仓库布局

```
backend/
├── pom.xml                     # Maven 父 POM
├── docker-compose.yml          # 本地基础设施
├── .env.example                # 全部运行时配置
├── infra/                      # 基础设施配置（rocketmq broker.conf 等）
├── docs/                       # 英文文档（默认源）
│   └── zh/                     # ← 你正在看的中文版
├── common/                     # 通用基础（Money、Result、ID 生成器）
├── domain/                     # 纯领域层（聚合 + 端口接口） — 不依赖框架
├── db/                         # Flyway 迁移脚本（V1..Vn）
├── infrastructure/             # MyBatis 映射器、Redis、RocketMQ、链适配器
└── api/                        # Spring Boot 应用 — 控制器、安全、装配
```

5 个 Maven 模块按照六边形（端口与适配器）架构组织，详见
[01-ARCHITECTURE.md](01-ARCHITECTURE.md)。
