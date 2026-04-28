# Frontend (demo)

Single-page merchant portal that proves the backend works end-to-end.
Vanilla HTML + ES module JS, no build tooling. Layout and design language
mirror `frontend-legacy/design.md` so each surface reads as one editorial
product, not a hand-rolled demo.

## Routes (sidebar)

| Route | Backend wiring | Status |
|---|---|---|
| `#overview`   | `GET /v1/accounts`, `GET /v1/orders` | KPI strip + balances per asset + recent orders |
| `#vault`      | `GET /v1/accounts`, `GET/POST /v1/wallet-addresses`, `POST /mock-bank/credit` | balances + address book + provision form + mock-bank credit injection (with auto-poll for ~60s while scanner runs) |
| `#orders`     | `GET / POST /v1/orders` + lifecycle endpoints | KPI strip + orders table + create-order modal + click row → detail modal |
| `#ledger`     | `GET /v1/accounts` | snapshot table of `balance_after` per account |
| `#fiat-vault` | — | Coming Soon placeholder (Cashier P1) |
| `#payouts`    | — | Coming Soon placeholder (Withdrawal console P1) |
| `#conversion` | — | Coming Soon placeholder (BridgeProvider P0→P1) |
| `#approvals`  | — | Coming Soon placeholder |
| `#reports`    | — | Coming Soon placeholder |
| `#members`    | — | Coming Soon placeholder |

The order detail modal additionally calls `GET /v1/orders/{id}` and
`GET /v1/orders/{id}/events` to render the state-machine timeline.

## Cross-cutting features

- **i18n** — English by default, Chinese toggle in the header. Choice
  persists in `localStorage`. All user-facing strings flow through
  `t(key)`.
- **Theme** — light / dark token override via `data-theme="…"` on
  `<body>`. Toggle in the header. Respects `prefers-color-scheme` on
  first load. The dark palette ports the editorial brass + brand-ink
  language to a dark canvas.
- **Hash router** — `#vault`, `#orders` etc. for deep-linking and back
  button.
- **Idempotency** — `Idempotency-Key` is generated for every
  state-changing request (`api.js`) so replay is safe by construction.
- **Security** — all rendering via `createElement` + `textContent`. No
  `innerHTML` is touched with user-controlled data.

## Design language (from `frontend-legacy/design.md`)

| Pattern | Where |
|---|---|
| Editorial header card (3px brass gradient + brass eyebrow + Clash Display title) | every page |
| Mono index pill (`01` / `02` / `03`) on section heads | every section |
| KPI strip with brand-ink hero tile + 3 status-dotted peer tiles | Overview, Orders |
| Status pills paired with the legacy `--status-{success,info,warn,danger}-{fg,strong,bg,soft-bg,border}` tokens | order status, account types, channels |
| Asset chip on brand-paper for `USDC-…` / `USDT-…` codes | balances, ledger |
| Address book cards with chain badge + masked-address tail | Vault |
| Ledger note tile (warm cream, brass-family highlight) | Ledger |
| Brass active dot on sidebar nav | Sidebar |

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

## Override API base

Append `?api=http://your-host:8080` to the URL once and the choice is
persisted in localStorage. Useful when the backend lives on a remote host
during demos.

## Notes for the next iteration

- `app.js` is single-file on purpose — once the production frontend lands
  (a proper framework with build tooling), this codebase becomes the
  reference for which endpoints to consume in which order, plus the
  design-token map that the production CSS should import.
- All money values cross the wire as strings (no JS float drift). The
  display layer parses with `Number()` for formatting only.
- `ApiError` carries the backend's stable `code`, `requestId`, and
  `details` — surfaces are wired so error toasts always show the code,
  never a raw 500 trace.
- The backend CORS allowlist includes `localhost:5173`, `5500`, `8000`,
  `3000`. Override via `obita.cors.allowed-origins` env var.
- Legacy SPA preserved in `../frontend-legacy/` as the visual reference;
  `design.md` is still authoritative for the design system.
