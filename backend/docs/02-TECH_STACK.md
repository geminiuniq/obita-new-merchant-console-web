# 02 — Technology Stack

## 1. Decision summary

| Layer | Choice | Version | Rationale (1 line) |
|---|---|---|---|
| JDK | **Java 21 (LTS)** | 21 | Virtual threads = cheap I/O wait for chain/custody RPC |
| Framework | **Spring Boot** | 3.3.x | The de-facto Chinese fintech standard; team already knows it |
| Persistence | **MyBatis-Plus** | 3.5.x | Explicit SQL is auditable; avoids JPA's hidden N+1 in money flows |
| DB | **PostgreSQL** | 16 | `numeric(38,18)` + JSONB + row-level locks + logical replication |
| Migration | **Flyway** | 10.x | Versioned, deterministic, easy DBA workflow |
| Cache / lock | **Redis 7 + Redisson** | 3.36.x | Distributed locks, idempotency keys, refresh tokens |
| MQ | **RocketMQ** | 5.3.x | Transactional messages, ordered consumers, dashboard, fintech-proven |
| Web3 (EVM) | **web3j** | 4.12.x | The mature Java EVM client; covers ETH/BSC/Polygon/Arb/Base/OP |
| Web3 (Tron) | **trident-java** | latest | TRC20 USDT is the largest stablecoin volume in APAC |
| Web3 (Solana) | direct JSON-RPC | — | sol4j is unmaintained; thin wrapper is fine |
| Auth | **Spring Security 6 + JJWT 0.12** | — | Stateless JWT (access) + Redis refresh; Argon2id for passwords |
| Validation | **Jakarta Validation + Hibernate Validator** | — | Declarative DTO validation at the controller boundary |
| State machine | **Spring StateMachine** | 4.0 | Explicit transitions + persistence + audit hooks |
| API docs | **SpringDoc OpenAPI + Knife4j** | 2.6 | Auto-generates the OpenAPI spec for handoff |
| Money | `BigDecimal` everywhere; **never** `double`/`float` | JDK | DB `numeric(38,18)`; pluggable rounding policies |
| Observability | Micrometer + Prometheus + OTel + Loki | — | Tracing required for finance |
| Test | JUnit 5 + Mockito + Testcontainers | — | Real Postgres/Redis/RocketMQ in integration tests |
| Build | **Maven** (multi-module) | 3.9 | Spring/Java team standard; reproducible across CI |

## 2. Choices justified against alternatives

### 2.1 Spring Boot vs Quarkus / Micronaut
- Hand-off requirement: backend team is Java/Spring shop. Quarkus' native
  build helps cold-start but the team would need to relearn DI, config,
  testing patterns. Net: lose more on velocity than gain on runtime.

### 2.2 MyBatis-Plus vs JPA/Hibernate
- Financial systems hit complex queries: `SELECT ... FOR UPDATE`, multi-row
  ledger inserts, conditional updates with version checks, partitioned
  tables. JPA's lazy loading + dirty checking has caused production outages
  in this domain. **MyBatis-Plus** keeps the SQL visible and reviewable.
- Simple CRUD still benefits from MP's `BaseMapper<T>` and conditional
  query DSL.

### 2.3 PostgreSQL vs MySQL
- `numeric(38,18)` precision (MySQL caps at 65 digits but is slower at
  arithmetic), `JSONB` indexing, materialized views, `pgaudit`,
  `pg_partman` for ledger partitioning, and `LISTEN/NOTIFY` for cheap pub/sub
  are all cleanly available in PG.
- Cross-region replication via logical replication is more flexible than
  MySQL's binlog.

### 2.4 RocketMQ vs Kafka vs RabbitMQ
- **Kafka** wins for throughput but lacks transactional messages with
  the same DB-binding ergonomics RocketMQ ships with.
- **RabbitMQ** is fine for MVP loads but lacks the ordered consumer
  semantics RocketMQ provides, which matter for "process all events of an
  order in submission order".
- **RocketMQ** chosen for: transactional messages (commit MQ msg + DB
  write atomically via half-message protocol), ordered MessageQueueSelector
  by `merchant_id`, and the Apache project being heavily used by Chinese
  fintech teams.

### 2.5 web3j vs ethers (with a service shim)
- We're a Java shop. Adding a Node.js sidecar for ethers means another
  process to operate, another deploy, another set of secrets. **web3j**
  is fine for our needs (transfer, contract call, log subscription).

### 2.6 Java 21 virtual threads
- Chain scanners and custody clients spend 95% of their time blocked on
  network I/O. Without virtual threads we burn OS threads or deal with
  reactive code throughout the stack. With `spring.threads.virtual.enabled=true`,
  request handlers and `@Scheduled` workers get cheap concurrency for free.

## 3. Versions pinned in `pom.xml`

See `backend/pom.xml` `<properties>` block. Bumping a version is a PR with
a test run + smoke against the local stack. **Never** run production with
unpinned `LATEST` versions.

## 4. Local-only services

| Service | Port | Credentials |
|---|---|---|
| Postgres 16 | 5432 | obita / obita_dev_pwd |
| Redis 7 | 6379 | obita_dev_pwd |
| RocketMQ namesrv | 9876 | — |
| RocketMQ broker | 10911 | — |
| RocketMQ proxy | 8081 | — |
| RocketMQ dashboard | 18080 | — |
| Adminer | 18081 | preconfigured to PG |

All ports bind to `127.0.0.1` only. The `.env.example` file is the single
config surface for the application; production swaps it out via the
secrets manager (Vault / AWS Secrets Manager / Aliyun KMS).

## 5. Dependency hygiene rules

1. Every transitive dependency in money-handling paths must be reviewed.
   No surprise upgrades — `dependencyManagement` pins everything.
2. No SNAPSHOT versions in `main`. Period.
3. `mvn dependency:analyze` runs in CI; unused declared deps fail the build.
4. **Banned**: any library that pulls in `commons-collections:3.x`,
   `log4j:1.x`, or other dead/unsafe deps. Enforced via the
   `maven-enforcer-plugin` `<bannedDependencies>` rule (to be added).
5. CVEs scanned by `dependency-check-maven` weekly; CRITICAL = block.

## 6. Build & test matrix

| Goal | Command |
|---|---|
| Compile | `./mvnw -T 1C verify -DskipTests` |
| Unit tests | `./mvnw -pl common,domain test` |
| Integration tests | `./mvnw -pl api verify` (Testcontainers boots PG/Redis/RocketMQ) |
| Run API | `./mvnw -pl api spring-boot:run` |
| Generate OpenAPI | `./mvnw -pl api spring-boot:run -Dspring-boot.run.profiles=openapi-export` |
| Format check | `./mvnw spotless:check` |
| Format apply | `./mvnw spotless:apply` |

CI runs the full matrix on every PR; main is protected.

## 7. Items the backend team will likely revisit

- **Switch MyBatis-Plus → MyBatis + sqlc-style generation** if the team
  wants stricter typing.
- **Replace Spring StateMachine with a hand-rolled enum-based machine** if
  StateMachine's persistence overhead bites.
- **Move scanner to a Go service** if EVM throughput becomes a bottleneck;
  the `ChainAdapter` boundary is clean enough to accept a non-Java
  implementation.
- **Add a feature-flag service** (Unleash / GrowthBook). MVP uses
  `application.yaml` toggles only.
