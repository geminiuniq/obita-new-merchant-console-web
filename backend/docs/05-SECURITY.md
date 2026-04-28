# 05 — Security (Financial-Grade)

This is the document the backend team must read first. Treat every rule as
non-optional unless explicitly waived in writing by the security lead.

## 1. Threat model in scope

| # | Threat | Mitigation owner |
|---|---|---|
| T1 | Account takeover (credential stuffing, phishing) | auth + WAF |
| T2 | Replay of capture / refund / withdrawal requests | idempotency + signed body |
| T3 | Race-condition double-spend on balance | DB lock + ledger |
| T4 | Compromised internal service signs withdrawal | custody + 4-eyes + risk rules |
| T5 | DB tampering of audit / ledger | append-only triggers + WORM backup |
| T6 | Webhook spoofing from "provider" | HMAC + timestamp + IP allowlist |
| T7 | Reorg / dust / blacklisted address deposit | scanner + chain confirmations + sanctions list |
| T8 | Rate-limit / DoS | per-merchant + per-IP rate limits at gateway |
| T9 | Secret leak in code / logs | secret manager + log scrubber |
| T10 | Dependency CVE | dependency-check + Renovate + pinned versions |

Out-of-scope at MVP: insider exfil from production DB (mitigated by RBAC
+ pgaudit, but not covered by an automated check), phishing of merchants
themselves, DDoS at the network layer.

## 2. Authentication

### 2.1 Password hashing
- **Argon2id**, parameters: `memory=65536, iterations=3, parallelism=2`
  (OWASP 2024 baseline). Stored as `$argon2id$v=19$...` strings.
- A per-instance **pepper** added before hashing (env var
  `OBITA_AUTH_PASSWORD_PEPPER`). Lost-pepper requires forced rotation, by
  design.

### 2.2 JWT
- **Access token**: HS512-signed JWT, 15 min TTL. Carries
  `sub`, `mid` (merchantId), `roles[]`, `jti`.
- **Refresh token**: opaque random 256-bit string, stored hashed in Redis
  with 14-day TTL; rotates on every refresh (refresh-token rotation +
  reuse detection).
- **Storage**: refresh in `httpOnly; Secure; SameSite=Strict` cookie;
  access in-memory only (front-end re-acquires via refresh on reload).
- **Revocation**: `jti` denylist in Redis until natural expiry.
- **Secret rotation**: signing key rotates monthly with a 24h overlap
  (kid in JWT header).

### 2.3 MFA (scaffolded, not enabled by default)
- TOTP (RFC 6238). The `app_user.mfa_enabled` flag controls challenge
  on each login.
- WebAuthn is the post-MVP target.

## 3. Authorization

- **Role-based**: `MERCHANT_OPERATOR`, `MERCHANT_ADMIN`, `RISK_REVIEWER`,
  `PLATFORM_ADMIN`. Enforced via `@PreAuthorize` on application services.
- **Tenant isolation**: every read/write is scoped by `merchant_id` from
  the JWT. The `MerchantTenantInterceptor` rejects any service call that
  receives a different merchant id than the one in the principal.
- **4-eyes principle** on:
  - Withdrawal approval (different user from requester),
  - Manual ledger adjustment (always by `PLATFORM_ADMIN`, two-step),
  - Refund above a configurable threshold.
- **Postgres row-level security**: defined as a hardening layer for v1.
  The MVP relies on application-level checks but the policies are
  drafted in `db/.../policies.sql` (not yet active).

## 4. Money safety rules (the seven commandments)

These are non-negotiable for anyone touching money paths:

1. **Use `BigDecimal` always.** `double` / `float` are forbidden in any
   class with `Money`, `Order`, `Withdrawal`, `Ledger`, or `Balance` in
   its name. ArchUnit test will fail the build.
2. **Round half-even with explicit precision.** Define `RoundingPolicy`
   per asset; centralise in `MoneyMath`. Never call `BigDecimal.divide`
   without scale + rounding.
3. **All money flows go through the ledger.** No "update balance directly"
   shortcut, ever. Code review red flag.
4. **Wrap multi-step money ops in a single DB tx.** If you can't, use
   the outbox + saga pattern, never best-effort.
5. **Lock before read-modify-write.** `SELECT ... FOR UPDATE` on the
   account row before posting; combine with the version column.
6. **Idempotency-Key on every `POST` that moves money.** Deduplicate
   server-side. Different body for same key → 422.
7. **Never log money fields at INFO.** Use `MoneyLogFormatter` which
   zeros out lower digits at INFO and only restores them at DEBUG with a
   special token.

## 5. Idempotency

- Header: `Idempotency-Key: <128-char ASCII>`.
- Server stores `(merchant_id, key) → request_hash + response`.
- Reuse with same body → return cached response.
- Reuse with different body → `422 IdempotencyKeyConflict`.
- TTL: 24h.
- Endpoints that **must** require it: any `POST` / `PATCH` that creates,
  updates, or moves money. Read endpoints don't.

## 6. Webhook security (inbound)

For every provider that calls us:

1. **HMAC verify**: `Webhook-Signature` header signed with a
   provider-specific shared secret stored in vault.
2. **Timestamp check**: `Webhook-Timestamp` within ±5 minutes; reject
   stale.
3. **Replay protection**: store `Webhook-Id` for 7 days; reject duplicates.
4. **IP allowlist**: provider's published IP ranges, enforced at WAF.
5. **No early ack**: only respond `200` after we've persisted the event
   (write to `webhook_event` table within the request handler).

## 7. Webhook signing (outbound)

When we notify the merchant:

```
X-Obita-Signature: t=<ts>,v1=<base64-hmac-sha256(secret, t + '.' + body)>
X-Obita-Webhook-Id: <uuid>
X-Obita-Event-Type: order.paid
```

The merchant verifies with the secret printed in their dashboard. Rotate
secret with a 7-day overlap.

## 8. Withdrawal-specific controls

In addition to the generic rules:

- **Address allowlist**: a merchant may only withdraw to addresses they
  have pre-registered (24h cooling period after add).
- **Velocity limits**: per-tier daily and weekly caps; soft warn at 50%
  of cap.
- **Sanctions screen**: query `OFAC` / chain-analytics provider per
  request (Mock today, real provider in v1).
- **Risk score**: simple rules in MVP — large amount + new address +
  off-hours → `RISK_REVIEW`.
- **Cool-down on first-time recipient**: optional 30-min delay for new
  addresses for tier-2+ merchants.

## 9. Secrets management

- **Never** commit `.env`, keys, or seed phrases. CI runs `gitleaks` on
  every PR.
- Local dev secrets are weak by design (`obita_dev_pwd`) and bound to
  `127.0.0.1`.
- Production: cloud secrets manager (AWS Secrets Manager / Aliyun KMS /
  Vault). The application reads via `spring.config.import=aws-secrets:`.
- Custody API keys are scoped to the production gateway's egress IP only.

## 10. Logging hygiene

- **Never log**: passwords, JWTs (full), refresh tokens, custody keys,
  PII (national ID, full bank account number).
- **Truncate by default**: bank accounts as `****1234`, addresses as
  `0xabc...d1234`.
- **PII filter**: `LogFilter` strips known-sensitive headers/body keys
  via configurable allowlist (everything not on the list is `[REDACTED]`).
- **Log retention**: 90 days hot, 1 year cold (S3 glacier). Audit log: 7
  years.

## 11. Observability

- Every request has a `X-Request-Id` (in if provided, generated otherwise).
- `traceId` (W3C `traceparent`) flows through HTTP and into RocketMQ
  message headers.
- Metrics by Micrometer; Prometheus scrape.
- Alert rules:
  - Withdrawal failure rate > 1% in 5 min,
  - Deposit detection latency > expected confirmations × 2,
  - Idempotency hit rate jump (likely client bug or replay attempt),
  - 5xx rate > 0.5% per merchant.

## 12. Data classification

| Class | Examples | Storage rule |
|---|---|---|
| Public | merchant code, asset codes | OK to log |
| Internal | merchant id, user id | OK to log; never expose externally |
| Confidential | balances, order amounts | Audit on read; mask in logs at INFO |
| Restricted | password hash, refresh token, custody key | Never log; encrypted at rest; minimal access |

## 13. Pre-commit / CI security checks

- `spotless` formatting + import order (uniform diff for review).
- `gitleaks` on staged files in pre-commit, full repo in CI.
- `dependency-check` (OWASP) weekly + on every release branch.
- `archunit` tests:
  - no `double`/`float` in money packages,
  - `domain` doesn't import `org.springframework.*`,
  - controllers must have `@PreAuthorize`.
- `pmd` ruleset for crypto/SQL injection patterns.

## 14. Incident response (placeholder)

The MVP doesn't define a formal IR runbook — that's an early v1 task.
Minimum viable today:
- On-call rotation drafted in `docs/oncall.md` (TBD by the team).
- Severity matrix and pager threshold drafted but not wired.
- Withdrawal halt switch: `POST /admin/halt` flips a Redis flag that
  every withdrawal service reads pre-action. **Implemented**.
