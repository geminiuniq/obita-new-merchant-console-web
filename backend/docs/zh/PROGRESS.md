# 项目进度

> English: [docs/PROGRESS.md](../PROGRESS.md)
>
> 更新时间：2026-04-29 (第 3 轮 — 编辑风格商户操作台)  ·  状态：**编辑风格 SPA，中英双语 + 浅/深主题 + 5 个 mock 页面，模块化 ES Module 架构，已实现的后端端点全部接通**

## 第 3 轮 — 编辑风格商户操作台 (Sprint 1-5)

第 2 轮把极简 demo SPA 与后端联通后，第 3 轮把它升级成一个真正的
商户操作台 —— 整个产品读起来是一个编辑风格的整体，而不是手撸 demo。
工作分为 5 个 sprint，每个 sprint 结束都提交代码，进度链可追溯。

### Sprint 概览

| Sprint | 提交 | 交付内容 |
|---|---|---|
| **1** | `3141dc0` | 编辑风格 UI 重建 · sidebar+main 布局 · 中英双语 (EN/CN) · 浅/深主题 · 订单详情弹窗（事件时间线） |
| **2** | `8edd80f` | 重构 1.2k 行的 `app.js` → 拆分为 `js/` 下的模块 (dom, format, i18n, theme, ui, router, pages/*) |
| **3** | `3aff3a7` | 收件箱抽屉（4 条 mock 消息，黄铜未读标记）+ 个人资料下拉菜单（My profile / Security / API docs / Sign out） |
| **4** | `cdac3ac` | 5 个完整编辑风格的 mock 页面 — Members、Approvals、Conversion、Report Center、Payouts |
| **5** | `5b75db5` | 钱包流水抽屉 — 来自 `/v1/accounts` 的 LIVE 行 + 按地址确定性 mock 活动 |

### 前端模块架构（重构后）

`app.js` 原本 1.2k 行，把 strings + DOM helpers + i18n + theme + router
+ 每个页面渲染都塞在一个文件里。重构按职责拆分，每个特性可以独立交付：

```
frontend/
├── index.html            sidebar+main 外壳、登录、modal、drawer
├── styles.css            编辑风格 token 系统 + 深色主题 override
├── api.js                JWT + 幂等键 fetch 封装
├── app.js                ~120 行：bootstrap + 登录 + 切换按钮接线
└── js/
    ├── dom.js            el(), clear(), $/$$ 工具
    ├── format.js         fmt 工具集
    ├── strings.js        en + zh 字典（1:1 对照）
    ├── i18n.js           t(), setLang(), applyStaticI18n()
    ├── theme.js          浅/深主题切换 + 持久化
    ├── ui.js             pageHero / sectionCard / statusPill / toast
    ├── router.js         hash 路由 + 页面注册 + pollCurrentRoute
    ├── drawer.js         通用右侧抽屉 + overlay
    ├── header.js         个人资料下拉菜单
    ├── inbox.js          mock 收件箱消息
    └── pages/
        ├── overview.js         真实接通 (KPI + 余额 + 最近订单)
        ├── vault.js            真实接通 (余额 + 地址簿 + mock-bank)
        ├── orders.js           真实接通 (完整生命周期 CRUD)
        ├── order-detail.js     真实接通 (事件时间线)
        ├── ledger.js           真实接通 (快照)
        ├── wallet-history.js   mock + 真实混合
        ├── members.js          mock (5 个成员，角色 + MFA)
        ├── approvals.js        mock (按 legacy §3.5 的严重度条)
        ├── conversion.js       mock (实时 mock 报价框)
        ├── reports.js          mock + Swagger UI 直达
        ├── payouts.js          mock (4-eyes 状态)
        └── coming-soon.js      Fiat Vault 占位
```

每个页面模块导出 `render*(root)` 函数，在 `app.js` 用
`registerRoute(name, fn)` 注册。原生 ES Module —— 无构建步骤，任何静态
HTTP 服务器都能跑。

### 路由 × 后端接通矩阵

| 路由 | 状态 | 已用后端端点 |
|---|---|---|
| `#overview`   | 真实 | `GET /v1/accounts`、`GET /v1/orders` |
| `#vault`      | 真实 | `GET /v1/accounts`、`GET/POST /v1/wallet-addresses`、`POST /mock-bank/credit` (注入后自动轮询 ~60s) |
| `#orders`     | 真实 | `GET / POST /v1/orders` + lifecycle (`/mark-paid`, `/settle`, `/cancel`, `/refunds`)；点击行 → `GET /v1/orders/{id}` + `GET /v1/orders/{id}/events` |
| `#ledger`     | 真实 | `GET /v1/accounts`（快照） |
| `#payouts`    | mock | — （后端 schema 已就位：`withdrawal` 表带 4-eyes / 允许名单 / 冷却） |
| `#conversion` | mock | — (`BridgeProvider` 端口已定义；真实适配器 P0→P1) |
| `#approvals`  | mock | — （`audit_log` + `outbox_event` 表已就位） |
| `#reports`    | mock | hero 直达 `GET /v3/api-docs` 与 `/swagger-ui.html`（在线） |
| `#members`    | mock | — （角色表 `app_user` / `member_role` / `role_permission` 已存在；控制器 P1） |
| `#fiat-vault` | 占位 | — (Cashier P1) |

### 横切特性

- **中英双语** — 由 `localStorage` 持久化，默认英语。所有用户可见字符串
  通过 `t(key)` 查表；字典在 `js/strings.js`，en + zh 1:1 对照。
- **浅/深主题** — `<body>` 上的 `data-theme="…"` token override，首次
  加载尊重 `prefers-color-scheme`。深色保留编辑风格的黄铜 + brand-ink
  调色板。
- **抽屉** — 通用右侧抽屉 + 共享 overlay (`js/drawer.js`)，目前由 Inbox
  与 Wallet History 共用。
- **幂等性** — 每个会改变状态的请求都自动生成 `Idempotency-Key`。
- **XSS 安全** — 全部经由 `createElement` + `textContent`，从不在用户
  可控数据上用 `innerHTML`。

### 浏览器实跑验证流程

每个 sprint 在提交前都已浏览器实跑：

```
✓  登录 → sidebar 外壳 + topbar 商户卡片 + 头像
✓  Overview KPI 由 /v1/accounts + /v1/orders 实时算出
✓  Vault → 申请地址 → mock-bank credit → 60s 自动轮询 →
   PENDING 余额出现 → 之后跳到 AVAILABLE
✓  Orders → 新建 → 标记已付 → 结算 → 退款（完整生命周期，
   后端入分录）
✓  点击订单行 → 详情弹窗渲染 3 段状态机时间线（来自 /events）
✓  点击地址卡片 → 钱包流水抽屉渲染 LIVE 行（来自 /v1/accounts）+
   3 条确定性 mock 行
✓  收件箱铃 → 抽屉滑入，4 条 mock 消息，黄铜未读标记，点击已读
✓  个人资料下拉 → API docs 在新标签页打开 Swagger UI
✓  主题切换（浅 ↔ 深）保留全部编辑风格强调色
✓  语言切换（EN ↔ 中）通过 router 的 onLangChanged 钩子
   重新渲染当前页
```

---

## 第 2 轮 — Plan B（前后端联通）

## 第 2 轮 — Plan B（前后端联通）

第 1 轮独立验证后端正确，本轮在此基础上接通了一个极简 demo SPA，
在真实浏览器里跑通 4 个核心流程。原 25K 行前端保留为
`frontend-legacy/`（设计语言基准，详见 `frontend-legacy/design.md`）；
新建的 `frontend/` 刻意保持极简，焦点放在后端正确性上。

### 本轮改动

**后端 — 修掉三个硬障碍：**

| # | 修复 | 文件 |
|---|---|---|
| 1 | 真正的 `CorsConfigurationSource` Bean，用 `@Qualifier` 与 Spring 自带的 `mvcHandlerMappingIntrospector` 消歧。允许域名通过 `obita.cors.allowed-origins` 配置，默认覆盖 localhost:5173 / 5500 / 8000 / 3000。 | `SecurityConfig.java` |
| 2 | 把 `{id}:verb` 路由重构为 sub-resource 风格（`/cancel` `/settle` `/mark-paid` `/approve` `/reject`）。Spring 6 的 PathPatternParser 把 `:` 当 matrix 变量分隔符，原冒号风格要求浏览器侧 `%3A` 编码，前端 `fetch` 体验糟糕。 | `OrderController.java`、`WithdrawalController.java` |
| 3 | 新增 `GET /v1/accounts` 端点：列出商户账户并联入 `ledger_entry` 中最末一条 `balance_after`。驱动前端余额面板。 | `AccountController.java`、`AccountWithBalanceRow.java`、`AccountMapper.java`/`.xml`、`AccountRepository.java`、`AccountRepositoryImpl.java` |

**前端 — 全新 `frontend/` 目录：**

| 文件 | 职责 |
|---|---|
| `index.html` | 登录页 + 4 标签 app 外壳（资金 · 余额 / 订单 / 保险柜 / 分录流水）+ 新建订单 modal |
| `api.js` | fetch 封装。JWT 存 `localStorage`，所有写请求自动生成 `Idempotency-Key`，`ApiError` 携带后端稳定 `code` + `requestId`，401 触发 `auth:expired` 事件回到登录页 |
| `app.js` | DOM 构造（`createElement` + `textContent` —— 用户可控字段不进 `innerHTML`）。串起 4 个流程，注入入金后启动 60 秒轮询，让用户实时看到 PENDING → AVAILABLE 流动 |
| `styles.css` | 沿用 `frontend-legacy/design.md` 的 token：编辑式调色板、brass eyebrow 装饰、mono 显示 ID、状态标签、各类卡片 |
| `README.md` | 启动说明 + 交接备注 |

### 浏览器实跑验证（Chrome DevTools MCP）

新 schema 上记录：

```
✓  POST /v1/auth/login           → JWT 签发成功，topbar 显示登录主体
✓  GET  /v1/accounts             → 4 种稳定币 × 4 类账户余额卡片
                                    （新建 schema 余额都是 0，符合预期）
✓  POST /v1/wallet-addresses     → 0x5949...e6c4 申请成功（POLYGON）
✓  POST /mock-bank/credit        → 注入成功，CSS toast 显示
                                    "credit injected — 等待 scanner 处理"
```

完整 8 条分录的端到端入账（第 1 轮 §4.1）已在本会话早期对同一后端构建复测通过。

### Plan B 中又修的一个 bug

| # | 现象 | 根因 | 修复 |
|---|---|---|---|
| 9 | 启动失败：`No qualifying bean of type 'CorsConfigurationSource' available: expected single matching bean but found 2: corsConfigurationSource, mvcHandlerMappingIntrospector` | Spring MVC 的 `mvcHandlerMappingIntrospector` 也实现了 `CorsConfigurationSource` 接口，Spring 仅按类型无法消歧 | 在构造函数参数上加 `@Qualifier("corsConfigurationSource")` |

累计 bug 数现在是 **9 个** —— 第 1 轮 PROGRESS.md §5 加本节合在一起。
每个都附了根因 + 修法，让后端团队继承经验。

### Plan B 之后的仓库布局

```
obita-web/
├── README.md             ← 项目入口 + 启动说明（顶层）
├── README.zh.md          ← 中文版
├── .gitignore            ← .DS_Store、.env、.claude/settings.local.json
├── .claude/
│   └── launch.json       ← 预览服务器配置（仅本地开发）
├── backend/              ← Spring Boot MVP（第 1 轮）
├── frontend/             ← demo SPA（本轮新建）
│   ├── index.html        登录 + 4 标签外壳
│   ├── api.js            JWT + 幂等 fetch 封装
│   ├── app.js            DOM 渲染器
│   ├── styles.css        编辑式 design token
│   └── README.md
└── frontend-legacy/      ← 原 25K 行 SPA（保留作参考）
    ├── README.md         保留原因说明
    ├── index.html / app.js / styles.css / banner_bg.png
    └── design.md         设计语言规范 —— 仍然是基准
```

### Demo 跑法

参见顶层 `README.md`（或 `README.zh.md`），3 行命令把全栈拉起来。

本文是 Obita 后端 MVP 的**唯一进度真相源**。记录**已完成的内容**、**已被
实际验证可用的内容**、以及**明确留给后端团队的内容**。代码变更必须在同一
PR 中更新此文档 —— 过期的进度文档比没有更糟。

## 1. 一句话总结

MVP 一行命令就能启动，三大目标模块（Orders / Cashier / Vault）端到端跑在
真实的 Postgres / Redis / RocketMQ 上。复式记账已被实际观察到完整跑通：

```
入金检测 → 链上确认 → 订单结算 → 部分退款
```

每一步都生成了**借贷平衡的分录**，扫块器异步运行，乐观锁的 version 字段
全程保持一致，审计日志和幂等键表都同步落库。

## 2. 此前会话承诺的内容

来自前几轮范围对齐：

1. 三个模块：**订单（Orders）**、**收银（Cashier）**、**保险柜（Vault）**。
2. Java + Spring Boot 技术栈（交付目标是 Java 团队）。
3. 多链通过 `ChainAdapter` 抽象；跨链通过 `BridgeProvider` 抽象。
4. 稳定币 + 法币通过 `FiatRampProvider` 与 `CustodyProvider` 抽象。
5. MVP 用 Mock 实现，接口稳定 —— 切换 provider 是改一行配置。
6. 文档**中英文**1:1 对照。
7. 架构选型决策落 ADR-0001。

## 3. 已构建的内容

### 3.1 文档（中英各 8 篇 + 1 篇 ADR）

```
docs/
├── 00-README.md            索引 + 快速开始
├── 01-ARCHITECTURE.md      分层六边形架构、模块图
├── 02-TECH_STACK.md        选型说明 + 替代方案对比
├── 03-DOMAIN_MODEL.md      实体、复式分录、状态机
├── 04-INTEGRATIONS.md      Provider 抽象 + Mock→真实迁移路径
├── 05-SECURITY.md          金融级安全规则 + 威胁模型
├── 06-API.md               REST 约定 + 端点矩阵
├── 07-HANDOFF.md           后端团队上手计划
├── PROGRESS.md             英文版本进度
├── zh/
│   ├── 00-07*.md            中文对照
│   └── PROGRESS.md          ← 你正在看
└── adr/
    ├── README.md
    └── 0001-backend-stack-java-spring-boot.md
```

### 3.2 代码（5 个 Maven 模块，约 98 个 Java 类）

```
backend/
├── pom.xml                  父 POM（Java 21、虚拟线程、-parameters）
├── docker-compose.yml       PG 16 + Redis 7 + RocketMQ 5 + Adminer
├── .env.example             单一配置入口
├── infra/                   rocketmq broker.conf
│
├── common/                  Money、AssetCode、IdGenerator（UUID v7）、
│                            Principal、MerchantId、ErrorCode、
│                            @Audited、@Idempotent、CursorPage
│
├── domain/                  纯领域层（不依赖 Spring）
│   ├── account/             Account、LedgerTx、LedgerEntry、Direction、
│   │                        AccountType、LedgerPostingService
│   │                        （含平台 contra 账户豁免）
│   ├── orders/              Order 聚合、OrderStatus 状态机、
│   │                        OrderEvent、OrderRefund、OrderRepository
│   ├── vault/               WalletAddress、Deposit、DepositStatus、
│   │                        Withdrawal、WithdrawalStatus、VaultRepository
│   ├── chain/               ChainAdapter、ChainAdapterRegistry、
│   │                        ChainId、Address
│   ├── custody/             CustodyProvider 端口（issue / submit /
│   │                        status / snapshot / capabilities）
│   └── merchant/            MerchantUser、MerchantUserRepository
│
├── db/                      Flyway V1..V5
│   ├── V1__baseline.sql     参考数据、身份、账户、分录、审计、幂等、
│   │                        余额平衡触发器
│   ├── V2__orders.sql       merchant_order、order_event、order_refund
│   ├── V3__vault.sql        wallet_address、deposit、withdrawal、cursor
│   ├── V4__cashier.sql      payment_intent、ramp_transaction（占位）
│   └── V5__seed.sql         链 / 资产、PLATFORM 商户 + 账户、
│                            DEMO 商户 + 管理员 + 账户
│
├── infrastructure/          MyBatis 映射 + 仓储实现、
│                            Mock 链适配器、Mock 托管 provider、
│                            Cobo 真实供方桩、UUID typeHandler
│
└── api/                     Spring Boot 应用
    ├── ObitaApplication     入口，启用虚拟线程
    ├── security/            JwtService、JwtAuthFilter、SecurityConfig
    ├── advice/              GlobalExceptionHandler、IdempotencyAdvice、
    │                        AuditAdvice（AOP）
    ├── auth/                AuthController、PasswordHasher（Argon2id）
    ├── orders/              OrderController、OrderApplicationService、DTO
    └── vault/               WalletAddressController、WithdrawalController、
                             VaultApplicationService、DepositScanner（@Scheduled）、
                             MockBankController
```

## 4. 已实际验证可工作的部分

验证环境：macOS（Apple Silicon）+

- JDK 21（Oracle Temurin 下载到 `/tmp`，未污染主机）
- Maven 3.9.9（下载到 `/tmp`）
- Docker Desktop + 项目自带 `docker-compose.yml`

冷启动用时：

```
postgres ready                       1 秒
redis ready                          1 秒
rocketmq nameserver + broker         3 秒
flyway V1..V5 全部应用               0.13 秒（1 + 5 个迁移）
4 条链注册                           瞬时
Spring Boot 启动完成                 3.6 秒
```

### 4.1 冒烟证据：完整资金流的 8 条分录

mock-bank 注入一笔入金 → 订单结算 → 部分退款，端到端产生**8 条借贷平衡**
的分录：

```
id |  owner   |    acct    | dir |  amount  |  bal_after  | tx_type      | memo
----+---------+------------+-----+----------+-------------+--------------+----------------
  1 | PLATFORM | SETTLEMENT | D   |   500.00 |   -500.00   | DEPOSIT      | deposit pending
  2 | merchant | PENDING    | C   |   500.00 |    500.00   | DEPOSIT      | deposit pending
  3 | merchant | PENDING    | D   |   500.00 |      0.00   | DEPOSIT      | deposit confirmed
  4 | merchant | AVAILABLE  | C   |   500.00 |    500.00   | DEPOSIT      | deposit confirmed
  5 | merchant | AVAILABLE  | D   |   100.00 |    400.00   | ORDER_SETTLE | settle ORD-001
  6 | merchant | SETTLEMENT | C   |   100.00 |    100.00   | ORDER_SETTLE | settle ORD-001
  7 | merchant | SETTLEMENT | D   |    30.00 |     70.00   | REFUND       | refund ORD-001
  8 | merchant | AVAILABLE  | C   |    30.00 |    430.00   | REFUND       | refund ORD-001
```

被同时验证的关键性质：

- 每个 `tx_id` 内借贷总额相等（DB 约束触发器把关）。
- `balance_after` 单账户走 running total，平台 contra 账户的负数余额
  正确表示"持有的链上资产"。
- 每次聚合修改都让乐观锁 `version` 自增，未观察到陈旧读冲突。
- Idempotency-Key 重放命中缓存响应，不会重复执行。
- 审计日志 `audit_log` 与业务写在同一个 DB 事务内落库。

### 4.2 单元测试（全绿）

```
Obita :: Common  →  MoneyTest        4 个 测试  Money + AssetCode 不变量
Obita :: Domain  →  OrderStatusTest  3 个 测试  状态机转移规则
```

### 4.3 手工跑通的端点

```
POST /v1/auth/login                       → JWT 签发（HS512、15 分钟 TTL）
GET  /v1/auth/me                          → 回显登录主体
POST /v1/orders                           → CREATED → PENDING_PAYMENT
POST /v1/orders/{id}%3Amark-paid          → PAID
POST /v1/orders/{id}%3Asettle             → SETTLED + AVAILABLE→SETTLEMENT 入分录
POST /v1/orders/{id}/refunds              → COMPLETED + SETTLEMENT→AVAILABLE 反向
GET  /v1/orders/{id}/events               → 4 条状态转移事件
POST /v1/wallet-addresses                 → mock HD 推导出 0x 地址
POST /mock-bank/credit                    → 注入合成入金（scanner ~10 秒接管，
                                             ~30 秒后达到 12 个确认转为 CREDITED）
```

## 5. 验证过程中发现并修复的真实 bug（共 8 个）

冒烟过程暴露了 8 个真实问题。每个都是**给后端团队的预防性知识**，
影响所有 Spring Boot + MyBatis-Plus + Postgres + Java 21 的项目。

| # | 现象 | 根因 | 修复 |
|---|---|---|---|
| 1 | 启动报扩展 `citext` 不存在 | V1 用了 `CITEXT` 但没 `CREATE EXTENSION` | 改 `TEXT`（注释提示后续如需启用） |
| 2 | MyBatis "No typehandler found for property id" | Lombok `@Data` 注解处理器没生效 —— compiler-plugin 写在 `<pluginManagement>`，子模块不显式声明就拿不到 | 把 compiler-plugin 移到 `<build><plugins>`，所有子模块继承 |
| 3 | 修了 #2 后还报同样错 | mybatis-plus 3.5.7 在某个代码路径里不会从 bean 反射推 `<resultMap>` 内字段的 javaType | 重写为 `resultType + column AS "camelCaseProperty"`；只在自定义 typeHandler 必须存在的 resultMap 里显式写 javaType |
| 4 | INSERT/UPDATE 报 "Type handler was null for UUID" | MyBatis 3.5.16 没有内置 UUID 处理器 | 写 `UuidTypeHandler` 通过 `mybatis-plus.type-handlers-package` 全局注册 |
| 5 | "No qualifying bean for IdempotencyMapper" | `@MapperScan` 只覆盖 `com.obita.infrastructure.persistence` | 扩到 `idempotency` 与 `audit` 两包 |
| 6 | 带 `@PathVariable UUID id` 的路由 500 | 编译器没加 `-parameters`，运行时反射拿不到参数名 | compiler-plugin 加 `<parameters>true</parameters>` |
| 7 | `POST /v1/orders/{id}:settle` 405 | Spring 6 PathPatternParser 把 `:` 当 matrix 变量分隔符 | URL-encode 成 `%3A` 临时绕过；设计建议改 sub-resource 风格（`/settle`） |
| 8 | scanner 跑了但 ledger 没生成 + 余额非负检查拦截 | 三层叠加：（a）`@Transactional` 方法被 lambda 自调用绕过 AOP 代理 → 没事务 → 部分提交；（b）平台 contra 账户从 0 起步 debit 后变负数被拦；（c）`LedgerEntry` 构造器 + DB CHECK 不允许 `balance_after` 负数 | （a）把 scanner 写方法移到 `@Service` 类让代理生效；（b）`LedgerPostingService` 引入 `PLATFORM_MERCHANT_ID` 豁免；（c）放开 `balance_after >= 0` 检查，注释解释"负的负债余额 = 持有资产" |

8 个问题的修复都附了解释性注释，避免后人重蹈覆辙。

## 6. 明确**未做**的部分（仅留骨架）

| 模块 / 关注点 | 状态 | 备注 |
|---|---|---|
| Orders 模块 | 端到端完成 | 控制器 + 服务 + 状态机 + 仓储 |
| Vault 模块 | 端到端完成 | 钱包申请 + 扫块器 + 出金（4-eyes） |
| Cashier 模块 | 仅 schema + 接口 | `payment_intent`、`ramp_transaction` 表已建；服务 + 控制器待补 |
| Cobo 真实托管 | 真实供方类壳 | TODO 方法标注清楚，契约测试框架已起草 |
| 真实跨链桥 | 仅 Mock | `BridgeProvider` 接口已定义，无桩实现 |
| 真实 KYC | 仅 Mock | 文档提到 `KycProvider` 接口，未编码 |
| 出金地址白名单 | schema 草稿 | 服务层强制 + 管理 API 待补 |
| Outbox + RocketMQ 派送 | 未开始 | `outbox_event` 仅在 V5 草稿提到 |
| 出站 webhook | 未开始 | 端点配置表待补；HMAC 签名工具在文档草拟 |
| MFA / TOTP | 仅骨架 | `app_user.mfa_enabled` 字段存在；验证流程待补 |
| pgaudit / 行级安全 | 仅文档 | 迁移中尚未启用 |
| `:动作` 路由的 sub-resource 重构 | 已知问题 | `%3A` 编码可用，重构待做 |
| Testcontainers 集成测试 | pom 配置就绪 | 测试代码尚未写 |

## 7. 后续推进建议（P0 → P2）

### P0 —— 任何生产流量之前必须就绪

1. 真实 `CoboCustodyProvider`（或 Safeheron），过契约测试。
2. 用 web3j 写真实 `EvmChainAdapter`，按链替换 `MockEvmChainAdapter`。
3. 扫块器的重组处理 —— 当前 cursor 只前进，不回退。
4. Outbox 模式接通 —— 让领域事件即使下游消费者慢/挂也能可靠发到 RocketMQ。
5. `:动作` 路由重构为 sub-resource（`POST .../settle`）。
6. 出金地址白名单 + 24 小时冷静期。
7. Redis 令牌桶限流挂到所有写端点。
8. 审计日志投递 WORM 存储（S3 + Object Lock）。
9. 第三方安全公司渗透测试。
10. 生产 secret manager 接入；`application-prod.yaml` 拒绝 `mock` provider。

### P1 —— 公开 beta 前应当就绪

1. Cashier 模块端到端（Circle Mint + 一条 CNY 通道）。
2. Squid Router 跨链。
3. 结算报表 + 与托管对账作业。
4. KYC 接入（推荐 Sumsub）。
5. PG 行级安全策略启用。
6. `MERCHANT_ADMIN` 启用 WebAuthn。

### P2 —— 锦上添花

1. 多区域主备。
2. `ledger_entry` 月分区。
3. 基于 OpenAPI 自动生成 SDK。
4. 商户分级 SLA 告警。
5. Tron / Solana 真实链适配器。

## 8. 从零复现冒烟流程

```bash
cd backend
cp .env.example .env
docker compose up -d                                  # PG / Redis / RMQ

# 需要 Java 21 + Maven。本机若没有，可参考本会话用 /tmp 临时安装的方法，
# 或自行安装。
mvn -DskipTests clean package                         # 打 fat jar

java -jar api/target/obita-api-0.1.0-SNAPSHOT.jar &   # 监听 :8080

# 设置 demo 用户密码哈希（一次性 —— 直到 V5 种子再生）：
docker exec obita-postgres psql -U obita -d obita -c \
  "UPDATE app_user SET password_hash='\$argon2id\$v=19\$m=65536,t=3,p=2\$0j4zU4yYQ5YBeOm7b9XrtA\$HvLXls2EjmhJROzOthfEcMv0R1By26vtUEb2/KGjExI' WHERE username='demo';"

TOKEN=$(curl -s -X POST http://localhost:8080/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"merchantCode":"DEMO","username":"demo","password":"ObitaDemo!2026"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# 申请 Polygon 入金地址
ADDR=$(curl -s -X POST http://localhost:8080/v1/wallet-addresses \
  -H "Authorization: Bearer $TOKEN" -H 'Idempotency-Key: addr-1' \
  -H 'Content-Type: application/json' \
  -d '{"chainId":"POLYGON","purpose":"DEPOSIT"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['address'])")

# 注入 500 USDC 入金
curl -s -X POST http://localhost:8080/mock-bank/credit \
  -H 'Content-Type: application/json' \
  -d "{\"chainId\":\"POLYGON\",\"asset\":\"USDC-POLYGON\",\"toAddress\":\"$ADDR\",\"amount\":\"500.00\"}"

# 等 ~40 秒后查分录
docker exec obita-postgres psql -U obita -d obita -c \
  "SELECT a.account_type, le.direction, le.amount, le.balance_after, lt.tx_type FROM ledger_entry le JOIN ledger_tx lt ON lt.id=le.tx_id JOIN account a ON a.id=le.account_id ORDER BY le.id;"
```

## 9. 本轮敲定的设计决策

- 引入 `LedgerPostingService.PLATFORM_MERCHANT_ID` 常量；平台账户允许
  `balance_after` 走负数，用于在不引入"资产-自然账户类型"的前提下，
  正确表达双式记账中"我们持有客户资产"的语义。
- `balance_after` schema 层只做信息字段，应用层按 AccountType 分别强制
  非负 —— 平台账户除外（见上）。
- `Idempotency-Key` 在 MVP 中对**所有**状态变更 POST/PATCH/DELETE 强制
  要求 —— 切面已接通并被实际验证。
- 所有金额字段走 JSON `String`（避开 JS float 精度），服务端通过
  `MoneyJsonCodec` 反序列化为 `BigDecimal`。
- 所有 UUID 用 v7（时间序）—— 已通过实际生成的 ID 验证（如
  `019dd54e-9c1f-...`）。

## 10. 后端团队应坚持的仓库不变量

1. `domain` 不依赖 `infrastructure` 或任何框架；ArchUnit 测试强制是
   P0 跟进项。
2. 每个状态变更服务方法都标在 Spring `@Service` Bean 上的
   `@Transactional`；**严禁**让同类内 lambda 自调用 —— bug #8 是规范案例。
3. 每条资金路径都走 `LedgerPostingService`；"直接更新余额"是代码评审红线。
4. 每个移动资金的控制器方法都带 `@Idempotent`；无例外。
5. `prod` profile 禁止 mock provider —— staging 部署前接配置时检查。
