# Obita Backend — MVP Architecture & Handoff Docs

> 中文版本：[docs/zh/00-README.md](zh/00-README.md)

> **Purpose**: this directory captures the architecture, technology choices, and
> integration contracts agreed for the Obita Web2+Web3 merchant portal MVP. It
> is the **single source of truth** for the backend team taking over development
> from the MVP. Code in `backend/` is a reference implementation of these docs;
> when they disagree, **the docs win** — open a PR to update both together.

## Reading order

| # | File | Audience | Time |
|---|---|---|---|
| 01 | [Architecture](01-ARCHITECTURE.md) | All | 10 min |
| 02 | [Tech Stack](02-TECH_STACK.md) | Tech leads | 8 min |
| 03 | [Domain Model](03-DOMAIN_MODEL.md) | All devs | 15 min |
| 04 | [Integrations](04-INTEGRATIONS.md) | Custody / Web3 dev | 12 min |
| 05 | [Security](05-SECURITY.md) | All — required reading | 8 min |
| 06 | [API Conventions](06-API.md) | Backend + Frontend | 8 min |
| 07 | [Handoff Plan](07-HANDOFF.md) | Project lead, backend team | 6 min |
| — | [**Progress**](PROGRESS.md) | All — current status, what's verified, what's next | 8 min |
| — | [ADR-0001](adr/0001-backend-stack-java-spring-boot.md) | Tech leads — stack rationale | 7 min |

## Project goals

Obita is a **merchant portal** that bridges **Web2 commerce** (orders, fiat
settlement, bank transfers, card payments) with **Web3 rails** (multi-chain
stablecoin custody, on-chain settlement, cross-chain transfers). The MVP must
prove three end-to-end flows:

1. **Orders** — merchant creates a commercial order, sees its lifecycle
   through to settled or refunded.
2. **Cashier** — fiat-in / fiat-out and stablecoin conversion through a
   pluggable on-/off-ramp provider.
3. **Vault** — multi-chain wallet addresses, deposits scanner, withdrawals
   with risk review.

## Non-goals (explicit)

- We **do not** build our own bridge / cross-chain protocol — we adapt to
  LayerZero / Wormhole / deBridge / Squid (`BridgeProvider` interface).
- We **do not** build our own custody — we hide it behind `CustodyProvider`
  and ship a Mock implementation for MVP. Real integration target: **Cobo
  Custody** or **Safeheron MPC**.
- We **do not** build a fiat PSP integration from scratch — we integrate
  through `FiatRampProvider` (Circle Mint / Banxa / local PSP).
- We **do not** ship MFA, advanced RBAC, or admin tooling in the MVP — they
  are scaffolded but not the focus.

## Quick start (MVP local dev)

```bash
cd backend
cp .env.example .env
docker compose up -d            # Postgres / Redis / RocketMQ / Adminer
./mvnw -pl api spring-boot:run  # boot the API on :8080
```

Adminer: http://localhost:18081  ·  RocketMQ dashboard: http://localhost:18080
Swagger UI: http://localhost:8080/swagger-ui.html

## Repo layout

```
backend/
├── pom.xml                     # Maven parent
├── docker-compose.yml          # Local infra
├── .env.example                # All runtime config
├── infra/                      # Infra config files (rocketmq broker.conf, etc.)
├── docs/                       # ← you are here
├── common/                     # Cross-cutting primitives (Money, Result, IDs)
├── domain/                     # Pure aggregates + ports — no framework deps
├── db/                          # Flyway migrations (V1..Vn)
├── infrastructure/             # MyBatis mappers, Redis, RocketMQ, chain adapters
└── api/                        # Spring Boot app — controllers, security, wiring
```

The five Maven modules implement a hexagonal / ports-and-adapters layout —
see [01-ARCHITECTURE.md](01-ARCHITECTURE.md).
