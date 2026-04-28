# 06 — REST API Conventions

## 1. Versioning

- All endpoints prefixed with `/v1`. Breaking changes go to `/v2`. We
  never break `/v1` once shipped to merchants.
- Headers: `Accept: application/json` required. Responses always
  `application/json; charset=utf-8`.

## 2. Authentication header

```
Authorization: Bearer <access_jwt>
X-Request-Id: <uuid>             # optional, generated server-side if absent
Idempotency-Key: <key>           # required for state-changing endpoints
```

## 3. URL & resource naming

- Resources are nouns, lowercase, kebab-case in path:
  `/v1/orders`, `/v1/wallet-addresses`, `/v1/payment-intents`.
- Verbs only when an action doesn't fit CRUD:
  `POST /v1/orders/{id}:cancel`, `POST /v1/withdrawals/{id}:approve`.
- Tenant scope is implicit from the JWT — **no `merchantId` in URL**.
  Admin endpoints under `/v1/admin/...` may include `?merchantId=` and
  require `PLATFORM_ADMIN`.

## 4. Pagination

Cursor-based:

```
GET /v1/orders?status=PAID&limit=50&cursor=eyJjcmVhdGVkQXQ...
```

Response:

```json
{
  "data": [...],
  "pageInfo": {
    "nextCursor": "eyJ...",
    "hasNext": true
  }
}
```

Page sizes capped at 200. `cursor` is opaque base64 of `(created_at, id)`.

## 5. Filtering & sorting

- Query params for filters: `?status=PAID&from=2026-04-01&to=2026-04-30`.
- Date params are ISO-8601 with timezone (`2026-04-29T00:00:00+08:00`).
- Default sort is `createdAt DESC`. `?sort=createdAt:asc` to override.

## 6. Standard response envelope

Success — naked DTO, pageable wrapped as above. We **do not** wrap
single-resource responses in `{"data": ...}` (saves a layer of nesting on
the most common case).

Error:

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

`code` is a stable string enum. Clients branch on `code`, never on
`message`. See `ErrorCodes.java` (in `common`) for the registry.

### HTTP status policy

| Status | Use |
|---|---|
| 200 | Successful read |
| 201 | Successful create (must include `Location` header) |
| 202 | Accepted async (e.g., withdrawal queued) |
| 204 | Successful delete / no body |
| 400 | Validation error (`code=VALIDATION_FAILED`) |
| 401 | Missing/invalid auth |
| 403 | Authenticated but forbidden |
| 404 | Resource not found in this merchant scope |
| 409 | State conflict (`code=ORDER_INVALID_STATE`, etc.) |
| 422 | Idempotency key conflict |
| 429 | Rate limit |
| 500 | Server bug — must include `requestId` |
| 503 | Downstream provider unavailable |

## 7. Endpoint outline (MVP)

### Auth

```
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
POST   /v1/auth/mfa/verify
GET    /v1/auth/me
```

### Merchant

```
GET    /v1/merchant
PATCH  /v1/merchant                            # display name, branding
GET    /v1/merchant/users
POST   /v1/merchant/users
PATCH  /v1/merchant/users/{id}
```

### Orders

```
POST   /v1/orders                              # create
GET    /v1/orders                              # list with filters
GET    /v1/orders/{id}
GET    /v1/orders/by-no/{merchantOrderNo}
POST   /v1/orders/{id}:cancel
POST   /v1/orders/{id}/refunds                 # create refund
GET    /v1/orders/{id}/refunds
GET    /v1/orders/{id}/events
```

### Vault

```
GET    /v1/wallet-addresses                    # list
POST   /v1/wallet-addresses                    # provision new (chain, purpose)
GET    /v1/deposits                            # list with filters
GET    /v1/deposits/{id}
POST   /v1/withdrawals                         # request
GET    /v1/withdrawals
GET    /v1/withdrawals/{id}
POST   /v1/withdrawals/{id}:approve            # 4-eyes
POST   /v1/withdrawals/{id}:reject
GET    /v1/withdrawal-allowlist
POST   /v1/withdrawal-allowlist                # add address
DELETE /v1/withdrawal-allowlist/{id}
```

### Cashier

```
POST   /v1/payment-intents                     # create on/off-ramp intent
GET    /v1/payment-intents
GET    /v1/payment-intents/{id}
POST   /v1/payment-intents/{id}:cancel
POST   /v1/quotes/fiat-to-stable               # rate quote (TTL ~30s)
POST   /v1/quotes/stable-to-fiat
```

### Account & ledger

```
GET    /v1/accounts                            # current balances per asset
GET    /v1/accounts/{id}/entries               # append-only journal lines
GET    /v1/ledger/transactions/{id}            # one tx with all entries
```

### Webhooks (inbound)

```
POST   /webhooks/custody/cobo
POST   /webhooks/ramp/circle
POST   /webhooks/ramp/banxa
POST   /webhooks/ramp/mock
POST   /webhooks/bridge/squid
```

### Webhooks (outbound config)

```
GET    /v1/webhook-endpoints
POST   /v1/webhook-endpoints
PATCH  /v1/webhook-endpoints/{id}
DELETE /v1/webhook-endpoints/{id}
GET    /v1/webhook-deliveries                  # log of attempts
POST   /v1/webhook-deliveries/{id}:retry
```

### Admin (`PLATFORM_ADMIN` only)

```
POST   /v1/admin/halt                          # halt withdrawals globally
POST   /v1/admin/resume
POST   /v1/admin/custody/reconcile
POST   /v1/admin/ledger/adjust                 # 4-eyes manual journal entry
GET    /v1/admin/audit?...                     # audit log query
```

### System

```
GET    /actuator/health
GET    /actuator/info
GET    /actuator/prometheus
GET    /v3/api-docs                             # OpenAPI JSON
GET    /swagger-ui.html                         # interactive
```

## 8. Outbound webhook events

Sent to merchant URLs registered in `webhook_endpoint`. Event types:

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

Payload shape:

```json
{
  "id": "01J...",
  "type": "order.paid",
  "createdAt": "2026-04-29T08:30:00Z",
  "data": { ... resource snapshot ... },
  "merchantId": "01J..."
}
```

## 9. OpenAPI generation

`SpringDoc` introspects controllers and DTOs at runtime; the spec is
served at `/v3/api-docs` and rendered at `/swagger-ui.html` (Knife4j
theme). The `openapi-export` profile dumps to
`api/target/openapi.json` so it can ship as a release artefact.

DTO conventions for clean OpenAPI:
- All DTOs are Java `record`s with Bean Validation annotations.
- Use `@Schema(description = ..., example = ...)` on every field.
- Enums declared as Java enums (not strings) — SpringDoc renders them as
  `enum:[...]` in the spec.
- Money fields are `String` in the wire format (avoids JS float
  precision), but parsed/serialised through `MoneyJsonCodec` to
  `BigDecimal` server-side.

## 10. Rate limits (default)

| Tier | Per-merchant | Per-user | Per-IP |
|---|---|---|---|
| Public auth | 10 / min | — | 60 / min |
| Read | 600 / min | 300 / min | — |
| Write | 120 / min | 60 / min | — |
| Webhooks in | 1200 / min | — | provider-IP only |

Implemented via Redis token bucket (`Redisson` `RRateLimiter`). Limits
configurable per merchant tier via `merchant.metadata.limits`.
