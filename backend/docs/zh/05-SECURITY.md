# 05 — 安全（金融级）

后端团队首先要读的文档。所有规则视为强制，除非安全负责人书面豁免。

## 1. 在范围内的威胁模型

| # | 威胁 | 缓解责任 |
|---|---|---|
| T1 | 账号接管（撞库、钓鱼） | 认证 + WAF |
| T2 | 重放捕获 / 退款 / 出金请求 | 幂等键 + 签名请求体 |
| T3 | 余额竞态导致双花 | DB 锁 + 复式分录 |
| T4 | 内部服务被攻陷签发出金 | 托管 + 4-eyes + 风控 |
| T5 | DB 篡改审计 / 分录 | 只追加触发器 + WORM 备份 |
| T6 | 伪装供方的 webhook 投递 | HMAC + 时间戳 + IP 白名单 |
| T7 | 重组 / 灰尘 / 黑名单地址入金 | 扫块器 + 链上确认 + 制裁清单 |
| T8 | 限流 / DoS | 网关层每商户 + 每 IP 限流 |
| T9 | 代码 / 日志中泄密 | secret manager + 日志脱敏 |
| T10 | 依赖 CVE | dependency-check + Renovate + 版本固定 |

不在 MVP 范围：生产 DB 内鬼带数据出走（靠 RBAC + pgaudit 缓解，但无自动检测）、
对商户的钓鱼、网络层 DDoS。

## 2. 认证

### 2.1 密码哈希
- **Argon2id**，参数：`memory=65536, iterations=3, parallelism=2`
  （OWASP 2024 基线）。存储格式 `$argon2id$v=19$...`。
- 哈希前再附**实例级 pepper**（环境变量 `OBITA_AUTH_PASSWORD_PEPPER`）。
  pepper 丢失 = 强制全员重置密码（设计如此）。

### 2.2 JWT
- **Access Token**：HS512 签名，TTL 15 分钟，载荷 `sub`、`mid`（merchantId）、
  `roles[]`、`jti`。
- **Refresh Token**：256 位随机不透明字符串，hash 后存 Redis，TTL 14 天，
  每次刷新轮换（refresh-token rotation + reuse detection）。
- **存储**：refresh 走 `httpOnly; Secure; SameSite=Strict` cookie；
  access 仅放内存（前端刷新时重新获取）。
- **撤销**：`jti` 黑名单写 Redis 直至自然过期。
- **签名密钥轮换**：月度轮换，24 小时双 key 重叠（JWT header 的 `kid`）。

### 2.3 MFA（已搭骨架，默认关闭）
- TOTP（RFC 6238）。`app_user.mfa_enabled` 控制每次登录的 challenge。
- WebAuthn 是后续目标。

## 3. 授权

- **角色制**：`MERCHANT_OPERATOR`、`MERCHANT_ADMIN`、`RISK_REVIEWER`、
  `PLATFORM_ADMIN`。通过应用服务上的 `@PreAuthorize` 强制。
- **租户隔离**：所有读写都用 JWT 中的 `merchant_id` 作 scope。
  `MerchantTenantInterceptor` 拒绝任何 service 调用中传入的不同 merchantId。
- **4-eyes 原则**适用于：
  - 出金审批（审批人 ≠ 申请人）；
  - 手动调账（必须 `PLATFORM_ADMIN`，两步走）；
  - 超过阈值的退款。
- **PG 行级安全**：v1 加固层。MVP 仅靠应用层校验，但 RLS 策略草稿在
  `db/.../policies.sql`（未启用）。

## 4. 资金安全 7 条诫律（不可妥协）

接触资金路径的所有人必须遵守：

1. **始终用 `BigDecimal`**。任何包含 `Money`、`Order`、`Withdrawal`、
   `Ledger`、`Balance` 的类禁用 `double` / `float`。ArchUnit 测试做编译期检查。
2. **半偶舍入 + 显式精度**。每个资产定义 `RoundingPolicy`，统一在
   `MoneyMath`。`BigDecimal.divide` 必须带 scale + rounding。
3. **所有资金流必须经过分录**。"直接更新余额"是代码评审红线。
4. **多步资金操作放进一个 DB 事务**。做不到时使用 outbox + saga，
   永不"尽力而为"。
5. **读改写之前必须加锁**。`SELECT ... FOR UPDATE` + 版本号双保险。
6. **每个移动资金的 POST 都需要 Idempotency-Key**。服务端去重；
   同 key 不同 body 返回 422。
7. **INFO 级日志禁止记录金额字段**。用 `MoneyLogFormatter`：
   INFO 级抹去尾数，仅 DEBUG 用特殊 token 解码完整值。

## 5. 幂等

- 头部：`Idempotency-Key: <128-char ASCII>`。
- 服务端缓存 `(merchant_id, key) → request_hash + response`。
- 同 body 复用 → 返回缓存响应。
- 不同 body 复用 → `422 IdempotencyKeyConflict`。
- TTL 24 小时。
- 强制要求的端点：所有创建 / 更新 / 移动资金的 `POST` / `PATCH`。
  读端点不要求。

## 6. Webhook 接入安全

每个调用我们的供方都要：

1. **HMAC 验签**：`Webhook-Signature` 头由供方共享密钥（vault）签名。
2. **时间戳检查**：`Webhook-Timestamp` ±5 分钟内，过期拒绝。
3. **重放保护**：`Webhook-Id` 缓存 7 天，重复拒绝。
4. **IP 白名单**：使用供方公布的 IP 段，WAF 层强制。
5. **不抢先 ACK**：只有把事件写入 `webhook_event` 表后才返回 `200`。

## 7. Webhook 出站签名

通知商户时：

```
X-Obita-Signature: t=<ts>,v1=<base64-hmac-sha256(secret, t + '.' + body)>
X-Obita-Webhook-Id: <uuid>
X-Obita-Event-Type: order.paid
```

商户用控制台展示的密钥校验。密钥轮换 7 天双 key 重叠。

## 8. 出金专项控制

通用规则之外：

- **地址白名单**：商户只能向预登记地址出金（新增地址 24 小时冷静期）。
- **速率限额**：每商户分级日限 / 周限；50% 时软提醒。
- **制裁筛查**：每次请求查 OFAC / 链上分析（MVP Mock，v1 真供方）。
- **风险评分**：MVP 简单规则——大额 + 新地址 + 非工作时间 → `RISK_REVIEW`。
- **首次新地址冷静期**：tier-2+ 商户可选 30 分钟延迟。

## 9. Secret 管理

- 严禁提交 `.env`、密钥、助记词。CI 在每个 PR 跑 `gitleaks`。
- 本地 dev 密钥刻意弱（`obita_dev_pwd`）+ 仅 `127.0.0.1` 监听。
- 生产：云 secrets manager（AWS Secrets Manager / 阿里云 KMS / Vault）。
  应用通过 `spring.config.import=aws-secrets:` 加载。
- 托管 API key 仅授权给生产网关的出口 IP。

## 10. 日志卫生

- **永不记录**：密码、JWT 全文、refresh token、托管密钥、PII（身份证号、完整银行账号）。
- **默认截断**：银行账号显示 `****1234`，地址显示 `0xabc...d1234`。
- **PII 过滤器**：`LogFilter` 按白名单脱敏，未在白名单里的字段一律
  `[REDACTED]`。
- **保留期**：日志 90 天热 + 1 年冷（S3 glacier）；审计日志 7 年。

## 11. 可观测

- 每个请求都有 `X-Request-Id`（带入则用，无则生成）。
- `traceId`（W3C `traceparent`）在 HTTP 与 RocketMQ 消息头之间贯通。
- Micrometer 统计指标，Prometheus 抓取。
- 告警规则：
  - 5 分钟出金失败率 > 1%；
  - 入金检测延迟 > 期望确认数 × 2 倍；
  - 幂等命中率突增（客户端 bug 或重放迹象）；
  - 单商户 5xx 率 > 0.5%。

## 12. 数据分类

| 等级 | 示例 | 存储规则 |
|---|---|---|
| 公开 | merchant code、asset code | 可日志 |
| 内部 | merchant id、user id | 可日志、不可对外暴露 |
| 机密 | 余额、订单金额 | 读时审计；INFO 级日志脱敏 |
| 受限 | 密码哈希、refresh token、托管 key | 永不日志；落库加密；最小权限 |

## 13. 提交前 / CI 安全检查

- `spotless` 格式化 + import 顺序（让 diff 干净）。
- 预提交跑 staged 文件的 `gitleaks`，CI 跑全仓库。
- 每周 + 每个 release 分支跑 `dependency-check`（OWASP）。
- `archunit` 测试：
  - 资金包内禁止 `double`/`float`；
  - `domain` 不可 import `org.springframework.*`；
  - 所有控制器必须带 `@PreAuthorize`。
- `pmd` 规则集覆盖加密 / SQL 注入风险模式。

## 14. 事件响应（占位）

MVP 不定义正式 IR runbook —— 列入 v1 早期任务。最小可用：
- 值班轮换：`docs/oncall.md`（团队补全）；
- 严重度矩阵 + paging 阈值（草拟未启用）；
- 出金紧急熔断：`POST /admin/halt` 翻转 Redis 标志，所有出金服务在
  动作前必读。**已实现。**
