# 更新日志

> English: [CHANGELOG.md](CHANGELOG.md)

**obita-web** 所有可注意的变更都记录在这里。每一个 checkpoint /
sprint / commit 一条记录；最新的在最上面。

仓库尚未到 1.0，版本号沿用最近一次提交的日期 (`yyyy-mm-dd-vN`) 而非 SemVer。

---

## [2026-04-29-v6] — Sprint 6 · Payouts 真实接通（端到端 4-eyes）

第 3 轮收尾后第一个真实接通的 sprint。Payouts 从纯 mock 升级为完整跑通
4-eyes 提现生命周期。

- **DB**：`V6__seed_demo_approver.sql` —— 新增 `demo_approver` 用户
  （`MERCHANT_ADMIN` + `RISK_REVIEWER`），无需 admin 工具就能演示 4-eyes，
  与 `demo` 共享同一个 demo 密码。
- **Frontend API** (`api.js`)：`listWithdrawals`、`getWithdrawal`、
  `createWithdrawal`、`approveWithdrawal`、`rejectWithdrawal`。
- **Frontend page** (`pages/payouts.js`)：移除 mock 数据；KPI 与表格
  来自 `GET /v1/withdrawals`。`Approve` / `Reject` 按钮仅在
  `REQUESTED` / `RISK_REVIEW` 状态渲染。`REJECTED` / `FAILED` 行内
  显示 `failureMessage`。
- **Modal**：`#modal-create-withdrawal`（链 · 资产 · 金额 · 收款地址），
  标签由 `i18n.js` 接管。
- **Status pill** (`ui.js`)：把 `WithdrawalStatus` 的所有取值映射到
  pill 变体 —— `REQUESTED` / `RISK_REVIEW` = warn，`APPROVED` /
  `SUBMITTED` / `CONFIRMING` = info，`COMPLETED` = success，
  `REJECTED` / `FAILED` = danger。
- **i18n** (`strings.js`)：空状态、操作按钮、确认、modal 标签、toast
  全部就位 —— en + zh 各一份。
- **浏览器验证**：创建 → REQUESTED → toast；登出 → 以 `demo_approver`
  登录 → 审批 → SUBMITTED → toast。三笔提现共产生 8 条平衡分录
  （`AVAILABLE → RESERVED` 预留 + `RESERVED → AVAILABLE` 驳回反向）。
- **自审批**（同一用户两端）服务端返回
  `WITHDRAWAL_FOUR_EYES_VIOLATION` —— 端到端验证。
- **本 sprint 未做**：SUBMITTED → CONFIRMING → COMPLETED 的调度器。
  聚合的迁移方法和 `findInFlight()` 仓储方法都已就位；缺口仅在
  `WithdrawalScanner` + `VaultRepositoryImpl.toDomainWithdrawal` 的
  水合补全。下一个 sprint 处理。

## [2026-04-29-v3.6] — `43c83f1` · 文档 · 第 3 轮进度 + 前端架构

- 后端 `docs/PROGRESS.md`（含 zh 镜像）：新增 **第 3 轮 — 编辑风格商户
  操作台** 章节，含 sprint 概览表、模块树、路由 × 后端接通矩阵、
  横切特性、浏览器验证清单。
- `frontend/README.md` 按重构后的模块布局与 wallet-history 混合行为
  刷新。

## [2026-04-29-v3.5] — `ac4319f` · Sprint 5 · 钱包流水抽屉

- 在稳定币保险柜页面点击任意地址卡片 → 右侧抽屉滑入，显示该地址的
  近期活动。
- 数据混合：当链有非零 AVAILABLE 余额时，从 `GET /v1/accounts`
  取一条 `LIVE` 行；下方再渲染 3 条按地址确定性 mock 行（充值 /
  结算 / 充值）。
- 后端 `GET /v1/wallet-addresses/{id}/transactions`（P1）上线后可
  无缝替换。
- 复用 Sprint 3 的通用 `drawer.js`。

## [2026-04-29-v3.4] — `13389ef` · Sprint 4 · 编辑风格 mock 页面

把 5 个 Coming Soon 占位升级成完整的编辑风格页面，让操作台读起来是
一个产品：

- **Members** (`#members`)：KPI strip + 成员表，含角色 (`OWNER` /
  `ADMIN` / `OPERATOR` / `VIEWER`)、MFA、上次登录、状态。Mock；后端
  角色表已存在。
- **Approvals** (`#approvals`)：按 legacy §3.5 的严重度条（4px 危险 /
  3px warn-info / 2px awareness），覆盖合规、出款、地址簿、成员变更。
  审批 / 驳回按钮挂在 P1 toast 后面。
- **Conversion** (`#conversion`)：实时 mock 报价框（汇率 · 预计到账 ·
  0.10% 手续费），近期兑换表。
- **Report Center** (`#reports`)：3 张编辑风格卡片（Balance / Orders /
  Ledger CSV）；hero 直达后端 OpenAPI JSON + Swagger UI。
- **Payouts** (`#payouts`)：KPI strip + 出款表，含链徽章 + 4-eyes
  状态。
- 5 条已完成路由的侧边栏 **Soon** pill 移除；Fiat Vault 仍为占位。

## [2026-04-29-v3.3] — `1c36fd7` · Sprint 3 · 顶栏改造

- **收件箱抽屉**（右侧滑入）：4 条 mock 消息（合规 / 入金 / 月结 /
  欢迎），黄铜未读标记，UNREAD pill，相对时间，点击已读。
- **铃铛** 在有未读时叠一个危险色小红点。
- **个人资料下拉**：demo · DEMO 标头 + mono 邮箱 + My profile /
  Security / API docs / Sign out。
- API docs 在新标签页打开 `${baseUrl}/swagger-ui.html` —— 无成本拿到
  后端可发现性。
- 新模块 `js/drawer.js`（通用右侧抽屉 + overlay），Sprint 5 的钱包
  流水抽屉复用。

## [2026-04-29-v3.2] — `e51268e` · Sprint 2 · 模块拆分

- `app.js` 原本 1.2k 行，把 strings + DOM helpers + i18n + theme +
  router + 全部页面渲染塞在一起。拆到 `js/` 下：
  - `dom.js`, `format.js`, `strings.js`, `i18n.js`, `theme.js`,
    `ui.js`, `router.js`
  - `js/pages/`：overview、vault、orders、order-detail、ledger、
    coming-soon
- `app.js` 缩到 ~120 行：bootstrap + 登录 + 切换按钮接线 + 路由注册。
- 原生 ES Module —— 无构建。
- `balanceCard` 从 `overview.js` 导出，`vault.js` 复用，单一资产卡片
  模式只此一处。

## [2026-04-29-v3.1] — `3141dc0` · Sprint 1 · 编辑风格 UI 重建

Demo SPA 原本是四标签外壳。按 `frontend-legacy/design.md` 的设计语言
重做为 sidebar+main 编辑风格仪表板：

- **布局**：sidebar (240px，section 标签 + 黄铜激活点) + 64px topbar +
  main 滚动。
- **编辑风格头部卡片**（3px 黄铜渐变 + 黄铜 eyebrow + Clash Display
  标题 + 副标题 + 操作槽）每页一份。
- **KPI strip**：brand-ink hero 块 + 3 个带状态点的 peer 块。
- **状态 pill** 与 legacy
  `--status-{success,info,warn,danger}-{fg,strong,bg,soft-bg,border}`
  token 配对。
- **mono 序号 pill**（`01` / `02` / `03`）出现在每个 section 头。
- **资产 chip** 在 brand-paper 上呈现 `USDC-…` / `USDT-…`。
- **地址簿卡片** 含链徽章 + 掩码地址尾部。
- **订单详情弹窗** 接通 `GET /v1/orders/{id}` +
  `GET /v1/orders/{id}/events`，渲染状态机时间线。
- **中英双语** (en + zh，默认英语) 通过 `t(key)` + `localStorage` 持久化。
- **浅/深主题** 通过 `data-theme` token override；首次加载尊重
  `prefers-color-scheme`。
- **hash 路由** — `#vault`、`#orders`，可深度链接。

---

## [2026-04-29-v2] — `64b8d08` · 文档 · Plan B 进度 + 顶层 README

- 顶层 `README.md`（+ `README.zh.md`），从 `obita-web/` 即可入门。
- `backend/docs/PROGRESS.md` 重写，含完整的 **第 1 轮** 烟雾测试证据
 （8 条分录）+ **第 2 轮 — Plan B** 接通。

## [2026-04-29-v1] — `0cb9f63` · feat · Demo SPA + 后端联通 (Plan B)

四标签 demo SPA 与后端联通，4 个核心流程在浏览器端到端可验证：

- 登录（`POST /v1/auth/login`）。
- 余额（`GET /v1/accounts`）—— 4 种稳定币 × 4 种账户类型。
- 保险柜（`POST /v1/wallet-addresses` + `POST /mock-bank/credit` →
  扫块器识别后写 4 条分录）。
- 订单（`POST /v1/orders` + 生命周期：标记已付 → 结算 → 退款）。

同轮修复的后端硬阻塞：

- 真正的 CORS bean（`CorsConfigurationSource`）配 `@Qualifier`，
  避开 Spring 的 `mvcHandlerMappingIntrospector` 同名歧义。
- `{id}:verb` 路由改为子资源风格 (`/cancel`、`/settle`、`/mark-paid`、
  `/approve`、`/reject`) —— Spring 6 PathPatternParser 把 `:` 当矩阵
  变量分隔符。
- 新端点 `GET /v1/accounts`，把 account 与 ledger_entry 的最新
  `balance_after` join 起来。

第 1 + 2 轮累计 bug 数：**9** 个（每一个都附了根因 + 修复）。

## [更早] — Plan B 之前的基础

| 提交 | 标题 |
|---|---|
| `a70eab5` | feat · Backend MVP — Web2+Web3 商户操作台的 Spring Boot 骨架 |
| `9273f7e` | docs+design · Token 层 + 中性色批量规范化 + design.md |
| `22857d4` | feat+design · Overview 打磨 — Exceptions & Tasks 轨道、更轻的 Summary 卡片、news 刷新 |

这一段奠定了后端 MVP（Spring Boot 3.3 + Java 21，三模块：Orders /
Cashier / Vault，MyBatis-Plus + Flyway V1..V5，PG/Redis/RocketMQ
docker-compose）以及后续设计语言所参考的 frontend-legacy SPA。

---

## 如何阅读

- **每一个会带来可见行为或推动项目前进的提交** 在此一条。
- 改变代码组织方式的纯重构也写进来（如 Sprint 2 的模块拆分）。
- 后端 bug 修复的细节仍归 `backend/docs/PROGRESS.md` §5 —— 那是
  canonical 的事故复盘位置。
- Sprint 结构在第 3 轮引入；更早的工作只列提交哈希。
