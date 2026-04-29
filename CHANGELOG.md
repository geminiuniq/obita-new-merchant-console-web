# Changelog

> 中文版：[CHANGELOG.zh.md](CHANGELOG.zh.md)

All notable changes to **obita-web** are recorded here. One entry per
checkpoint / sprint / commit; newest first.

The repo is pre-1.0 — versioning follows the date of the most recent
commit (`yyyy-mm-dd-vN`) rather than SemVer.

---

## [2026-04-29-v6] — Sprint 6 · Payouts wired (4-eyes end-to-end)

The first real-wiring sprint after Round 3. Payouts goes from full mock
to live, exercising the 4-eyes withdrawal lifecycle.

- **DB**: `V6__seed_demo_approver.sql` — second user (`demo_approver`,
  `MERCHANT_ADMIN` + `RISK_REVIEWER`) so the 4-eyes flow can be
  demonstrated without an admin tool. Same demo password as `demo`.
- **Frontend API** (`api.js`): `listWithdrawals`, `getWithdrawal`,
  `createWithdrawal`, `approveWithdrawal`, `rejectWithdrawal`.
- **Frontend page** (`pages/payouts.js`): mock data removed; KPI strip
  + table populate from `GET /v1/withdrawals`. `Approve` / `Reject` row
  actions render only on `REQUESTED` / `RISK_REVIEW`. `failureMessage`
  surfaces inline on `REJECTED` / `FAILED`.
- **Modal**: `#modal-create-withdrawal` (chain · asset · amount · to
  address); i18n labels driven by `i18n.js`.
- **Status pills** (`ui.js`): `WithdrawalStatus` values mapped to
  pill variants — `REQUESTED`/`RISK_REVIEW` = warn, `APPROVED`/
  `SUBMITTED`/`CONFIRMING` = info, `COMPLETED` = success,
  `REJECTED`/`FAILED` = danger.
- **i18n** (`strings.js`): new keys for empty state, action labels,
  approve/reject confirms, modal labels, toast copy — both en + zh.
- **Browser-verified**: create → REQUESTED → toast; logout → login as
  `demo_approver` → approve → SUBMITTED → toast. 8 balanced ledger
  entries (`AVAILABLE → RESERVED` reserve + `RESERVED → AVAILABLE`
  rejected reverse) across the 3 test withdrawals.
- **Self-approval** (same userId on both sides) returns
  `WITHDRAWAL_FOUR_EYES_VIOLATION` — verified end-to-end.
- **Not done in this sprint**: SUBMITTED → CONFIRMING → COMPLETED
  scheduler. Aggregate transitions and `findInFlight()` repository
  method are already in place; gap is the `WithdrawalScanner` +
  hydration fix in `VaultRepositoryImpl.toDomainWithdrawal` to
  populate optional fields. Slated for Sprint 6.5 or as part of
  Sprint 7.

## [2026-04-29-v3.6] — `43c83f1` · docs · Round 3 progress + frontend architecture

- Backend `docs/PROGRESS.md` (+ zh mirror): added **Round 3 — Editorial
  portal** section with sprint roll-up table, module tree, routes ×
  backend wiring matrix, cross-cutting features, browser-verified flow
  checklist.
- `frontend/README.md` refreshed with the post-refactor module layout
  and wallet-history hybrid behaviour.

## [2026-04-29-v3.5] — `ac4319f` · Sprint 5 · Wallet history drawer

- Click any address card on the Stablecoin Vault page → slide-in drawer
  reveals recent activity for that address.
- Hybrid data: `LIVE` row pulled from `GET /v1/accounts` when the
  chain has a non-zero AVAILABLE balance; three deterministic mock rows
  (top-up / settle / top-up) keyed off the address itself.
- Drops out cleanly the day backend ships
  `GET /v1/wallet-addresses/{id}/transactions` (P1).
- Reuses the generic `drawer.js` shell from Sprint 3.

## [2026-04-29-v3.4] — `13389ef` · Sprint 4 · Editorial mock pages

Five Coming Soon stubs upgraded to full editorial layouts so the portal
reads as one product:

- **Members** (`#members`): KPI strip + members table with role pills
  (`OWNER` / `ADMIN` / `OPERATOR` / `VIEWER`), MFA pills, last-login,
  status. Mock data; backend role tables already exist.
- **Approvals** (`#approvals`): severity-bar rows per legacy §3.5
  (4px danger / 3px warn-info / 2px awareness) across compliance,
  payout, address book, member changes. Approve / Reject buttons
  parked behind a P1 toast.
- **Conversion** (`#conversion`): live mock-quote box (rate · est.
  receive · 0.10% fee), recent conversions table.
- **Report Center** (`#reports`): three editorial cards (Balance /
  Orders / Ledger CSV); hero links direct to live OpenAPI JSON +
  Swagger UI.
- **Payouts** (`#payouts`): KPI strip + withdrawal table with chain
  badges + 4-eyes status pills.
- Sidebar **Soon** pills removed for the five built routes; only Fiat
  Vault remains a pure stub.

## [2026-04-29-v3.3] — `1c36fd7` · Sprint 3 · Header polish

- **Inbox drawer** (right slide): 4 mock messages (compliance /
  deposit / statement / welcome) with brass unread indicators, UNREAD
  pills, relative timestamps, click-to-read.
- **Bell icon** gets a danger-coloured notif dot when there are unread
  messages.
- **Profile dropdown** under the avatar: demo · DEMO header + mono
  email + My profile / Security / API docs / Sign out.
- API docs item opens `${baseUrl}/swagger-ui.html` in a new tab — free
  backend-discoverability win.
- New `js/drawer.js` (generic right-slide drawer + overlay), reused by
  Sprint 5's wallet history drawer.

## [2026-04-29-v3.2] — `e51268e` · Sprint 2 · Module split

- `app.js` was 1.2k lines packing strings + DOM helpers + i18n + theme
  + router + every page renderer in one file. Split into focused
  modules under `js/`:
  - `dom.js`, `format.js`, `strings.js`, `i18n.js`, `theme.js`,
    `ui.js`, `router.js`
  - `js/pages/`: overview, vault, orders, order-detail, ledger,
    coming-soon
- `app.js` shrank to ~120 lines: bootstrap + login + toggle wiring +
  route registration.
- Native ES modules — no build step.
- `balanceCard` exported from `overview.js` and reused on `vault.js`
  so the per-asset card pattern stays in one place.

## [2026-04-29-v3.1] — `3141dc0` · Sprint 1 · Editorial UI rebuild

The demo SPA was a four-tab shell. Rebuilt as a sidebar+main editorial
dashboard, design language ported from `frontend-legacy/design.md`:

- **Layout**: sidebar (240px, section labels + brass active dot) +
  64px topbar + main scroll.
- **Editorial header card** per page (3px brass gradient + brass
  eyebrow + Clash Display title + sub copy + actions slot).
- **KPI strip**: brand-ink hero tile + 3 status-dotted peer tiles.
- **Status pills** paired with the legacy
  `--status-{success,info,warn,danger}-{fg,strong,bg,soft-bg,border}`
  tokens.
- **Mono index pills** (`01` / `02` / `03`) on section heads.
- **Asset chips** on brand-paper for `USDC-…` / `USDT-…` codes.
- **Address book cards** with chain badge + masked-address tail.
- **Order detail modal** wired to `GET /v1/orders/{id}` +
  `GET /v1/orders/{id}/events` for state-machine timeline.
- **i18n** (en + zh, default English) via `t(key)` + persisted
  `localStorage`.
- **Theme** (light / dark) via `data-theme` token override; respects
  `prefers-color-scheme` on first load.
- **Hash router** — `#vault`, `#orders`, etc. for deep-linking.

---

## [2026-04-29-v2] — `64b8d08` · docs · Plan B progress + top-level README

- Top-level `README.md` (+ `README.zh.md`) so the repo is approachable
  from `obita-web/`.
- `backend/docs/PROGRESS.md` rewritten with the full **Round 1** smoke
  evidence (8 ledger entries) + **Round 2 — Plan B** wiring.

## [2026-04-29-v1] — `0cb9f63` · feat · Demo SPA + backend wiring (Plan B)

Four-tab demo SPA wired to the backend so the four core flows are
browser-verifiable end-to-end:

- Login (`POST /v1/auth/login`).
- Balances (`GET /v1/accounts`) — 4 stablecoin assets × 4 account
  types.
- Vault (`POST /v1/wallet-addresses` + `POST /mock-bank/credit` →
  scanner picks up the credit and writes 4 ledger entries).
- Orders (`POST /v1/orders` + lifecycle: mark-paid → settle → refund).

Backend hard blockers fixed in the same round:

- Real CORS bean (`CorsConfigurationSource`) with `@Qualifier` to
  disambiguate against Spring's `mvcHandlerMappingIntrospector`.
- `{id}:verb` routes refactored to sub-resource style (`/cancel`,
  `/settle`, `/mark-paid`, `/approve`, `/reject`) — Spring 6
  PathPatternParser treats `:` as matrix-variable separator.
- New `GET /v1/accounts` endpoint joining account with the latest
  `balance_after` from `ledger_entry`.

Bug count from PROGRESS round 1 + 2 combined: **9** (each documented
with root cause + fix).

## [earlier] — pre-Plan-B foundation

| Commit | Title |
|---|---|
| `a70eab5` | feat · Backend MVP — Spring Boot scaffold for Web2+Web3 merchant portal |
| `9273f7e` | docs+design · Token layer + bulk neutral normalization + design.md |
| `22857d4` | feat+design · Overview polish — Exceptions & Tasks tracks, lighter Summary cards, news refresh |

These laid down the backend MVP (Spring Boot 3.3 + Java 21, three
modules: Orders / Cashier / Vault, MyBatis-Plus + Flyway V1..V5,
docker-compose for PG/Redis/RocketMQ) and the frontend-legacy SPA
that all subsequent design borrows from.

---

## How to read this file

- **One entry per commit** that introduces visible behaviour or moves
  the project forward in a way contributors should know about.
- Pure refactors land here too if they change how the codebase is
  structured (e.g. Sprint 2's module split).
- Backend bug-fix details still live in `backend/docs/PROGRESS.md` §5
  — that's the canonical post-mortem location.
- Sprint structure was introduced in Round 3; older work has commit
  hashes only.
