# Obita

> English: [README.md](README.md)

Web2 + Web3 商户操作台 — 多链稳定币托管、法币上下匝道、复式记账分录。
MVP 阶段代码，目标交付给 Java 后端团队接手。

## 仓库布局

```
obita-web/
├── backend/              Spring Boot 3.3 + Java 21 MVP — 完整源码 +
│                         docker-compose + 16 篇中英文档 + ADR
├── frontend/             极简 demo SPA（vanilla HTML/JS/CSS），与后端联通，
│                         在真实浏览器里验证 4 个核心流程。它不替代什么 ——
│                         参见 frontend-legacy。
├── frontend-legacy/      原 25K 行 SPA，保留作为视觉 / 设计语言基准
│                         （design.md 仍然权威）
└── 文档                  全部文档在 backend/docs/ 下；
                          从 backend/docs/00-README.md 入门。
```

## 当前状态

- **后端**：本地端到端验证通过 —— 订单模块 + 保险柜模块完整接通；
  收银仅留骨架。一笔入金 → 结算 → 退款产生 8 条借贷平衡的分录。详见
  [`backend/docs/zh/PROGRESS.md`](backend/docs/zh/PROGRESS.md)。
- **前端**：编辑风格 SPA，sidebar+main 布局，中英双语 + 浅/深主题，
  四个已实现模块全量接通；其余（Cashier / 出款 / 兑换 / 审批 / 报表 /
  成员）保留 Coming Soon 占位。浏览器端到端验证通过。
- **文档**：8 + 8 + 1 ADR，中英 1:1 对照。索引看
  [`backend/docs/zh/00-README.md`](backend/docs/zh/00-README.md)，
  最新进度看
  [`backend/docs/zh/PROGRESS.md`](backend/docs/zh/PROGRESS.md)。

## 本地启动全栈

依赖：**Docker**、**Java 21**、**Maven 3.9+**、**Python 3**（仅前端
静态服务用，任何 HTTP 服务器都行）。

```bash
# 0. 进入仓库
cd obita-web

# 1. 后端基础设施（PG 16 + Redis 7 + RocketMQ 5 + Adminer）
cd backend
cp .env.example .env
docker compose up -d
# 等 ~5s 让 Postgres healthcheck 就绪

# 2. 编译 + 启动后端（冷启动 ~4s）
mvn -DskipTests clean package
java -jar api/target/obita-api-0.1.0-SNAPSHOT.jar &
# 健康：http://localhost:8080/actuator/health → {"status":"UP"}

# 3. 一次性把 demo 用户密码哈希设对（直到 V5 种子重新生成）
docker exec obita-postgres psql -U obita -d obita -c \
  "UPDATE app_user SET password_hash='\$argon2id\$v=19\$m=65536,t=3,p=2\$0j4zU4yYQ5YBeOm7b9XrtA\$HvLXls2EjmhJROzOthfEcMv0R1By26vtUEb2/KGjExI' WHERE username='demo';"

# 4. 前端静态服务
cd ../frontend
python3 -m http.server 5173
```

打开 **http://localhost:5173** 登录：

| 字段 | 值 |
|---|---|
| 商户代码 | `DEMO` |
| 用户名 | `demo` |
| 密码 | `ObitaDemo!2026` |

（三个字段都已预填。）

## 登录后能做什么

侧边栏分四组；只有已经接通后端的四条路由是可点击的，其余为有意保留的
**Coming Soon** 占位（对应未完成的模块）。

1. **Overview** (`#overview`) — 跨已实现模块的 KPI strip：稳定币
   AVAILABLE 合计、链上等待确认的入金、进行中订单、近期已结算笔数。
   下方为各资产余额卡片 + 最近订单。来源 `GET /v1/accounts` +
   `GET /v1/orders`。

2. **Stablecoin Vault** (`#vault`) — 主打 demo：
   - 一键申请 POLYGON 入金地址。
   - 通过 `/mock-bank/credit` 注入合成链上入金。
   - 等 ~10s — `DepositScanner` 检测到，入分录
     `LIABILITY → PENDING`（第 1、2 条）。
   - 再等 ~30s — 确认数到 12，deposit 转 `CREDITED`，入分录
     `PENDING → AVAILABLE`（第 3、4 条）。前端在注入后自动轮询 ~60s，
     余额与分录会自动刷新。

3. **Invoice Orders** (`#orders`) — `GET / POST /v1/orders` + 生命周期：
   - **+ 新建订单** → 填表 → 提交。`CREATED → PENDING_PAYMENT`。
   - **标记已付** → `PAID`。
   - **结算** → `SETTLED` + 入 `AVAILABLE → SETTLEMENT` 分录对。
   - **退款** → 输入金额 → 反向入分录。
   - 点击订单行 → 弹窗显示 `GET /v1/orders/{id}/events` 时间线。

4. **Ledger** (`#ledger`) — 各账户当前 `balance_after` 快照。完整 per-tx
   流水可直查 PG：

   ```bash
   docker exec obita-postgres psql -U obita -d obita -c \
     "SELECT a.account_type, le.direction, le.amount, le.balance_after,
             lt.tx_type, lt.memo
        FROM ledger_entry le
        JOIN ledger_tx lt ON lt.id = le.tx_id
        JOIN account a    ON a.id = le.account_id
       ORDER BY le.id;"
   ```

走完一遍 500 USDC 入金 + 100 USDC 订单结算 + 30 USDC 退款后的预期结果
（8 条借贷平衡的分录）：

```
 owner    | account_type | dir |  amount  | bal_after | tx_type      | memo
----------+--------------+-----+----------+-----------+--------------+----------------
 PLATFORM | SETTLEMENT   | D   | 500.00   |  -500.00  | DEPOSIT      | deposit pending
 merchant | PENDING      | C   | 500.00   |   500.00  | DEPOSIT      | deposit pending
 merchant | PENDING      | D   | 500.00   |     0.00  | DEPOSIT      | deposit confirmed
 merchant | AVAILABLE    | C   | 500.00   |   500.00  | DEPOSIT      | deposit confirmed
 merchant | AVAILABLE    | D   | 100.00   |   400.00  | ORDER_SETTLE | settle ORD-001
 merchant | SETTLEMENT   | C   | 100.00   |   100.00  | ORDER_SETTLE | settle ORD-001
 merchant | SETTLEMENT   | D   |  30.00   |    70.00  | REFUND       | refund ORD-001
 merchant | AVAILABLE    | C   |  30.00   |   430.00  | REFUND       | refund ORD-001
```

每个 `tx_id` 内借贷总额相等（DB 约束触发器在 commit 前把关）。
`PLATFORM SETTLEMENT` 的负余额正确表示平台持有的链上资产 —— 设计依据
见 [`backend/docs/zh/03-DOMAIN_MODEL.md`](backend/docs/zh/03-DOMAIN_MODEL.md)
§ 4。

## 常用 URL

| URL | 用途 |
|---|---|
| http://localhost:5173 | 前端 demo |
| http://localhost:8080/swagger-ui.html | 自动生成的 OpenAPI 交互页 |
| http://localhost:8080/v3/api-docs | OpenAPI JSON |
| http://localhost:8080/actuator/health | 后端健康 |
| http://localhost:8080/actuator/prometheus | 指标 |
| http://localhost:18080 | RocketMQ Dashboard |
| http://localhost:18081 | Adminer（数据库浏览，server `postgres`、user `obita`、pwd `obita_dev_pwd`、db `obita`） |

## 端口 / 凭证（仅本地开发）

| 服务 | 端口 | 凭证 |
|---|---|---|
| Postgres | 5432 | obita / obita_dev_pwd / db `obita` |
| Redis | 6379 | 密码 `obita_dev_pwd` |
| RocketMQ namesrv | 9876 | — |
| RocketMQ broker | 10911 | — |
| RocketMQ proxy | 8081 | — |
| RocketMQ Dashboard | 18080 | — |
| Adminer | 18081 | 已预连 PG |
| 后端 API | 8080 | JWT 走 `/v1/auth/login` |
| 前端 | 5173 | 静态 — 任何 HTTP 服务器都行 |

所有端口仅绑 `127.0.0.1`。生产 secret 走 secret manager —— 详见
[`backend/docs/zh/05-SECURITY.md`](backend/docs/zh/05-SECURITY.md)。

## 常用运维命令

```bash
# 重置 schema（重跑 Flyway V1..V5 + 重新种 DEMO + PLATFORM）
docker exec obita-postgres psql -U obita -d obita -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO obita;"
# … 然后重启后端让 Flyway 重新应用 + 重设 demo 密码（步骤 3）

# 全部停掉
pkill -f "obita-api-0.1.0"
cd backend && docker compose down

# 销毁数据卷（破坏性）
docker compose down -v

# 跟踪后端日志
tail -f /tmp/obita-app.log

# 跟踪 PG 查询日志
docker logs -f obita-postgres
```

## 接下来应该读什么

| 你是… | 从这里开始 |
|---|---|
| 新接手的后端研发 | [`backend/docs/zh/00-README.md`](backend/docs/zh/00-README.md) → 架构 → 领域模型 |
| 技术负责人 | [`backend/docs/zh/02-TECH_STACK.md`](backend/docs/zh/02-TECH_STACK.md) 与 [`backend/docs/adr/0001-...`](backend/docs/adr/0001-backend-stack-java-spring-boot.md) |
| 托管 / Web3 研发 | [`backend/docs/zh/04-INTEGRATIONS.md`](backend/docs/zh/04-INTEGRATIONS.md) |
| 接手项目的负责人 | [`backend/docs/zh/PROGRESS.md`](backend/docs/zh/PROGRESS.md)（当前状态、已验证内容、下一步）与 [`backend/docs/zh/07-HANDOFF.md`](backend/docs/zh/07-HANDOFF.md) |
| 设计 / 前端负责人 | [`frontend-legacy/design.md`](frontend-legacy/design.md)（仍然权威） |
