# Frontend (demo)

Single-page merchant portal that proves the backend works end-to-end.
Vanilla HTML + ES module JS, no build tooling. Layout and design language
mirror `frontend-legacy/design.md` so each surface reads as one editorial
product, not a hand-rolled demo.

## Routes (sidebar)

| Route | Status | Backend wiring / mock data |
|---|---|---|
| `#overview`   | **real** | `GET /v1/accounts`, `GET /v1/orders` — KPI strip + balances per asset + recent orders |
| `#vault`      | **real** | `GET /v1/accounts`, `GET/POST /v1/wallet-addresses`, `POST /mock-bank/credit` — balances + address book + provision form + mock-bank credit injection (auto-poll for ~60s while scanner runs). Address card → wallet history drawer |
| `#orders`     | **real** | `GET / POST /v1/orders` + lifecycle endpoints — KPI strip + orders table + create-order modal + row click → detail modal with `GET /v1/orders/{id}` and `GET /v1/orders/{id}/events` timeline |
| `#ledger`     | **real** | `GET /v1/accounts` — snapshot table of `balance_after` per account |
| `#payouts`    | **real** (Sprint 6) | `GET / POST /v1/withdrawals` + lifecycle (`/approve`, `/reject`). KPI strip + table powered by live data. Row actions render only on `REQUESTED` / `RISK_REVIEW`; backend enforces 4-eyes (`WITHDRAWAL_FOUR_EYES_VIOLATION` if requester == approver). Lifecycle currently terminates at `SUBMITTED`; `CONFIRMING → COMPLETED` scheduler is a follow-up |
| `#conversion` | mock     | Live mock-quote box (rate · est. receive · 0.10% fee) + recent conversions table. Real swap routes through the `BridgeProvider` port (P1) |
| `#approvals`  | mock     | Severity-bar rows (legacy §3.5) — 4px danger / 3px warn+info / 2px awareness — across compliance, payout, address book, member changes. Backed by `audit_log` + `outbox_event` tables (real flow P1) |
| `#reports`    | mock     | Three editorial cards (Balance / Orders / Ledger CSV); hero links direct to live OpenAPI JSON + Swagger UI on the running backend |
| `#members`    | mock     | KPI strip + members table with role pills (`OWNER` / `ADMIN` / `OPERATOR` / `VIEWER`), MFA pill (`TOTP` vs `OFF`), last-login, status. Backend role tables (`app_user` / `member_role` / `role_permission`) exist; controller + invite flow P1 |
| `#fiat-vault` | stub     | Coming Soon (Cashier P1: `payment_intent` / `ramp_transaction` schema in place) |

Wallet history drawer (opens from any address card on `#vault`) hybridises
real + mock data: pulls latest `GET /v1/accounts` and prepends a `LIVE`
row when the chain has a non-zero AVAILABLE balance, then renders three
deterministic mock rows (top-up / settle / top-up) keyed off the address
itself. Drops out cleanly the day backend ships
`GET /v1/wallet-addresses/{id}/transactions`.

## Module layout

`app.js` is intentionally small (~120 lines: bootstrap + login + toggle
wiring + route registration). Everything else lives under `js/`.

```
frontend/
├── index.html            sidebar+main shell, login screen, modals, drawers
├── styles.css            full editorial token system + dark theme override
├── api.js                JWT + idempotency fetch wrapper
├── app.js                bootstrap: route registration, login flow, toggles
└── js/
    ├── dom.js            el(), clear(), $/$$ helpers
    ├── format.js         fmt utilities (money / int / short / time)
    ├── strings.js        en + zh dictionary (mirrored 1:1)
    ├── i18n.js           t(), setLang(), applyStaticI18n()
    ├── theme.js          light/dark toggle + persistence
    ├── ui.js             pageHero / sectionCard / statusPill / toast
    ├── router.js         hash router + page registry + pollCurrentRoute
    ├── drawer.js         generic right-side drawer + overlay
    ├── header.js         profile dropdown wiring
    ├── inbox.js          mock inbox messages
    └── pages/
        ├── overview.js          real wired
        ├── vault.js             real wired
        ├── orders.js            real wired
        ├── order-detail.js      real wired
        ├── ledger.js            real wired
        ├── wallet-history.js    mock + real hybrid
        ├── members.js           mock
        ├── approvals.js         mock
        ├── conversion.js        mock
        ├── reports.js           mock + Swagger UI link
        ├── payouts.js           mock
        └── coming-soon.js       Fiat Vault stub
```

Each page module exports a `render*(rootElement)` function and is
registered in `app.js` via `registerRoute(name, fn)`. Pages are responsible
for clearing the content area and rendering their own page-hero +
section-cards. Shared UI primitives live in `js/ui.js`.

## Cross-cutting features

- **i18n** — English by default, Chinese toggle in the header. Choice
  persists in `localStorage`. All user-facing strings flow through
  `t(key)`. The dictionary lives in `js/strings.js` and is split into
  `en` + `zh` blocks; the two are mirrored 1:1.
- **Theme** — light / dark token override via `data-theme="…"` on
  `<body>`. Toggle in the header. Respects `prefers-color-scheme` on
  first load. The dark palette ports the editorial brass + brand-ink
  language to a dark canvas without component-level branching.
- **Hash router** — `#vault`, `#orders`, etc. for deep-linking and back
  button. `pollCurrentRoute(durationMs)` re-renders the active page on
  an interval, used by the vault flow after a mock-bank credit so the
  user can watch the scanner advance the deposit through PENDING →
  AVAILABLE.
- **Drawers** — generic right-side drawer + shared overlay (`js/drawer.js`).
  Currently used by Inbox and Wallet History; reusable for any future
  side panel (Members detail, Approval detail, etc.).
- **Idempotency** — `Idempotency-Key` is generated for every
  state-changing request (`api.js`) so replay is safe by construction.
- **Security** — all rendering via `createElement` + `textContent`. No
  `innerHTML` is touched with user-controlled data.

## Design language (from `frontend-legacy/design.md`)

| Pattern | Where it appears |
|---|---|
| Editorial header card (3px brass gradient + brass eyebrow + Clash Display title) | every page |
| Mono index pill (`01` / `02` / `03`) on section heads | every section |
| KPI strip with brand-ink hero tile + 3 status-dotted peer tiles | Overview, Orders, Members, Approvals, Payouts |
| Status pills paired with `--status-{success,info,warn,danger}-{fg,strong,bg,soft-bg,border}` | order status, account types, channels, role, MFA, approval severity |
| Asset chip on brand-paper for `USDC-…` / `USDT-…` codes | balances, ledger |
| Address book cards with chain badge + masked-address tail | Vault |
| Severity bars (legacy §3.5: 4 / 3 / 2 px by intent) | Approvals queue rows |
| Brass active dot on sidebar nav | Sidebar |
| Mono caps eyebrow + 1px hairline rule | section eyebrows on Vault provision form, etc. |

## Run

```bash
# 1. backend must already be up — see backend/README.md
cd backend && docker compose up -d
java -jar api/target/obita-api-0.1.0-SNAPSHOT.jar &

# 2. serve frontend (any static server works)
cd ../frontend
python3 -m http.server 5173
```

Open http://localhost:5173 and sign in:

- merchant code: `DEMO`
- username: `demo`
- password: `ObitaDemo!2026`

(All three are pre-filled.)

Toggle the language with the `EN` / `中` button in the header. Toggle
the theme with the moon / sun icon. Open the inbox via the bell icon
to see the mock messaging surface (legacy slide-in drawer pattern).

## Override API base

Append `?api=http://your-host:8080` to the URL once and the choice is
persisted in localStorage. Useful when the backend lives on a remote host
during demos.

## Notes for the next iteration

- All money values cross the wire as strings (no JS float drift). The
  display layer parses with `Number()` for formatting only.
- `ApiError` carries the backend's stable `code`, `requestId`, and
  `details` — surfaces are wired so error toasts always show the code,
  never a raw 500 trace.
- The backend CORS allowlist includes `localhost:5173`, `5500`, `8000`,
  `3000`. Override via the `obita.cors.allowed-origins` env var.
- Legacy 25k-line SPA preserved in `../frontend-legacy/` as the visual
  reference; `design.md` is still authoritative for the design system.
- When the production frontend lands (proper framework + build tooling),
  this codebase becomes the reference for which endpoints to consume in
  which order, plus the design-token map that the production CSS should
  import.
