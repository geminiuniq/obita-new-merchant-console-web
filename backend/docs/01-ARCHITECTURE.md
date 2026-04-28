# 01 — Architecture

## 1. Architectural style

The backend uses a **layered hexagonal (ports-and-adapters) architecture**
mapped to Maven modules:

```
┌─────────────────────────────────────────────────────────────┐
│                      api  (Spring Boot)                     │
│  REST controllers · Security · Application services · DTOs  │
└──────────────────────────────┬──────────────────────────────┘
                               │ depends on
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌────────────────────┐    ┌──────────────┐
│   domain      │    │  infrastructure    │    │     db       │
│ aggregates +  │◀──▶│  MyBatis mappers,  │    │ Flyway SQL   │
│   ports       │    │  Redis, RocketMQ,  │    │  migrations  │
│ (interfaces)  │    │  chain adapters,   │    └──────────────┘
└──────┬────────┘    │  mock providers    │
       │             └────────────────────┘
       ▼
┌──────────────┐
│   common     │  ← Money, Result, ChainId, exceptions, IDs
└──────────────┘
```

### Why this layout

- **`domain`** has zero Spring / MyBatis / Redis imports. It can be tested
  without booting the framework, and the backend team can refactor adapters
  without touching business rules.
- **`infrastructure`** holds every "edge" of the system: DB, cache, MQ,
  blockchain RPC, custody, fiat ramp. Each edge is implemented as an adapter
  for a port (interface) declared in `domain`.
- **`api`** is the only module aware of HTTP, security, and Spring wiring. It
  is the **only entry point**; CLI / batch jobs would live as additional
  modules wired the same way.
- **`db`** is split off so the backend team can apply migrations independently
  of the application image (DBA workflow, blue/green, etc.).

### Dependency direction (strict)

```
api → infrastructure → domain → common
            ↓             ↑
            └─ implements ports ─┘
```

`domain` **never** depends on `infrastructure`. Cross this line and the build
will fail (enforced by Maven module deps + ArchUnit tests in `api/test`).

## 2. Module boundaries (business)

Inside `domain` and `infrastructure`, code is grouped by **bounded context**,
not by technical kind:

```
com.obita
├── identity        — merchants, users, auth tokens
├── account         — accounts, double-entry ledger
├── orders          — merchant orders + state machine + refunds
├── cashier         — payment intents, fiat ramp, settlement
├── vault           — wallet addresses, deposits, withdrawals
├── chain           — ChainAdapter abstraction + EVM/Tron/Solana impls
├── custody         — CustodyProvider port + Mock + Cobo/Safeheron stubs
├── ramp            — FiatRampProvider port + Mock + Circle/Banxa stubs
├── bridge          — BridgeProvider port (LayerZero/Wormhole stubs)
├── audit           — append-only audit log + AOP advice
├── idempotency     — Idempotency-Key handler
└── notification    — webhooks out + RocketMQ producers
```

A single bounded context spans all three layers — e.g.
`domain/orders/Order.java` (aggregate),
`infrastructure/orders/OrderMapper.java` (MyBatis),
`api/orders/OrderController.java` (REST).

## 3. Cross-cutting building blocks

| Concern | Implementation | Module |
|---|---|---|
| ID generation | UUID v7 (time-ordered) via `IdGenerator` | `common` |
| Money | `Money(amount: BigDecimal, asset: AssetCode)` value object — never `double` / `float` | `common` |
| Errors | `Result<T>` + `BusinessException` with stable error codes | `common` |
| Idempotency | `@Idempotent` annotation → AOP → `idempotency_key` table | `infrastructure/idempotency` |
| Audit | `@Audited` annotation → AOP → `audit_log` (append-only) | `infrastructure/audit` |
| Distributed lock | Redisson `RLock` wrapper | `infrastructure` |
| State machines | Spring StateMachine; one config per aggregate (Order, Withdrawal, PaymentIntent) | `domain` (rules) + `infrastructure` (persistence) |
| Outbox | `outbox_event` table → RocketMQ relay (transactional outbox pattern) | `infrastructure/notification` |
| Tracing | Micrometer + OpenTelemetry SDK; `traceId` in every log line | `api` |

## 4. Request lifecycle (canonical example: create order)

```
HTTP POST /v1/orders
  │
  ▼
[1] OrderController              — DTO validation, JWT principal extraction
  │
  ▼
[2] @Idempotent advice           — read Idempotency-Key, replay if hit
  │
  ▼
[3] OrderApplicationService      — orchestration, @Transactional
  │   ├─ load Merchant via MerchantRepository (port)
  │   ├─ build Order aggregate   — pure domain
  │   ├─ persist via OrderRepository (port)
  │   ├─ append OrderEvent      — state transition log
  │   └─ publish OrderCreated event via OutboxPublisher
  │
  ▼
[4] @Audited advice              — append audit_log row, same tx
  │
  ▼
[5] @Idempotent advice (after)   — store response under key
  │
  ▼
HTTP 201 + body
```

**Outbox dispatcher** (separate scheduler) reads pending `outbox_event` rows
and publishes to RocketMQ. Webhook deliverer subscribes to RocketMQ and
calls merchant URLs with HMAC-signed payloads.

## 5. Concurrency model

- **DB writes** that mutate balance / order status: **`SELECT ... FOR
  UPDATE`** + version column (optimistic-on-read, pessimistic-on-mutate).
- **Cross-aggregate workflows**: **Saga via RocketMQ events**, never
  distributed transactions.
- **Java 21 virtual threads** for any thread that mostly waits on I/O
  (chain RPC, custody webhooks, scanner) — set
  `spring.threads.virtual.enabled=true`.
- **Idempotency** is mandatory for every `POST` / `PATCH` / `DELETE`. The
  client supplies an `Idempotency-Key` header; the server stores `(merchant_id,
  key) → response` for 24h.

## 6. Deployment topology (target)

```
        ┌────────────┐         ┌──────────────┐
        │ Frontend   │  HTTPS  │  API gateway │ ── (mTLS / JWT)
        │ (SPA)      ├────────▶│  + WAF       │
        └────────────┘         └──────┬───────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                ▼                     ▼                     ▼
        ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
        │   api pods   │      │  scanner     │      │  outbox /    │
        │   (stateless)│      │  (per chain) │      │  webhook     │
        └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
               │                     │                     │
               └─────────────────────┼─────────────────────┘
                                     ▼
                ┌────────────────────┴───────────────────┐
                │        PostgreSQL (primary + replica) │
                │        Redis (sentinel)                │
                │        RocketMQ cluster                │
                └────────────────────────────────────────┘

                ┌────────────┐  ┌──────────────┐  ┌────────────┐
                │ Custody    │  │ Fiat Ramp    │  │ Chain RPC  │
                │ provider   │  │ provider     │  │ providers  │
                └────────────┘  └──────────────┘  └────────────┘
```

Three deployable units that share the same JAR:

| Unit | Profile | Role |
|---|---|---|
| **api** | `--spring.profiles.active=api` | REST + RPC (web tier) |
| **scanner** | `...=scanner` | Pulls blocks, writes deposits |
| **dispatcher** | `...=dispatcher` | Reads outbox, publishes events, delivers webhooks |

Splitting them lets the team scale write-heavy scanners independently from
the user-facing API.

## 7. What the MVP does *not* implement (scaffolded only)

- High-availability for the scanner (single-instance + leader election TBD).
- Real custody + ramp + bridge providers — only Mock impls + interface
  stubs.
- Sharding / partitioning of `ledger_entry`. Adequate for MVP load; the
  backend team should partition by `created_at` once volumes warrant it
  (the table is already append-only and trivially partitionable).
- Multi-region active-active. Single-region active-passive is enough.
- Advanced fraud / risk scoring — withdrawals have a `RISK_REVIEW` state
  and a `risk_score` column, but the rules are stubbed.
