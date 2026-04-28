# Obita Backend (MVP)

> Web2 + Web3 merchant portal backend, MVP stage.
> Detailed docs live under [`docs/`](docs/) (English) and [`docs/zh/`](docs/zh/) (中文).
> Architecture decisions tracked in [`docs/adr/`](docs/adr/).

## Quick start

```bash
cd backend
cp .env.example .env
docker compose up -d                      # Postgres / Redis / RocketMQ / Adminer

# build everything (Java 21 + Maven)
./mvnw -T 1C verify -DskipTests

# run the API
./mvnw -pl api spring-boot:run
```

Once the app is up:

- API:                http://localhost:8080
- Swagger UI:         http://localhost:8080/swagger-ui.html
- Adminer:            http://localhost:18081
- RocketMQ Dashboard: http://localhost:18080

## Smoke run (curl)

```bash
# 1. login (seeded demo merchant + user)
TOKEN=$(curl -s -X POST http://localhost:8080/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"merchantCode":"DEMO","username":"demo","password":"ObitaDemo!2026"}' \
  | jq -r .accessToken)

# 2. create order
curl -s -X POST http://localhost:8080/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Idempotency-Key: demo-001' \
  -H 'Content-Type: application/json' \
  -d '{
    "merchantOrderNo":"ORD-001",
    "quoteAsset":"CNY", "quoteAmount":"700.00",
    "settleAsset":"USDC-POLYGON", "settleAmount":"100.00",
    "paymentChannel":"CRYPTO",
    "expiresAt":"2030-01-01T00:00:00Z",
    "description":"Demo order"
  }' | jq

# 3. provision a deposit address on Polygon
curl -s -X POST http://localhost:8080/v1/wallet-addresses \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Idempotency-Key: addr-001' \
  -H 'Content-Type: application/json' \
  -d '{"chainId":"POLYGON","purpose":"DEPOSIT","label":"Main"}' | jq

# 4. simulate an on-chain credit toward that address (mock-bank only)
curl -s -X POST http://localhost:8080/mock-bank/credit \
  -H 'Content-Type: application/json' \
  -d '{
    "chainId":"POLYGON",
    "asset":"USDC-POLYGON",
    "toAddress":"<paste address from step 3>",
    "amount":"50.00"
  }'
# DepositScanner picks it up within ~10s; balance moves PENDING → AVAILABLE
# in another ~15s after enough mock confirmations.

# 5. inspect ledger
curl -s "http://localhost:8080/v1/orders" -H "Authorization: Bearer $TOKEN" | jq
```

## Layout

```
backend/
├── pom.xml                     parent
├── docker-compose.yml          local infra
├── .env.example                runtime config (copy to .env)
├── infra/                      RocketMQ broker.conf, etc.
├── docs/                       architecture + handoff docs (en + zh)
├── common/                     primitives — Money, IDs, errors, annotations
├── domain/                     pure aggregates + ports — no Spring deps
├── db/                         Flyway migrations V1..V5
├── infrastructure/             MyBatis mappers, Redis, MQ, chain adapters,
│                               Mock + Cobo custody, Mock EVM chain
└── api/                        Spring Boot app — controllers, security,
                                application services, scanner job
```

## Verify what's been built

```
docs/00..07               architecture & handoff docs (en)
docs/zh/00..07            中文对照
docs/adr/0001-...         backend stack decision rationale
db/.../V1..V5             schema + reference data + demo seed
common/                   Money, AssetCode, ErrorCode, IdGenerator (UUID v7),
                          @Audited, @Idempotent, MerchantId, Principal
domain/account/           Account, LedgerTx, LedgerEntry, LedgerPostingService
domain/orders/            Order aggregate + OrderStatus + state-machine guards
domain/vault/             Withdrawal aggregate + WalletAddress + Deposit
domain/chain/             ChainAdapter port + Address/ChainId + registry
domain/custody/           CustodyProvider port (issue / submit / status / snapshot)
domain/merchant/          MerchantUser + repository port

infrastructure/persistence       MyBatis mappers + repository impls (orders,
                                 account, ledger, vault, merchant, idempotency)
infrastructure/audit             AuditMapper for the @Audited AOP
infrastructure/idempotency       IdempotencyMapper for the @Idempotent AOP
infrastructure/chain/mock        MockEvmChainAdapter
infrastructure/custody/mock      MockCustodyProvider (deterministic HD-style addrs)
infrastructure/custody/cobo      CoboCustodyProvider (real-stub for handoff team)
infrastructure/config            MyBatis config, ChainAdapterRegistry wiring,
                                 LedgerPostingService bean

api/                              ObitaApplication, Spring Security + JWT,
                                  GlobalExceptionHandler, IdempotencyAdvice,
                                  AuditAdvice, JwtAuthFilter,
                                  Auth / Order / Wallet / Withdrawal controllers,
                                  DepositScanner (@Scheduled), MockBankController
```

## Next steps for the backend team

See [docs/07-HANDOFF.md](docs/07-HANDOFF.md) (English) or
[docs/zh/07-HANDOFF.md](docs/zh/07-HANDOFF.md) (中文).

P0 punch list:
1. Implement `CoboCustodyProvider` against the existing port + contract test.
2. Replace `MockEvmChainAdapter` with web3j-driven `EvmChainAdapter`,
   `TronChainAdapter`, etc.
3. Wire withdrawal address allowlist (table column draft is in `WithdrawalRow`,
   schema/policies TBD per merchant tier).
4. Implement Cashier (V4 schema is in place; service + controllers TBD).
5. Replace `application-prod.yaml` mock-rejection guards before production deploy.
