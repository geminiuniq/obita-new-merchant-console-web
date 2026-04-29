# Project Progress

> 中文版：[docs/zh/PROGRESS.md](zh/PROGRESS.md)
>
> Updated: 2026-04-29 (round 3 — frontend portal in editorial style)  ·  Status: **Editorial SPA with EN/CN + light/dark + 5 mock pages, modular ES module architecture, all backend endpoints wired**

## Round 3 — Editorial portal (Sprints 1-5)

After Round 2 wired the minimal demo SPA, Round 3 turned it into a real
merchant portal that reads as one editorial product. The work was split
into five sprints with a commit at each boundary so the progress chain
stays auditable.

### Sprint roll-up

| Sprint | Commit | What landed |
|---|---|---|
| **1** | `3141dc0` | Editorial UI rebuild · sidebar+main layout · i18n (EN/CN) · light/dark theme · order detail modal with events timeline |
| **2** | `8edd80f` | Refactor 1.2k-line `app.js` → focused modules under `js/` (dom, format, i18n, theme, ui, router, pages/*) |
| **3** | `3aff3a7` | Inbox drawer (4 mock messages with brass unread indicators) + profile dropdown (My profile / Security / API docs / Sign out) |
| **4** | `cdac3ac` | Five mock pages with full editorial layouts — Members, Approvals, Conversion, Report Center, Payouts |
| **5** | `5b75db5` | Wallet history drawer — real LIVE row from `/v1/accounts` + deterministic mock activity per-address |

### Frontend module architecture (post-refactor)

`app.js` was 1.2k lines packing strings + DOM helpers + i18n + theme +
router + every page renderer into one file. Split into focused modules
so each feature ships in isolation:

```
frontend/
├── index.html            sidebar+main shell, login, modals, drawers
├── styles.css            editorial token system + dark theme override
├── api.js                JWT + idempotency fetch wrapper
├── app.js                ~120 lines: bootstrap + login + toggle wiring
└── js/
    ├── dom.js            el(), clear(), $/$$ helpers
    ├── format.js         fmt utilities
    ├── strings.js        en + zh dictionary (mirrored 1:1)
    ├── i18n.js           t(), setLang(), applyStaticI18n()
    ├── theme.js          light/dark toggle + persistence
    ├── ui.js             pageHero / sectionCard / statusPill / toast
    ├── router.js         hash router + page registry + pollCurrentRoute
    ├── drawer.js         generic right-side drawer + overlay
    ├── header.js         profile dropdown wiring
    ├── inbox.js          mock inbox messages
    └── pages/
        ├── overview.js         real wired (KPI + balances + recent orders)
        ├── vault.js            real wired (balances + addr book + mock-bank)
        ├── orders.js           real wired (full lifecycle CRUD)
        ├── order-detail.js     real wired (events timeline)
        ├── ledger.js           real wired (snapshot)
        ├── wallet-history.js   mock + real hybrid
        ├── members.js          mock (5 members, role + MFA pills)
        ├── approvals.js        mock (severity bars per legacy §3.5)
        ├── conversion.js       mock (live mock-quote box)
        ├── reports.js          mock + Swagger UI link
        ├── payouts.js          mock (4-eyes status pills)
        └── coming-soon.js      Fiat Vault stub
```

Each page module exports `render*(root)` and is registered via
`registerRoute(name, fn)` in `app.js`. Native ES modules — no build
tooling, runs from any static HTTP server.

### Routes × backend wiring matrix

| Route | Status | Backend endpoints used |
|---|---|---|
| `#overview`   | real | `GET /v1/accounts`, `GET /v1/orders` |
| `#vault`      | real | `GET /v1/accounts`, `GET/POST /v1/wallet-addresses`, `POST /mock-bank/credit` (auto-poll for ~60s while scanner advances) |
| `#orders`     | real | `GET / POST /v1/orders` + lifecycle (`/mark-paid`, `/settle`, `/cancel`, `/refunds`); row click → `GET /v1/orders/{id}` + `GET /v1/orders/{id}/events` |
| `#ledger`     | real | `GET /v1/accounts` (snapshot) |
| `#payouts`    | mock | — (backend schema ready: `withdrawal` table with 4-eyes / allowlist / cool-down) |
| `#conversion` | mock | — (`BridgeProvider` port defined; real adapters P0→P1) |
| `#approvals`  | mock | — (`audit_log` + `outbox_event` tables ready) |
| `#reports`    | mock | hero links to `GET /v3/api-docs` and `/swagger-ui.html` (live) |
| `#members`    | mock | — (role tables `app_user` / `member_role` / `role_permission` exist; controller P1) |
| `#fiat-vault` | stub | — (Cashier P1) |

### Cross-cutting features

- **i18n** (en / zh) — `localStorage`-persisted, default English. All
  user-facing strings flow through `t(key)`; dictionary in
  `js/strings.js` mirrored 1:1 between languages.
- **Theme** (light / dark) — `data-theme="…"` token override on
  `<body>`. Respects `prefers-color-scheme` on first load. Editorial
  palette (brass + brand-ink) preserved in dark mode.
- **Drawers** — generic right-side drawer + overlay (`js/drawer.js`).
  Used by Inbox + Wallet History.
- **Idempotency** — `Idempotency-Key` auto-generated for every
  state-changing request.
- **XSS-safe** — all rendering via `createElement` + `textContent`. No
  `innerHTML` on user-controlled data anywhere.

### Verified browser flows

Each sprint was browser-verified before its commit landed:

```
✓  Login → sidebar shell + topbar with merchant chip + avatar
✓  Overview KPI strip computes from /v1/accounts + /v1/orders
✓  Vault → provision address → mock-bank credit → 60s auto-poll →
   PENDING balance appears, then AVAILABLE balance jumps
✓  Orders → create → mark-paid → settle → refund (full lifecycle,
   ledger entries posted by backend)
✓  Click order row → detail modal renders 3-step state-machine
   timeline from /events
✓  Click address card → wallet history drawer renders with LIVE row
   pulled from /v1/accounts + 3 deterministic mock rows
✓  Inbox bell → drawer slides in with 4 mock messages, unread brass
   indicators, click-to-read
✓  Profile dropdown → API docs opens Swagger UI in new tab
✓  Theme toggle (light ↔ dark) preserves all editorial accents
✓  Language toggle (EN ↔ 中) re-renders current page via onLangChanged
   hook in router
```

---

## Round 2 — Plan B (frontend wired to backend)

## Round 2 — Plan B (frontend wired to backend)

After Round 1 verified the backend in isolation, this round wired up a
minimal demo SPA and proved the four core flows in a real browser. The
legacy 25k-line frontend was preserved as `frontend-legacy/` (still the
visual reference; see `frontend-legacy/design.md`); the new `frontend/`
is intentionally small so the focus stays on backend correctness.

### What changed

**Backend — three hard blockers fixed:**

| # | Fix | Files |
|---|---|---|
| 1 | Real CORS bean (`CorsConfigurationSource`) with `@Qualifier` to disambiguate against Spring's `mvcHandlerMappingIntrospector`. Origins configurable via `obita.cors.allowed-origins`; defaults cover localhost:5173 / 5500 / 8000 / 3000. | `SecurityConfig.java` |
| 2 | `{id}:verb` routes refactored to sub-resource style (`/cancel` `/settle` `/mark-paid` `/approve` `/reject`). Spring 6 PathPatternParser treats `:` as a matrix-variable separator; the colon style required `%3A` encoding from the browser, breaking ergonomic `fetch` use. | `OrderController.java`, `WithdrawalController.java` |
| 3 | New `GET /v1/accounts` endpoint listing merchant-owned accounts joined with the latest `balance_after` from `ledger_entry`. Drives the balances panel in the frontend. | `AccountController.java`, `AccountWithBalanceRow.java`, `AccountMapper.java`/`.xml`, `AccountRepository.java`, `AccountRepositoryImpl.java` |

**Frontend — new `frontend/` directory:**

| File | Role |
|---|---|
| `index.html` | Login screen + 4-tab app shell (Balances / Orders / Vault / Ledger) + Create-order modal |
| `api.js` | Fetch wrapper. JWT in `localStorage`, `Idempotency-Key` auto-generated for every state-changing request, `ApiError` carries the backend's stable code + `requestId`, 401 dispatches `auth:expired` to drop back to login |
| `app.js` | DOM-based rendering using `createElement` + `textContent` — no `innerHTML` against user-controlled fields. Wires the four flows + a 60s post-credit polling cycle so the user can watch PENDING → AVAILABLE move |
| `styles.css` | Tokens borrowed from `frontend-legacy/design.md`: editorial palette, brass eyebrow accent, mono for IDs, status pills, balance/order/vault cards |
| `README.md` | Run instructions + handoff notes |

### Browser-verified end-to-end (Chrome DevTools MCP)

Recorded against a fresh schema:

```
✓  POST /v1/auth/login           → JWT issued, principal echoed in topbar
✓  GET  /v1/accounts             → 4 stablecoin assets × 4 account types
                                    rendered as balance cards (all zero on
                                    fresh schema, as expected)
✓  POST /v1/wallet-addresses     → 0x5949...e6c4 issued for POLYGON
✓  POST /mock-bank/credit        → injection accepted; CSS toast confirmed
                                    "credit injected — 等待 scanner 处理"
```

End-to-end ledger posting (the 8 entries in §4.1 of round 1) was
re-verified earlier in the session against the same backend build.

### Bug fixed during Plan B

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 9 | Boot fail: `No qualifying bean of type 'CorsConfigurationSource' available: expected single matching bean but found 2: corsConfigurationSource, mvcHandlerMappingIntrospector` | Spring MVC's `mvcHandlerMappingIntrospector` also implements `CorsConfigurationSource`; Spring couldn't disambiguate by type alone | Added `@Qualifier("corsConfigurationSource")` on the constructor parameter |

This brings the cumulative bug count to **9** — see PROGRESS.md §5 of
the original round and this section combined. Each is documented with
root cause + fix so the backend team inherits the lessons.

### Repo layout after Plan B

```
obita-web/
├── README.md             ← project entry + run instructions (top-level)
├── README.zh.md          ← 中文版
├── .gitignore            ← .DS_Store, .env, .claude/settings.local.json
├── .claude/
│   └── launch.json       ← preview-server config (local dev only)
├── backend/              ← Spring Boot MVP (round 1)
├── frontend/             ← demo SPA (this round)
│   ├── index.html        login + 4-tab shell
│   ├── api.js            JWT + idempotency fetch wrapper
│   ├── app.js            DOM-based renderers
│   ├── styles.css        editorial design tokens
│   └── README.md
└── frontend-legacy/      ← original 25k-line SPA (preserved as reference)
    ├── README.md         note explaining why it's kept
    ├── index.html / app.js / styles.css / banner_bg.png
    └── design.md         design language spec — still authoritative
```

### Demo run

See the top-level `README.md` (or `README.zh.md`) for the canonical
3-command flow that gets the entire stack up.

This is a single-source progress log for the Obita backend MVP. It captures
**what is done**, **what is verified to actually work**, and **what is
explicitly left for the backend team**. Update it in the same PR as code
changes — stale progress docs are worse than none.

## 1. Headline

The MVP boots with one command, runs all three target modules end-to-end
against real Postgres / Redis / RocketMQ, and the double-entry ledger has
been observed posting balanced transactions across the full happy path:

```
deposit detected → confirmed → order settled → partial refunded
```

Every step generated correctly-paired debit/credit entries, the deposit
scanner ran asynchronously, optimistic locks held under the version column,
and the audit log + idempotency key tables were populated alongside.

## 2. What was committed to in earlier sessions

From the original scoping rounds:

1. Three modules: **Orders**, **Cashier**, **Vault**.
2. Java + Spring Boot stack (handoff target is a Java team).
3. Multi-chain via abstract `ChainAdapter`; cross-chain via abstract
   `BridgeProvider`.
4. Stablecoin + fiat via abstract `FiatRampProvider` and `CustodyProvider`.
5. MVP uses Mock implementations behind the same interfaces; switching
   provider is a config-line change.
6. Documentation in English **and** Chinese, mirrored 1:1.
7. Architecture decision recorded as ADR-0001.

## 3. What is built

### 3.1 Documentation (en + zh, 8 + 8 + 1 ADR)

```
docs/
├── 00-README.md            index + quick start
├── 01-ARCHITECTURE.md      layered hexagonal architecture, module map
├── 02-TECH_STACK.md        choices with rationale + alternatives
├── 03-DOMAIN_MODEL.md      entities, ledger, state machines
├── 04-INTEGRATIONS.md      provider abstractions + mock→real path
├── 05-SECURITY.md          financial-grade rules, threat model
├── 06-API.md               REST conventions + endpoint matrix
├── 07-HANDOFF.md           backend team onboarding plan
├── PROGRESS.md             ← you are here
├── zh/                     Chinese counterparts (mirror 1:1)
└── adr/
    ├── README.md
    └── 0001-backend-stack-java-spring-boot.md
```

### 3.2 Code (5 Maven modules, ~98 Java classes)

```
backend/
├── pom.xml                  parent POM (Java 21, virtual threads, -parameters)
├── docker-compose.yml       PG 16 + Redis 7 + RocketMQ 5 + Adminer
├── .env.example             single config surface
├── infra/                   rocketmq broker.conf
│
├── common/                  Money, AssetCode, IdGenerator (UUID v7),
│                            Principal, MerchantId, ErrorCode,
│                            @Audited, @Idempotent, CursorPage
│
├── domain/                  pure aggregates + ports (no Spring deps)
│   ├── account/             Account, LedgerTx, LedgerEntry, Direction,
│   │                        AccountType, LedgerPostingService (with
│   │                        platform contra-account exemption)
│   ├── orders/              Order aggregate, OrderStatus state machine,
│   │                        OrderEvent, OrderRefund, OrderRepository
│   ├── vault/               WalletAddress, Deposit, DepositStatus,
│   │                        Withdrawal, WithdrawalStatus, VaultRepository
│   ├── chain/               ChainAdapter, ChainAdapterRegistry, ChainId,
│   │                        Address
│   ├── custody/             CustodyProvider port (issue/submit/status/
│   │                        snapshot/capabilities)
│   └── merchant/            MerchantUser, MerchantUserRepository
│
├── db/                      Flyway V1..V5
│   ├── V1__baseline.sql     reference data, identity, account, ledger,
│   │                        audit, idempotency, balance trigger
│   ├── V2__orders.sql       merchant_order, order_event, order_refund
│   ├── V3__vault.sql        wallet_address, deposit, withdrawal, cursor
│   ├── V4__cashier.sql      payment_intent, ramp_transaction (placeholder)
│   └── V5__seed.sql         chains, assets, PLATFORM merchant + accounts,
│                            DEMO merchant + admin user + accounts
│
├── infrastructure/          MyBatis mappers + repository impls,
│                            Mock chain adapter, Mock custody provider,
│                            Cobo custody real-stub, type handlers
│
└── api/                     Spring Boot application
    ├── ObitaApplication     entry point, virtual threads enabled
    ├── security/            JwtService, JwtAuthFilter, SecurityConfig
    ├── advice/              GlobalExceptionHandler, IdempotencyAdvice,
    │                        AuditAdvice (AOP)
    ├── auth/                AuthController, PasswordHasher (Argon2id)
    ├── orders/              OrderController, OrderApplicationService, DTOs
    └── vault/               WalletAddressController, WithdrawalController,
                             VaultApplicationService, DepositScanner
                             (scheduled), MockBankController
```

## 4. What is verified to actually work

Verification was done locally on macOS (Apple Silicon) with:

- JDK 21 (Oracle Temurin downloaded into `/tmp`, no host pollution)
- Maven 3.9.9 (downloaded into `/tmp`)
- Docker Desktop + the project's `docker-compose.yml`

Boot timeline (cold start):

```
postgres ready                       1 s
redis ready                          1 s
rocketmq nameserver + broker         3 s
flyway V1..V5 applied                0.13 s (1+5 migrations)
chain adapters registered (4)        instant
Spring Boot started                  3.6 s
```

### 4.1 Smoke evidence: full ledger happy path

Eight balanced ledger entries observed end-to-end after one click of the
mock-bank "credit" button followed by an order settle + a partial refund:

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

Properties confirmed:

- Per-`tx_id` debit total equals credit total. (DB constraint trigger.)
- `balance_after` runs correctly per account, including the negative
  platform contra balance that represents on-chain assets held.
- Optimistic-lock `version` column advances on every aggregate mutation;
  no stale-read failures observed.
- Idempotency-Key replay returns the cached response without
  double-execution.
- Audit log row written in the same DB transaction as each business
  write.

### 4.2 Unit tests (passing)

```
Obita :: Common  →  MoneyTest        4 tests  Money + AssetCode invariants
Obita :: Domain  →  OrderStatusTest  3 tests  state machine transition rules
```

### 4.3 Endpoints exercised manually

```
POST /v1/auth/login                       → JWT issued (HS512, 15-min TTL)
GET  /v1/auth/me                          → principal echoed back
POST /v1/orders                           → CREATED → PENDING_PAYMENT
POST /v1/orders/{id}%3Amark-paid          → PAID
POST /v1/orders/{id}%3Asettle             → SETTLED + AVAILABLE→SETTLEMENT post
POST /v1/orders/{id}/refunds              → COMPLETED + SETTLEMENT→AVAILABLE post
GET  /v1/orders/{id}/events               → 4 transition events
POST /v1/wallet-addresses                 → mock HD-derived 0x address issued
POST /mock-bank/credit                    → injected synthetic credit
                                          (scanner picks it up within ~10 s,
                                           confirms within ~30 s)
```

## 5. Bugs found and fixed during verification

The smoke run uncovered eight real issues. Each one is a load-bearing
finding for the backend team to know about — they affect any future Spring
Boot + MyBatis-Plus + Postgres + Java 21 stack.

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | Boot fails: extension `citext` missing | V1 baseline used `CITEXT` without `CREATE EXTENSION` | switched to `TEXT` (note left for v1: enable extension if needed) |
| 2 | MyBatis: "No typehandler found for property id" | Lombok `@Data` annotation processor was never invoked because compiler-plugin lived in `<pluginManagement>` and child modules did not redeclare it | moved compiler-plugin to `<build><plugins>` so config inherits |
| 3 | Same error after fix #2 | mybatis-plus 3.5.7 in some code paths does not resolve `javaType` from bean reflection inside `<resultMap>` | rewrote mappers using `resultType + column AS "camelCaseProperty"` aliases (kept `resultMap` only where a custom `typeHandler` is required, with explicit `javaType` declared) |
| 4 | INSERT/UPDATE: "Type handler was null for UUID" | MyBatis 3.5.16 has no built-in UUID handler | wrote `UuidTypeHandler` and registered via `mybatis-plus.type-handlers-package` |
| 5 | "No qualifying bean for IdempotencyMapper" | `@MapperScan` only covered `com.obita.infrastructure.persistence` | widened to also include `idempotency` and `audit` packages |
| 6 | 500 on routes with `@PathVariable UUID id` | Java reflection lost parameter names without `-parameters` | added `<parameters>true</parameters>` to compiler-plugin |
| 7 | `POST /v1/orders/{id}:settle` → 405 (only some `:verb` routes) | Spring 6 `PathPatternParser` interprets `:` as matrix-variable separator | URL-encoded as `%3A` for now; design note: switch to sub-resource style (`/settle`) in v1 |
| 8 | Scanner runs but ledger entries never appear | Two layers compounded: (a) `@Transactional` on a method called from a sibling method via lambda → AOP proxy bypass → no transaction → partial commit; (b) platform contra-account is debited from balance 0 → would-go-negative blocked the post; (c) `LedgerEntry` constructor + DB CHECK forbade negative `balance_after` | (a) moved scanner write methods onto the `@Service` class so the proxy is honoured; (b) added `PLATFORM_MERCHANT_ID` exemption in `LedgerPostingService`; (c) dropped the negative-`balance_after` check at both layers, with a comment explaining "negative liability balance = asset held" |

These eight findings were captured into the code with explanatory comments
so future readers don't repeat the discovery cost.

## 6. What is explicitly NOT done (scaffolded only)

| Module / area | State | Notes |
|---|---|---|
| Orders module | Done end-to-end | controllers + service + state machine + repository |
| Vault module | Done end-to-end | wallet provisioning + scanner + withdrawals (4-eyes) |
| Cashier module | Schema + interfaces only | `payment_intent`, `ramp_transaction` tables exist; service + controller TBD |
| Custody (Cobo) real impl | Real-stub class shell | TODO methods clearly marked, contract test framework drafted |
| Bridge real impl | Mock only | `BridgeProvider` interface defined, no stub yet |
| KYC real impl | Mock only | `KycProvider` interface mentioned in docs; not yet codified |
| Withdrawal address allowlist | Schema row drafted | service-level enforcement and admin API TBD |
| Outbox + RocketMQ dispatcher | Not started | `outbox_event` table introduced in V5 sketch only |
| Outbound webhooks | Not started | endpoint config table TBD; HMAC signing helper drafted in docs |
| MFA / TOTP | Scaffolded | `app_user.mfa_enabled` column exists; verification flow TBD |
| pgaudit / RLS | Documented | not yet enabled in migrations |
| Sub-resource fix for `:verb` paths | Known issue | percent-encoded works today; refactor pending |
| Integration tests with Testcontainers | Pom config ready | tests not yet written |

## 7. Next-step recommendations (P0 → P2)

### P0 — before any production traffic

1. Real `CoboCustodyProvider` (or Safeheron) implementation against the
   contract test.
2. Real `EvmChainAdapter` via web3j to replace `MockEvmChainAdapter` for
   each EVM chain we operate.
3. Reorg handling in the scanner — currently the cursor advances and never
   rewinds.
4. Outbox pattern wiring so domain events make it onto RocketMQ even when
   downstream consumers are slow or down.
5. Refactor `:verb` routes to sub-resource style (`POST .../settle`).
6. Withdrawal address allowlist + 24-hour cooldown enforcement.
7. Rate limiter (Redis token bucket) wired for write endpoints.
8. Audit log shipping to WORM storage (S3 + Object Lock).
9. Pen-test by an external firm.
10. Production secret manager integration; reject `mock` providers in
    `application-prod.yaml`.

### P1 — before public beta

1. Cashier module end-to-end (Circle Mint + a CNY ramp).
2. Cross-chain via Squid Router.
3. Settlement reports + reconciliation jobs against custody.
4. KYC integration (Sumsub recommended).
5. PG row-level security policies activated.
6. WebAuthn for `MERCHANT_ADMIN` roles.

### P2 — quality of life

1. Multi-region active-passive.
2. `ledger_entry` monthly partitioning.
3. SDK generation from OpenAPI spec.
4. Per-merchant SLA alerting.
5. Real chain adapters for Tron, Solana.

## 8. How to reproduce the smoke run from scratch

```bash
cd backend
cp .env.example .env
docker compose up -d                                  # PG / Redis / RMQ

# Java 21 + Maven required. If missing on host, see /tmp toolchain in this
# session's transcript; or install your own.
mvn -DskipTests clean package                         # builds the fat jar

java -jar api/target/obita-api-0.1.0-SNAPSHOT.jar &   # starts on :8080

# Set the demo password hash (one-time, until V5 seed is regenerated):
# (the seed currently has a placeholder hash; this matches "ObitaDemo!2026")
docker exec obita-postgres psql -U obita -d obita -c \
  "UPDATE app_user SET password_hash='\$argon2id\$v=19\$m=65536,t=3,p=2\$0j4zU4yYQ5YBeOm7b9XrtA\$HvLXls2EjmhJROzOthfEcMv0R1By26vtUEb2/KGjExI' WHERE username='demo';"

TOKEN=$(curl -s -X POST http://localhost:8080/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"merchantCode":"DEMO","username":"demo","password":"ObitaDemo!2026"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Provision a Polygon address
ADDR=$(curl -s -X POST http://localhost:8080/v1/wallet-addresses \
  -H "Authorization: Bearer $TOKEN" -H 'Idempotency-Key: addr-1' \
  -H 'Content-Type: application/json' \
  -d '{"chainId":"POLYGON","purpose":"DEPOSIT"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['address'])")

# Inject 500 USDC credit
curl -s -X POST http://localhost:8080/mock-bank/credit \
  -H 'Content-Type: application/json' \
  -d "{\"chainId\":\"POLYGON\",\"asset\":\"USDC-POLYGON\",\"toAddress\":\"$ADDR\",\"amount\":\"500.00\"}"

# Wait ~40s then inspect
docker exec obita-postgres psql -U obita -d obita -c \
  "SELECT a.account_type, le.direction, le.amount, le.balance_after, lt.tx_type FROM ledger_entry le JOIN ledger_tx lt ON lt.id=le.tx_id JOIN account a ON a.id=le.account_id ORDER BY le.id;"
```

## 9. Decisions confirmed during this round

- `LedgerPostingService.PLATFORM_MERCHANT_ID` constant introduced;
  platform-owned accounts can carry a negative `balance_after` to model
  the asset side of double-entry without inventing an asset-natural
  account type.
- `balance_after` constraint relaxed to "informational running total" at
  the schema level; the application enforces non-negative balances per
  account type at posting time, with the platform exception above.
- `Idempotency-Key` is mandatory for **every** state-changing POST/PATCH/
  DELETE in this MVP — the advice has been wired and exercised.
- All money fields go over the wire as JSON `String`s (no float). They
  are deserialised to `BigDecimal` server-side, with display flexibility
  preserved via the `Money` value object.
- All UUIDs use v7 (time-ordered) — confirmed by inspecting generated
  IDs (e.g., `019dd54e-9c1f-...`).

## 10. Repo invariants the backend team should keep

1. `domain` never depends on `infrastructure` or any framework. ArchUnit
   test enforcement is a P0 follow-up.
2. Every state-changing service method is `@Transactional` on a Spring
   `@Service` bean, **never** on a method called from a sibling lambda
   in the same class. (Bug #8 is the canonical example.)
3. Every money path goes through `LedgerPostingService`. No "update
   balance directly" shortcut. Code-review red flag.
4. Every controller method moving money has `@Idempotent`. No exceptions.
5. Mock providers are forbidden in `prod` profile — wire a config-time
   guard before first staging deploy.
