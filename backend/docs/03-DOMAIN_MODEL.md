# 03 — Domain Model

This document is the **logical schema + state machine spec**. The Flyway
migrations under `db/src/main/resources/db/migration` are the executable
form. When they disagree, this doc is the spec — open a migration PR to
realign.

## 1. Entity map

```
              ┌────────────┐
              │  merchant  │
              └─────┬──────┘
        ┌──────────┼──────────┬─────────────┐
        ▼           ▼          ▼             ▼
┌──────────┐  ┌──────────┐ ┌──────────────┐ ┌──────────────┐
│ app_user │  │ account  │ │  merchant_   │ │ wallet_      │
│  (auth)  │  │          │ │   order      │ │ address      │
└──────────┘  └────┬─────┘ └──────┬───────┘ └──────┬───────┘
                   │              │                │
                   ▼              ▼                ▼
           ┌──────────────┐  ┌────────────┐   ┌──────────┐
           │ ledger_tx    │  │order_event │   │ deposit  │
           │ ledger_entry │  │order_refund│   │withdrawal│
           └──────────────┘  └────────────┘   └──────────┘

reference / config:
   chain  ·  asset  ·  audit_log  ·  idempotency_key  ·  outbox_event
```

## 2. Reference data

### `chain`
| Column | Notes |
|---|---|
| chain_id (PK) | `ETH`, `BSC`, `POLYGON`, `ARB`, `OP`, `BASE`, `TRON`, `SOL` |
| family | `EVM` / `TRON` / `SOLANA` / `BTC` |
| network | `mainnet` / `testnet` |
| confirmations | min confirmations before crediting a deposit |

### `asset`
| Column | Notes |
|---|---|
| asset_code (PK) | `USDT-TRC20`, `USDC-ETH`, `USDC-POLYGON`, `CNY`, `USD` |
| asset_type | `FIAT` / `STABLECOIN` / `CRYPTO` |
| chain_id | NULL for fiat |
| contract_address | NULL for native chain coin or fiat |
| decimals | 6 (USDT/USDC), 18 (ETH), 2 (CNY) |

> **Why include asset_code instead of (symbol, chain)?** Because the same
> symbol on different chains is **not the same asset** — they have different
> contracts, different fees, and different bridging risk. Treating them as
> one asset has caused real losses at exchanges.

## 3. Identity

### `merchant`
- `code` is the **public** id used in API URLs and dashboards.
- `kyc_status` and `risk_tier` gate certain actions (e.g., a `PENDING` KYC
  cannot withdraw to external addresses).

### `app_user`
- One user belongs to one merchant. **No cross-merchant users in MVP.**
- `password_hash` uses Argon2id with a per-instance pepper (env var).
- `roles` is a Postgres array; in MVP only `MERCHANT_OPERATOR`,
  `MERCHANT_ADMIN`, `RISK_REVIEWER` are used. Refine when you wire
  fine-grained RBAC.

## 4. Account & double-entry ledger

The single most important rule in this codebase:

> **All money movement is a balanced ledger transaction. The account row's
> "balance" is derived, not the source of truth.**

### Tables

- `account` — a logical balance container per `(merchant, account_type, asset)`.
  - `account_type ∈ { AVAILABLE, PENDING, RESERVED, FEE, SETTLEMENT }`
  - For each merchant we maintain at minimum one `AVAILABLE` and one
    `PENDING` account per asset they hold.
- `ledger_tx` — a logical transaction; groups `ledger_entry` rows.
- `ledger_entry` — append-only journal lines. A DB constraint trigger
  enforces `sum(D) == sum(C)` per `tx_id` (deferred until commit).

### Posting patterns (canonical examples)

> "**`A → B` for X**" reads as: debit account A, credit account B, amount X.

| Flow | Posting |
|---|---|
| Deposit detected, awaiting confirms | `LIABILITY_CHAIN → MERCHANT_PENDING` |
| Deposit confirmed | `MERCHANT_PENDING → MERCHANT_AVAILABLE` |
| Order paid (crypto) | `MERCHANT_AVAILABLE → MERCHANT_SETTLEMENT` |
| Fee | `MERCHANT_SETTLEMENT → PLATFORM_FEE` |
| Withdrawal requested | `MERCHANT_AVAILABLE → MERCHANT_RESERVED` |
| Withdrawal completed | `MERCHANT_RESERVED → LIABILITY_CHAIN` |
| Withdrawal failed | `MERCHANT_RESERVED → MERCHANT_AVAILABLE` (reverse) |
| Refund | `MERCHANT_AVAILABLE → MERCHANT_REFUND_OUT` |

`LIABILITY_CHAIN` and `PLATFORM_FEE` are **platform-level** accounts owned
by the operator merchant (a special `merchant.code = 'PLATFORM'` row).

### Why `balance_after` is stored on every entry

It lets the team:
- audit a row in isolation,
- detect post-hoc tampering (sequence break),
- power "balance at point in time T" queries without scanning the entire
  history.

It is **not** the source of truth — it's a derived column that the application
fills inside the same `SELECT ... FOR UPDATE` that posts the entry. The
trigger only verifies balance, not the running total.

### Invariants (must hold at commit)

1. `sum(D) == sum(C)` per `tx_id`. (Trigger enforced.)
2. `balance_after >= 0` for all accounts that don't allow overdraft.
   (Application enforced; revert tx on violation.)
3. Every entry references a valid account that **belongs to** the merchant
   on the `ledger_tx` (or to the platform). (Application enforced.)
4. `ledger_tx` and the operational record (Order, Withdrawal) are written
   in the same DB transaction.

## 5. Orders module

### `merchant_order` columns of note
- `merchant_order_no` is **merchant-supplied**; the unique index is
  `(merchant_id, merchant_order_no)`. Never trust it as a global key.
- `quote_*` is what the merchant priced the order in. `settle_*` is what
  the merchant chose to receive (may differ — e.g., quoted in CNY,
  settled in USDC).
- `expires_at` is required for `CRYPTO` channels; the scanner cancels
  unpaid orders on expiry.

### State machine

```
                ┌─────────┐
                │ CREATED │
                └────┬────┘
                     │ submit
                     ▼
              ┌─────────────────┐    expire / cancel
              │ PENDING_PAYMENT ├────────────────────┐
              └────────┬────────┘                    │
                       │ payment confirmed           │
                       ▼                             ▼
                  ┌──────┐                       ┌──────────┐
                  │ PAID │                       │ CANCELLED│
                  └──┬───┘                       └──────────┘
                     │ settle
                     ▼
                ┌──────────┐
                │ SETTLED  │
                └─────┬────┘
              ┌───────┼───────────┐
              ▼       ▼           ▼
        ┌─────────┐ ┌─────────┐ ┌──────────┐
        │REFUNDING│ │DISPUTED │ │ (final)  │
        └────┬────┘ └─────────┘ └──────────┘
             │ refund completed
             ▼
        ┌─────────┐
        │REFUNDED │
        └─────────┘
```

Allowed transitions only — anything else is a `ConflictException`.
Every transition writes an `order_event` row with `from_status`,
`to_status`, `actor`, `reason`.

### Refunds
- Multiple partial refunds allowed; total ≤ `settle_amount`.
- Each refund posts its own `ledger_tx` of type `REFUND`.

## 6. Vault module

### `wallet_address`
- **One address per `(merchant, chain, purpose)`** in MVP. We deliberately
  do **not** rotate addresses on every deposit (HD-wallet style) because
  it complicates ops; rotation is a v2 concern.
- `custody_ref` is the opaque key the provider uses (e.g., Cobo's
  sub-wallet id, or our mock HD path).
- We **never** store private keys here.

### `deposit`
- `(chain_id, tx_hash, log_index)` is unique — re-runs of the scanner are
  safe.
- Lifecycle:

```
DETECTED ──→ CONFIRMING ──→ CREDITED
                    │
                    └──→ REJECTED  (reorg / dust / blacklisted)
```

- Crediting a deposit posts `LIABILITY_CHAIN → MERCHANT_PENDING` immediately
  on `DETECTED`, and `MERCHANT_PENDING → MERCHANT_AVAILABLE` on `CREDITED`
  (after `chain.confirmations` confirms). This lets the merchant see
  "incoming" before it settles — common UX in the industry.

### `withdrawal`
- Lifecycle:

```
REQUESTED ─→ RISK_REVIEW ─→ APPROVED ─→ SUBMITTED ─→ CONFIRMING ─→ COMPLETED
                  │                                                    │
                  ├──→ REJECTED                                        ├──→ FAILED
                  │                                                    │
                  └─── (auto-rejected if amount > tier limit)          └── reverses RESERVED → AVAILABLE
```

- On `REQUESTED`: post `AVAILABLE → RESERVED` (reserve balance).
- On `COMPLETED`: post `RESERVED → LIABILITY_CHAIN`.
- On `FAILED` / `REJECTED`: post reverse `RESERVED → AVAILABLE`.
- Approval requires a different `app_user` than `requested_by` (4-eyes;
  enforced at service level). Configurable per merchant tier.

## 7. Cashier module (sketch — full schema in `V4__cashier.sql`)

| Table | Purpose |
|---|---|
| `payment_intent` | A merchant's intent to receive fiat, with chosen `FiatRampProvider` |
| `ramp_transaction` | Provider-side transaction record + status callbacks |
| `settlement_quote` | Frozen rate quote between fiat and stablecoin (TTL ~30s) |
| `settlement` | Executed settlement, links payment_intent → ledger_tx |

Lifecycle for incoming fiat → stablecoin:

```
PaymentIntent.CREATED
    → AWAITING_FIAT  (provider returns bank details / hosted page URL)
    → FIAT_RECEIVED  (provider webhook)
    → CONVERTING     (rate locked via settlement_quote)
    → SETTLED        (stablecoin credited via ledger_tx of type DEPOSIT)
    → FAILED / EXPIRED
```

Outgoing stablecoin → fiat:

```
PaymentIntent.CREATED (channel=FIAT_OUT)
    → STABLECOIN_RESERVED   (AVAILABLE → RESERVED for the source asset)
    → CONVERTING            (rate locked, send to provider)
    → FIAT_DISPATCHED       (provider confirmed payout to bank)
    → SETTLED               (ledger_tx finalises RESERVED → LIABILITY_FIAT)
    → FAILED                (reverse RESERVED → AVAILABLE)
```

## 8. Audit, idempotency, outbox

### `audit_log` (append-only)
- Triggers block `UPDATE` and `DELETE`.
- Written via `@Audited` AOP advice on every command service method.
- Fields: actor (user/system/webhook), action (`ORDER.CREATE` / etc.),
  resource id, request id, IP, payload (filtered), result (`OK`/`DENIED`/
  `ERROR`).

### `idempotency_key`
- Composite key `(merchant_id, key)`.
- `request_hash` is sha256 of canonicalised request body. If a reused key
  arrives with a different body, return **HTTP 422** (key collision).
- Cleanup job deletes rows older than 24h.

### `outbox_event` (added in V5)
- Transactional outbox: write the event in the **same DB transaction** as
  the state change. A dispatcher reads `status='PENDING'` rows and
  publishes to RocketMQ; on ack, marks `SENT`.
- This prevents the classic "DB committed, MQ failed" inconsistency.

## 9. ID strategy

- All primary keys are **UUID v7** (time-ordered) — generated app-side
  via `IdGenerator` in `common`. v7 keeps inserts B-tree-friendly while
  giving us global uniqueness.
- Public IDs in URLs use the same UUID — we do not separate "internal"
  vs "external" IDs at MVP stage.
- One exception: `ledger_entry.id` is `BIGSERIAL` because it is a pure
  append-only stream and ordering by primary key is the cheapest scan.
