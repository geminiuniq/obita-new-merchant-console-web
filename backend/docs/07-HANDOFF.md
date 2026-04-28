# 07 — Handoff Plan

This document is for the backend team taking over the MVP and bringing it
to production.

## 1. What you receive

| Artefact | Status at handoff |
|---|---|
| `backend/pom.xml` + 5 modules | ✅ Compiles, builds a runnable jar |
| `docker-compose.yml` | ✅ One-command local stack |
| `db/.../V1..V3__*.sql` | ✅ Schema for identity / ledger / orders / vault |
| `db/.../V4__cashier.sql` | 🚧 Stubbed — see [03-DOMAIN_MODEL.md §7](03-DOMAIN_MODEL.md) |
| `domain/` ports & aggregates | 🚧 Skeleton; key interfaces drafted |
| `infrastructure/*/mock/*Provider` | 🚧 Mock providers for custody / ramp / bridge |
| `infrastructure/*/<vendor>/*Provider` | 🚧 Class shells with TODOs |
| `api/` controllers | 🚧 Outline only — see endpoint matrix |
| Spring Security + JWT | 🚧 Login flow mapped, MFA scaffolded |
| `docs/` 00–07 | ✅ This document set |
| OpenAPI spec | 🚧 Generated when API is wired |
| Test suite | 🚧 Ledger invariant tests + Mock provider contract tests |

✅ = ready to use. 🚧 = scaffolded; needs implementation work.

## 2. First-week onboarding

Day 1
- Read [00–07] in order.
- `git clone`, `cp .env.example .env`, `docker compose up -d`, run
  `mvn verify`.
- Smoke test: `POST /v1/auth/login` against the seeded merchant
  (`merchant.code='DEMO'`, user `demo/demo`).

Day 2
- Read [V1__baseline.sql] line by line. Match it to
  [03-DOMAIN_MODEL.md §4 Account & ledger]. Run the constraint trigger
  test (`LedgerInvariantTest`).
- Trace one request end-to-end: `POST /v1/orders` →
  `OrderApplicationService.createOrder` → `OrderRepository.save` →
  `outbox_event` → `RocketMQ` → outbound webhook.

Day 3
- Pick one provider. Inspect `MockCustodyProvider` and the empty
  `CoboCustodyProvider` shell. Read the Cobo Custody API docs side by
  side.
- Run `mvn test -Dgroups=contract -Dtest='*CustodyContractTest'`.

Day 4
- Implement one TODO method in `CoboCustodyProvider`. Add a contract
  test. Switch the profile in your local `.env` and rerun the smoke
  flow.

Day 5
- Pair on the **first real chain integration** (recommend BSC testnet —
  cheap, fast, USDT/BEP-20 widely available). Run the scanner against a
  funded testnet address.

## 3. Backlog (priority order)

### P0 — must ship before any production traffic

1. **Real custody integration** (`CoboCustodyProvider`).
2. **Real EVM scanner** + reorg handling (currently rough; needs the
   `ChainCursor` rewind logic on reorg).
3. **Withdrawal risk rules** beyond "amount > limit".
4. **OFAC / chain-analytics screening** on deposit & withdrawal addresses.
5. **Audit log shipping to WORM storage** (S3 + Object Lock). DB rows
   alone are not compliant.
6. **MFA enforcement for `MERCHANT_ADMIN`**. (TOTP scaffolded.)
7. **Rate-limit policy review + production tuning**.
8. **Outbound webhook signing key rotation flow.**
9. **Alerting wiring** — the metric definitions exist, but Prometheus
   rules are not yet committed.
10. **Disaster recovery runbook** (RPO / RTO targets, backup test).

### P1 — should ship before public beta

1. Real fiat ramp integration (Circle Mint for USDC, PingPong for CNY).
2. KYC integration (Sumsub recommended).
3. Cross-chain via Squid Router.
4. Settlement reports + reconciliation jobs against custody.
5. Refund partial-amounts UX in dashboard (backend done in V2).
6. PG row-level security policies activated.
7. Pen-test by an external firm.

### P2 — nice to have

1. WebAuthn for high-tier merchants.
2. Multi-region active-passive.
3. `ledger_entry` partitioning by month.
4. SLA-based alerting per merchant tier.
5. SDKs (TypeScript + Java) generated from OpenAPI.

## 4. How to swap a provider safely

The standard procedure (custody is the example; ramp / bridge are the
same pattern):

1. **Implement** the real adapter against the contract test
   (`CustodyContractTest`). All assertions must pass.
2. **Stage it** in a non-production environment with the new provider's
   sandbox credentials.
3. **Reconciliation** — run `POST /v1/admin/custody/reconcile` to confirm
   the DB rows match the provider snapshot.
4. **Shadow mode** (P0 to add) — for 24h, the old + new providers both
   receive every command; only the old one's response is acted on; we
   log mismatches.
5. **Cutover** — flip `obita.custody.provider` in config, deploy.
6. **Fallback plan** — keep the old provider config wired for 7 days.

## 5. Risks the backend team will inherit

| Risk | Severity | Mitigation now / later |
|---|---|---|
| Mock providers ship to prod by accident | High | `application-prod.yaml` rejects `mock` providers via `@Validated` config; CI deploy-gate checks |
| Ledger trigger overhead at scale | Medium | Partition `ledger_entry`; trigger remains O(rows-per-tx) |
| Reorg longer than `confirmations` | High | Tune `chain.confirmations` per chain; design reverse-credit flow now (interface drafted, impl TBD) |
| Provider API change | Medium | Contract tests catch on every nightly run |
| RocketMQ message loss | High | Outbox pattern + manual ack + `dead_letter_event` |
| Time skew on JWT / webhook signatures | Low | NTP everywhere; ±5min tolerance documented |
| Postgres long-running tx blocks ledger | High | Statement timeout = 5s; long jobs use cursor + small batches |

## 6. Local-to-prod migration checklist

When the backend team is ready to run a staging environment:

- [ ] Replace `obita_dev_pwd` everywhere via secret manager.
- [ ] Replace `OBITA_AUTH_JWT_SECRET` with a 64-char random string from
      `openssl rand -base64 64`.
- [ ] Change `OBITA_AUTH_PASSWORD_PEPPER` (and rotate users — they
      need to re-set passwords; cheap if user count is small at handoff).
- [ ] Configure `application-prod.yaml`:
      - `spring.datasource.url` to managed Postgres,
      - `spring.data.redis.*` to managed Redis,
      - `rocketmq.name-server` to managed RocketMQ,
      - `obita.*.provider` to non-mock values,
      - `management.endpoints.web.exposure.include=health,info,prometheus`.
- [ ] CI deploy-gate: refuse to deploy if any `mock` provider is active.
- [ ] Add `pgaudit` to the managed Postgres parameter group.
- [ ] Run `mvn -pl api flyway:migrate` against staging DB.
- [ ] Seed reference data (`chain`, `asset`, `merchant.code='PLATFORM'`).
- [ ] Smoke run the full E2E test against staging.

## 7. Decisions parked for the backend team

These are explicitly **not** decided in MVP — to be decided by the
team based on real load and cost data:

- **Sharding strategy** for `ledger_entry` (suggest monthly partitions).
- **Cold storage policy** for old orders / withdrawals (S3 + JSON dump
  vs Postgres archive table).
- **GDPR / PIPL erasure**: `merchant.code` retention vs PII fields.
  We've kept PII out of `merchant` itself, but `audit_log.payload` may
  contain incidentals — needs a redaction job.
- **Multi-region**: cost vs RPO. Default plan is single-region active +
  cross-region read replica for DR only.
- **Real-time fraud signals**: rules engine vs ML.
- **Risk-weighted holding** of stablecoins (treasury policy) — the
  ledger supports it, the UI doesn't yet.

## 8. Decision log links

When the team makes a divergent decision, log it as an ADR (architecture
decision record) under `docs/adr/NNNN-title.md`. Format suggestion:

```
# ADR-0001 — Switch from RocketMQ to Kafka

Date: 2026-MM-DD
Status: accepted

## Context
...
## Decision
...
## Consequences
...
```

Keep this doc set living. Whenever a docs claim becomes stale because of
real-world ops experience, **update the doc in the same PR** as the code
change. Stale docs are worse than no docs.
