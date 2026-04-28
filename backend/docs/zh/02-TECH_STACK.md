# 02 — 技术栈

## 1. 决策汇总

| 层 | 选型 | 版本 | 一句话理由 |
|---|---|---|---|
| JDK | **Java 21（LTS）** | 21 | 虚拟线程让链上/托管 RPC 的 IO 等待几乎免费 |
| 框架 | **Spring Boot** | 3.3.x | 国内金融团队事实标准，团队熟 |
| 持久层 | **MyBatis-Plus** | 3.5.x | SQL 显式可审计；规避 JPA 在金额流上的隐式 N+1 |
| DB | **PostgreSQL** | 16 | `numeric(38,18)` + JSONB + 行级锁 + 逻辑复制 |
| 迁移 | **Flyway** | 10.x | 版本化、确定性、DBA 友好 |
| 缓存 / 锁 | **Redis 7 + Redisson** | 3.36.x | 分布式锁、幂等键、refresh token |
| MQ | **RocketMQ** | 5.3.x | 事务消息、顺序消费、Dashboard、金融成熟 |
| Web3（EVM） | **web3j** | 4.12.x | Java 端最成熟的 EVM 客户端，覆盖 ETH/BSC/Polygon/Arb/Base/OP |
| Web3（Tron） | **trident-java** | 最新 | TRC20 USDT 是亚太最大稳定币流量 |
| Web3（Solana） | 直连 JSON-RPC | — | sol4j 已停止维护，薄封装即可 |
| 认证 | **Spring Security 6 + JJWT 0.12** | — | 无状态 JWT（access）+ Redis refresh；密码用 Argon2id |
| 校验 | **Jakarta Validation + Hibernate Validator** | — | 控制器边界声明式校验 DTO |
| 状态机 | **Spring StateMachine** | 4.0 | 显式转移 + 持久化 + 审计钩子 |
| API 文档 | **SpringDoc OpenAPI + Knife4j** | 2.6 | 交付时直接生成 OpenAPI 规范 |
| 金额 | 一律 `BigDecimal`，**禁用** `double`/`float` | JDK | DB 存 `numeric(38,18)`；舍入策略可插拔 |
| 可观测 | Micrometer + Prometheus + OTel + Loki | — | 金融场景必须有链路追踪 |
| 测试 | JUnit 5 + Mockito + Testcontainers | — | 集成测试跑真实 PG / Redis / RocketMQ |
| 构建 | **Maven**（多模块） | 3.9 | Spring/Java 团队标准；CI 可重现 |

## 2. 选型与替代方案对比

### 2.1 Spring Boot vs Quarkus / Micronaut
- 交接前提：后端团队是 Java/Spring。Quarkus 的 Native build 启动好，
  但团队需要重学 DI / 配置 / 测试模式。开发速度上的损失大于运行时的收益。

### 2.2 MyBatis-Plus vs JPA / Hibernate
- 金融系统经常碰复杂 SQL：`SELECT ... FOR UPDATE`、多行分录插入、
  带版本号的条件更新、分区表。JPA 的懒加载 + 脏检查在该领域曾多次造成
  生产事故。**MyBatis-Plus** 让 SQL 始终可见可审。
- 简单 CRUD 仍能用 MP 的 `BaseMapper<T>` 与条件查询 DSL。

### 2.3 PostgreSQL vs MySQL
- `numeric(38,18)` 精度（MySQL 上限 65 位但运算更慢）、JSONB 索引、
  物化视图、`pgaudit`、`pg_partman` 分区、`LISTEN/NOTIFY` 都是 PG 优势。
- 跨区复制（逻辑复制）比 MySQL binlog 灵活。

### 2.4 RocketMQ vs Kafka vs RabbitMQ
- **Kafka** 吞吐量最高，但缺少 RocketMQ 那种"消息发送 + DB 写入原子化"的事务消息。
- **RabbitMQ** MVP 量够用，但缺乏 RocketMQ 的顺序消费语义；金融常见
  "同一订单事件按提交序消费"的需求需要 RocketMQ。
- 选择 **RocketMQ**：事务消息（half-message 协议）+ 按 `merchant_id`
  路由 MessageQueueSelector 做顺序消费 + Apache 项目，国内金融多用。

### 2.5 web3j vs ethers（带 service 中转）
- 我们是 Java 团队。多接一个 Node.js 旁车意味着多一个进程、多一套部署、
  多一份 secret。web3j 满足转账、合约调用、日志订阅需求。

### 2.6 Java 21 虚拟线程
- 扫块器 / 托管客户端 95% 时间在网络 IO 等待。没有虚拟线程要么烧 OS 线程，
  要么全栈反应式。开启 `spring.threads.virtual.enabled=true` 后请求处理器
  和 `@Scheduled` 任务都能免费拿到大并发。

## 3. 版本固定

详见 `backend/pom.xml` 的 `<properties>`。升级版本需要 PR + 测试 + 本地
全栈冒烟通过。**生产环境严禁 `LATEST`**。

## 4. 本地服务

| 服务 | 端口 | 凭证 |
|---|---|---|
| Postgres 16 | 5432 | obita / obita_dev_pwd |
| Redis 7 | 6379 | obita_dev_pwd |
| RocketMQ namesrv | 9876 | — |
| RocketMQ broker | 10911 | — |
| RocketMQ proxy | 8081 | — |
| RocketMQ Dashboard | 18080 | — |
| Adminer | 18081 | 已预连 PG |

所有端口仅绑定 `127.0.0.1`。`.env.example` 是应用的全部配置面；
生产环境通过 secret manager（Vault / AWS Secrets Manager / 阿里云 KMS）替换。

## 5. 依赖卫生规则

1. 资金路径上的每个传递依赖必须经过 review。`dependencyManagement` 全部固定。
2. `main` 分支禁用 SNAPSHOT。
3. CI 跑 `mvn dependency:analyze`；声明却未使用的依赖直接 fail。
4. **黑名单**：`commons-collections:3.x`、`log4j:1.x` 等死库 / 不安全库。
   通过 `maven-enforcer-plugin` 的 `<bannedDependencies>` 强制。
5. CVE 由 `dependency-check-maven` 每周扫描，CRITICAL = block。

## 6. 构建 / 测试矩阵

| 目标 | 命令 |
|---|---|
| 编译 | `./mvnw -T 1C verify -DskipTests` |
| 单元测试 | `./mvnw -pl common,domain test` |
| 集成测试 | `./mvnw -pl api verify`（Testcontainers 启动 PG/Redis/RocketMQ） |
| 启动 API | `./mvnw -pl api spring-boot:run` |
| 导出 OpenAPI | `./mvnw -pl api spring-boot:run -Dspring-boot.run.profiles=openapi-export` |
| 格式校验 | `./mvnw spotless:check` |
| 格式应用 | `./mvnw spotless:apply` |

CI 在每个 PR 跑全套；main 受保护。

## 7. 后端团队可能要重做的取舍

- **MyBatis-Plus → 纯 MyBatis + sqlc 风格代码生成**：若团队偏好更严类型。
- **Spring StateMachine → 手写枚举状态机**：若 StateMachine 持久化负担过重。
- **扫块器 Go 化**：若 EVM 吞吐成瓶颈。`ChainAdapter` 边界足够干净，
  能容纳非 Java 实现。
- **特性开关服务**（Unleash / GrowthBook）：MVP 仅靠 `application.yaml`
  开关。
