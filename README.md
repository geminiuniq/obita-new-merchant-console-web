# Obita

> 中文：[README.zh.md](README.zh.md)

Web2 + Web3 merchant portal — multi-chain stablecoin custody, fiat
on/off-ramp, double-entry ledger. MVP-stage codebase intended for handoff
to a Java backend team.

## Repo layout

```
obita-web/
├── backend/              Spring Boot 3.3 + Java 21 MVP — full source +
│                         docker-compose + 16 markdown docs (en/zh) + ADRs
├── frontend/             Minimal demo SPA (vanilla HTML/JS/CSS) wired to
│                         the backend, used to prove the four flows in a
│                         real browser. Replaces nothing — see frontend-legacy.
├── frontend-legacy/      Original 25k-line SPA preserved as the visual /
│                         design language reference (design.md is still
│                         authoritative)
└── docs                  All documentation lives in backend/docs/.
                          Start with backend/docs/00-README.md.
```

## Status

- **Backend**: end-to-end verified locally — Orders module + Vault module
  fully wired; Cashier scaffolded. 8 balanced ledger entries observed
  across deposit → settle → refund. See
  [`backend/docs/PROGRESS.md`](backend/docs/PROGRESS.md).
- **Frontend**: minimal demo SPA, browser-verified login + balances +
  vault deposit injection.
- **Documentation**: 8 + 8 + 1 ADR docs, en/zh mirror — see
  [`backend/docs/00-README.md`](backend/docs/00-README.md) for the
  index. Latest progress in
  [`backend/docs/PROGRESS.md`](backend/docs/PROGRESS.md).

## Run the full stack locally

You need: **Docker**, **Java 21**, **Maven 3.9+**, **Python 3** (only
for the static frontend server — any HTTP server works).

```bash
# 0. Clone and enter the repo
cd obita-web

# 1. Backend infrastructure (PG 16 + Redis 7 + RocketMQ 5 + Adminer)
cd backend
cp .env.example .env
docker compose up -d
# Wait ~5s for Postgres healthcheck

# 2. Build + run the backend (~4s cold start)
mvn -DskipTests clean package
java -jar api/target/obita-api-0.1.0-SNAPSHOT.jar &
# Health: http://localhost:8080/actuator/health → {"status":"UP"}

# 3. Set the demo password hash one-time (until V5 seed regenerates)
docker exec obita-postgres psql -U obita -d obita -c \
  "UPDATE app_user SET password_hash='\$argon2id\$v=19\$m=65536,t=3,p=2\$0j4zU4yYQ5YBeOm7b9XrtA\$HvLXls2EjmhJROzOthfEcMv0R1By26vtUEb2/KGjExI' WHERE username='demo';"

# 4. Frontend static server
cd ../frontend
python3 -m http.server 5173
```

Open **http://localhost:5173** and log in:

| Field | Value |
|---|---|
| Merchant code | `DEMO` |
| Username | `demo` |
| Password | `ObitaDemo!2026` |

(All three are pre-filled.)

## What to do once you're logged in

The four-tab UI maps 1:1 to the backend modules:

1. **资金 · 余额 (Balances)** — `GET /v1/accounts`. Shows AVAILABLE /
   PENDING / RESERVED / SETTLEMENT for each stablecoin. All zero on a
   fresh schema until you inject a deposit.

2. **订单 (Orders)** — `GET / POST /v1/orders` and the lifecycle action
   buttons. Try this:
   - Click **新建订单** → fill in → submit. Order goes
     `CREATED → PENDING_PAYMENT`.
   - Click **标记已支付** → `PAID`.
   - Click **结算** → `SETTLED` + posts an `AVAILABLE → SETTLEMENT`
     ledger entry pair.
   - Click **退款** → enter an amount → posts the reverse entries.

3. **保险柜 · 入金 (Vault)** — the headline demo:
   - Provision a POLYGON address (one click).
   - Inject a synthetic on-chain credit via `/mock-bank/credit`.
   - Wait ~10s — `DepositScanner` detects it and posts
     `LIABILITY → PENDING` (entries 1 & 2).
   - Wait ~30s more — confirmations reach 12, the deposit moves to
     `CREDITED` and posts `PENDING → AVAILABLE` (entries 3 & 4). The UI
     polls automatically; balances update.

4. **分录流水 (Ledger)** — snapshot of each account's current
   `balance_after`. For the full per-tx feed in the meantime, query
   Postgres directly:

   ```bash
   docker exec obita-postgres psql -U obita -d obita -c \
     "SELECT a.account_type, le.direction, le.amount, le.balance_after,
             lt.tx_type, lt.memo
        FROM ledger_entry le
        JOIN ledger_tx lt ON lt.id = le.tx_id
        JOIN account a    ON a.id = le.account_id
       ORDER BY le.id;"
   ```

Expected result after a 500-USDC deposit + 100-USDC order settle +
30-USDC refund (8 balanced entries):

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

Per-`tx_id` debit total equals credit total (DB constraint trigger
enforces this at commit). The negative balance on
`PLATFORM SETTLEMENT` correctly represents on-chain assets the platform
holds — see
[`backend/docs/03-DOMAIN_MODEL.md`](backend/docs/03-DOMAIN_MODEL.md)
§ 4 for the rationale.

## Useful URLs

| URL | What |
|---|---|
| http://localhost:5173 | Frontend demo |
| http://localhost:8080/swagger-ui.html | Auto-generated OpenAPI UI |
| http://localhost:8080/v3/api-docs | OpenAPI JSON spec |
| http://localhost:8080/actuator/health | Backend health |
| http://localhost:8080/actuator/prometheus | Metrics |
| http://localhost:18080 | RocketMQ Dashboard |
| http://localhost:18081 | Adminer (DB browser, server `postgres`, user `obita`, pwd `obita_dev_pwd`, db `obita`) |

## Ports / passwords (local dev only)

| Service | Port | Credentials |
|---|---|---|
| Postgres | 5432 | obita / obita_dev_pwd / db `obita` |
| Redis | 6379 | password `obita_dev_pwd` |
| RocketMQ namesrv | 9876 | — |
| RocketMQ broker | 10911 | — |
| RocketMQ proxy | 8081 | — |
| RocketMQ Dashboard | 18080 | — |
| Adminer | 18081 | preconfigured to PG |
| Backend API | 8080 | JWT on `/v1/auth/login` |
| Frontend | 5173 | static — any HTTP server works |

All ports bind to `127.0.0.1` only. Production secrets live in a
secret manager — see
[`backend/docs/05-SECURITY.md`](backend/docs/05-SECURITY.md).

## Common operations

```bash
# Reset the schema (re-runs Flyway V1..V5 + reseeds DEMO + PLATFORM)
docker exec obita-postgres psql -U obita -d obita -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO obita;"
# … then restart the backend so Flyway re-applies + reset demo password (step 3)

# Stop everything
pkill -f "obita-api-0.1.0"
cd backend && docker compose down

# Wipe data volumes (destructive)
docker compose down -v

# Tail backend logs
tail -f /tmp/obita-app.log

# Tail PG queries
docker logs -f obita-postgres
```

## Where to read next

| If you're a… | Start with |
|---|---|
| New backend dev | [`backend/docs/00-README.md`](backend/docs/00-README.md) → Architecture → Domain Model |
| Tech lead | [`backend/docs/02-TECH_STACK.md`](backend/docs/02-TECH_STACK.md) and [`backend/docs/adr/0001-...`](backend/docs/adr/0001-backend-stack-java-spring-boot.md) |
| Custody / Web3 dev | [`backend/docs/04-INTEGRATIONS.md`](backend/docs/04-INTEGRATIONS.md) |
| Project lead taking over | [`backend/docs/PROGRESS.md`](backend/docs/PROGRESS.md) (current state, what's verified, what's next) and [`backend/docs/07-HANDOFF.md`](backend/docs/07-HANDOFF.md) |
| Designer / frontend lead | [`frontend-legacy/design.md`](frontend-legacy/design.md) (still authoritative) |
