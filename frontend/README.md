# Frontend (demo)

Minimal SPA that proves the backend works end-to-end. Vanilla HTML + ES
module JS, no build tooling. Deliberately small so the backend is the
focus, not the UI.

## What it covers

| Tab | Backend calls | Purpose |
|---|---|---|
| 资金 · 余额 | `GET /v1/accounts` | per-asset balances grouped by AVAILABLE / PENDING / RESERVED / SETTLEMENT |
| 订单 | `GET / POST /v1/orders` + state transitions | full lifecycle: create → mark-paid → settle → refund / cancel |
| 保险柜 · 入金 | `POST /v1/wallet-addresses` + `POST /mock-bank/credit` | provision an address, inject a mock chain credit, watch the scanner credit it |
| 分录流水 | `GET /v1/accounts` (snapshot) | each account's current `balance_after` derived from latest entry |

## Run

```bash
# 1. backend must already be up — see backend/README.md
cd backend && docker compose up -d
java -jar api/target/obita-api-0.1.0-SNAPSHOT.jar &

# 2. serve frontend (any static server works)
cd ../frontend
python3 -m http.server 5173
# or:  npx http-server -p 5173 -c-1
```

Open http://localhost:5173 and login with the seeded demo:

- merchant code: `DEMO`
- username: `demo`
- password: `ObitaDemo!2026`

The login form has these pre-filled.

## Override API base

Append `?api=http://your-host:8080` to the URL once and the choice is
persisted in localStorage. Useful when the backend is on a remote host
during demos.

## Notes for the backend / design team taking this further

- `app.js` uses `createElement` + `textContent` rather than `innerHTML`
  templates to escape user-controlled fields by default. When the design
  team brings in the production frontend, swap to a proper framework
  rather than scaling this pattern.
- All money values cross the wire as strings (no JS float drift). The
  display layer parses with `Number()` for formatting only.
- `ApiError` carries the backend's stable `code`, the `requestId`, and
  any `details` — surfaces are wired so error toasts always show the
  code, never a raw 500 trace.
- The CORS allowlist on the backend includes `localhost:5173`,
  `localhost:5500`, `localhost:8000`, `localhost:3000`. Add your own via
  the `obita.cors.allowed-origins` env var if you serve the frontend
  elsewhere.
