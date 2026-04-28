# 06 — REST API 约定

## 1. 版本

- 全部端点前缀 `/v1`。破坏性变更进入 `/v2`。`/v1` 一旦交付商户就**不再破坏**。
- 头部要求：`Accept: application/json`。响应固定 `application/json; charset=utf-8`。

## 2. 认证头

```
Authorization: Bearer <access_jwt>
X-Request-Id: <uuid>             # 可选，未带则服务端生成
Idempotency-Key: <key>           # 状态变更接口必带
```

## 3. URL 与资源命名

- 资源是名词，路径用小写 + kebab-case：
  `/v1/orders`、`/v1/wallet-addresses`、`/v1/payment-intents`。
- 不适合 CRUD 的动作再用动词：
  `POST /v1/orders/{id}:cancel`、`POST /v1/withdrawals/{id}:approve`。
- 租户域从 JWT 隐含，**URL 中不带 `merchantId`**。`/v1/admin/...` 的
  管理端点可以接 `?merchantId=`，需要 `PLATFORM_ADMIN`。

## 4. 分页

游标式：

```
GET /v1/orders?status=PAID&limit=50&cursor=eyJjcmVhdGVkQXQ...
```

响应：

```json
{
  "data": [...],
  "pageInfo": {
    "nextCursor": "eyJ...",
    "hasNext": true
  }
}
```

页大小封顶 200。`cursor` 是 `(created_at, id)` 的不透明 base64。

## 5. 过滤与排序

- 过滤：`?status=PAID&from=2026-04-01&to=2026-04-30`。
- 时间参数 ISO-8601 带时区（`2026-04-29T00:00:00+08:00`）。
- 默认排序 `createdAt DESC`，`?sort=createdAt:asc` 可覆盖。

## 6. 标准响应信封

成功 —— 直接返回 DTO，不嵌套 `{"data": ...}`（最常见的单资源场景少一层）；
分页响应见上。

错误：

```json
{
  "code": "ORDER_INVALID_STATE",
  "message": "Order is in REFUNDED state and cannot be cancelled.",
  "requestId": "01J...",
  "details": {
    "orderId": "01J...",
    "currentStatus": "REFUNDED"
  }
}
```

`code` 是稳定字符串枚举。客户端按 `code` 分支，**不要**按 `message` 解析。
注册表见 `common` 模块的 `ErrorCodes.java`。

### HTTP 状态码

| 状态 | 用途 |
|---|---|
| 200 | 读成功 |
| 201 | 创建成功（必须带 `Location` 头） |
| 202 | 异步接受（如出金已入队） |
| 204 | 删除成功，无响应体 |
| 400 | 校验失败（`code=VALIDATION_FAILED`） |
| 401 | 缺失 / 无效 auth |
| 403 | 已认证但无权 |
| 404 | 当前商户范围内未找到 |
| 409 | 状态冲突（`code=ORDER_INVALID_STATE` 等） |
| 422 | 幂等 key 冲突 |
| 429 | 限流 |
| 500 | 服务端 bug —— 必须返回 `requestId` |
| 503 | 下游 provider 不可用 |

## 7. 端点清单（MVP）

### 认证

```
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
POST   /v1/auth/mfa/verify
GET    /v1/auth/me
```

### 商户

```
GET    /v1/merchant
PATCH  /v1/merchant                            # 名称、品牌
GET    /v1/merchant/users
POST   /v1/merchant/users
PATCH  /v1/merchant/users/{id}
```

### 订单

```
POST   /v1/orders
GET    /v1/orders
GET    /v1/orders/{id}
GET    /v1/orders/by-no/{merchantOrderNo}
POST   /v1/orders/{id}:cancel
POST   /v1/orders/{id}/refunds
GET    /v1/orders/{id}/refunds
GET    /v1/orders/{id}/events
```

### 保险柜

```
GET    /v1/wallet-addresses
POST   /v1/wallet-addresses                    # 申请新地址 (chain, purpose)
GET    /v1/deposits
GET    /v1/deposits/{id}
POST   /v1/withdrawals
GET    /v1/withdrawals
GET    /v1/withdrawals/{id}
POST   /v1/withdrawals/{id}:approve            # 4-eyes
POST   /v1/withdrawals/{id}:reject
GET    /v1/withdrawal-allowlist
POST   /v1/withdrawal-allowlist
DELETE /v1/withdrawal-allowlist/{id}
```

### 收银

```
POST   /v1/payment-intents
GET    /v1/payment-intents
GET    /v1/payment-intents/{id}
POST   /v1/payment-intents/{id}:cancel
POST   /v1/quotes/fiat-to-stable               # 报价（TTL ~30s）
POST   /v1/quotes/stable-to-fiat
```

### 账户与分录

```
GET    /v1/accounts                            # 当前各资产余额
GET    /v1/accounts/{id}/entries               # 只追加日记账行
GET    /v1/ledger/transactions/{id}
```

### Webhook（入站）

```
POST   /webhooks/custody/cobo
POST   /webhooks/ramp/circle
POST   /webhooks/ramp/banxa
POST   /webhooks/ramp/mock
POST   /webhooks/bridge/squid
```

### Webhook（出站配置）

```
GET    /v1/webhook-endpoints
POST   /v1/webhook-endpoints
PATCH  /v1/webhook-endpoints/{id}
DELETE /v1/webhook-endpoints/{id}
GET    /v1/webhook-deliveries                  # 投递记录
POST   /v1/webhook-deliveries/{id}:retry
```

### 平台管理（仅 `PLATFORM_ADMIN`）

```
POST   /v1/admin/halt                          # 全局熔断出金
POST   /v1/admin/resume
POST   /v1/admin/custody/reconcile
POST   /v1/admin/ledger/adjust                 # 4-eyes 手动调账
GET    /v1/admin/audit?...
```

### 系统

```
GET    /actuator/health
GET    /actuator/info
GET    /actuator/prometheus
GET    /v3/api-docs                             # OpenAPI JSON
GET    /swagger-ui.html                         # 交互页
```

## 8. 出站 webhook 事件

发送到商户登记 URL（`webhook_endpoint`）。事件类型：

```
order.created
order.pending_payment
order.paid
order.settled
order.cancelled
order.refunded
deposit.detected
deposit.credited
withdrawal.approved
withdrawal.completed
withdrawal.failed
payment_intent.fiat_received
payment_intent.settled
payment_intent.failed
```

载荷：

```json
{
  "id": "01J...",
  "type": "order.paid",
  "createdAt": "2026-04-29T08:30:00Z",
  "data": { ... 资源快照 ... },
  "merchantId": "01J..."
}
```

## 9. OpenAPI 生成

`SpringDoc` 在运行时反射控制器与 DTO 生成 spec：
- `/v3/api-docs` —— JSON 规范；
- `/swagger-ui.html` —— Knife4j 主题交互页。

`openapi-export` profile 把 spec 输出到 `api/target/openapi.json`，可作为
release artefact 一并发布。

DTO 约定（让生成的 spec 干净）：
- 所有 DTO 用 Java `record` + Bean Validation 注解。
- 每个字段标注 `@Schema(description = ..., example = ...)`。
- 枚举用 Java enum（不用 String），SpringDoc 会渲染成 `enum:[...]`。
- 金额字段在 wire 格式上是 `String`（避开 JS float 精度），服务端通过
  `MoneyJsonCodec` 解析为 `BigDecimal`。

## 10. 限流（默认）

| 类型 | 每商户 | 每用户 | 每 IP |
|---|---|---|---|
| 公共认证 | 10 / 分钟 | — | 60 / 分钟 |
| 读 | 600 / 分钟 | 300 / 分钟 | — |
| 写 | 120 / 分钟 | 60 / 分钟 | — |
| Webhook 入站 | 1200 / 分钟 | — | 限定供方 IP |

通过 Redis 令牌桶（`Redisson` `RRateLimiter`）实现。商户分级可在
`merchant.metadata.limits` 覆盖。
