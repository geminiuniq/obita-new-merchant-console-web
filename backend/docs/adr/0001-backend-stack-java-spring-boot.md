# ADR-0001 — Backend stack: Java 21 + Spring Boot

- **Date**: 2026-04-29
- **Status**: accepted
- **Decision makers**: project sponsor (CEO/CTO proxy) + MVP author
- **Stakeholders**: incoming backend team (Java/Spring), web frontend team
- **Supersedes**: —
- **Superseded by**: —

## 1. Context

Obita is a Web2 + Web3 merchant portal. The MVP needs to prove three flows
(Orders, Cashier, Vault) end-to-end with **financial-grade safety**, while
being **handed off to a separate backend team** for productionisation.

Two facts dominate this decision:

1. The receiving backend team's primary language is **Java**.
2. The MVP is **temporary** — its purpose is to de-risk the architecture
   and ship a demo, not to run in production unchanged.

Three candidate stacks were considered:

| Candidate | Language | MVP velocity | Handoff cost | Web3 maturity | Fintech track record |
|---|---|---|---|---|---|
| A. **Spring Boot** | Java 21 | Medium | **None** (zero rewrite) | High (web3j, trident-java) | Very high |
| B. NestJS | TypeScript | High | High (full rewrite by team) | High (viem, ethers) | Medium |
| C. Go (Gin/Echo) | Go | Medium | High (team must learn Go or rewrite) | High (go-ethereum is reference) | High |

## 2. Decision

**We choose Spring Boot 3.3 on Java 21**, persisted with **MyBatis-Plus**
on **PostgreSQL 16**, messaging via **RocketMQ 5**, EVM via **web3j**.

This means MVP code is the team's **starting point**, not an artefact to
throw away. We optimise for handoff cost rather than MVP velocity.

## 3. Rationale

### 3.1 Why not NestJS

NestJS would have been ~20% faster for the MVP itself (TypeScript record
types, less ceremony, the frontend is already TypeScript-friendly).
However:

- The backend team would do a **full rewrite** to Java. That rewrite is
  not free — it is a 2–3 month tax on top of bringing the system to
  production, with re-introduced bugs that the MVP had already
  uncovered.
- Two stacks during the transition (Node MVP running while Java rewrite
  happens) doubles operational complexity.
- The frontend benefit of a shared TS stack is shallow — the API
  boundary is HTTP/JSON regardless. SDK generation from OpenAPI handles
  shared types either way.

### 3.2 Why not Go

Go is an excellent fintech and Web3 language (most blockchain SDKs are Go,
go-ethereum is the reference EVM client). But:

- The team is Java-first. Asking them to learn Go and Java simultaneously
  is high-risk for a MVP-to-production handoff.
- Java + virtual threads (JEP 444, since Java 21) closes most of Go's
  concurrency edge for our workload, which is mostly I/O-bound (RPC
  calls, custody API calls, DB).
- Spring's ecosystem for fintech (security, transactions, state machines,
  observability) is more mature than Go's equivalents.

If the team had been Go-primary, this ADR would have chosen Go.

### 3.3 Why Java 21 specifically (not Java 17)

- **Virtual threads** (JEP 444) — chain scanners and custody clients
  spend ~95% of time blocked on I/O. Without virtual threads we burn
  OS threads or migrate to reactive code throughout the stack. With
  `spring.threads.virtual.enabled=true`, request handlers and
  `@Scheduled` workers get cheap concurrency for free.
- **Pattern matching for switch** (JEP 441) — cleaner state machine
  transitions and event dispatch.
- **Records, sealed types, pattern matching** — let us keep DTOs and
  domain values terse without Lombok hacks.
- LTS, supported through 2031. Java 17 LTS is older but lacks virtual
  threads; we'd outgrow it within a year.

### 3.4 Why MyBatis-Plus over JPA

Financial systems hit complex SQL daily: `SELECT ... FOR UPDATE`,
multi-row ledger inserts, conditional updates with version checks,
partitioned tables. JPA's lazy-loading + dirty-checking has caused
production outages in this domain (industry-known). MyBatis keeps the
SQL **visible and reviewable**, which is exactly what auditors and the
team's senior reviewers want for money paths.

MyBatis-Plus on top adds `BaseMapper<T>` and a typed conditional query
DSL for the simple-CRUD 80%, without forcing SQL hand-writing for
every select.

### 3.5 Why PostgreSQL over MySQL

- `numeric(38,18)` precision for amounts; MySQL caps at 65 digits but
  arithmetic is slower and rounding behavior less consistent.
- `JSONB` with GIN indexing for metadata-heavy entities (`merchant`,
  audit logs, webhook payloads).
- **Constraint triggers** (`DEFERRABLE INITIALLY DEFERRED`) — used to
  enforce ledger balance per `tx_id` at commit time. MySQL has no
  equivalent; we'd push that invariant entirely to application code.
- `pgaudit` and PG row-level security as second-line defences for the
  backend team to enable in v1.
- Logical replication for cross-region read replicas / staging refresh
  is more flexible than MySQL binlog tooling.

### 3.6 Why RocketMQ over Kafka or RabbitMQ

- **Kafka** wins on raw throughput but lacks RocketMQ's transactional
  half-message protocol — the cleanest way to atomically commit a DB
  state change and an MQ event in one logical step. We rely on this
  for the outbox pattern.
- **RabbitMQ** is fine for MVP loads but lacks the ordered consumer
  semantics RocketMQ provides; we need "consume all events of an order
  in submission order" guarantees.
- The receiving team has prior RocketMQ experience; the dashboard and
  Spring starter (`rocketmq-spring-boot-starter`) are mature.

### 3.7 Why hide every external dependency behind a port

Custody, fiat ramp, bridge, KYC are all **vendor-replaceable** decisions.
Putting `CustodyProvider` etc. in `domain` as interfaces and giving each
two implementations (Mock + real-stub) means:

- We can ship MVP demos without paying real-vendor fees.
- We can cutover to a real vendor by changing one config line.
- The backend team gets a contract test suite that the real adapter
  must pass — "this is what 'good' looks like" is captured as code.

## 4. Consequences

### 4.1 Positive

- **Zero-rewrite handoff**: the MVP code is what the team takes forward.
  No second translation step.
- **Tight reviewability**: every money path is plain SQL and explicit
  state transitions; auditors and code reviewers can trace it.
- **Vendor-agnostic**: provider ports let us defer custody / ramp /
  bridge selection until production constraints are known.
- **Mature security primitives**: Spring Security 6, Argon2id, JJWT —
  all battle-tested.
- **Operationally familiar**: the team already runs Spring Boot in
  production. No new ops surface area for the MVP.

### 4.2 Negative

- **Slower MVP velocity** vs NestJS (~20%). The handoff savings dominate
  this cost over the project lifetime.
- **Heavier resource footprint** than Go for an equivalent workload.
  Mitigated by virtual threads (cheaper request concurrency) and by
  splitting scanner/dispatcher off the API tier so each scales
  independently.
- **Maven multi-module ceremony** — five modules (`common`, `domain`,
  `db`, `infrastructure`, `api`) instead of a flat repo. Trade-off
  accepted because the layering is exactly the message we want to send
  to the team about hexagonal architecture.

### 4.3 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| EVM throughput becomes a bottleneck for scanner | Medium | High | `ChainAdapter` boundary clean enough to swap scanner for a Go service later |
| MyBatis-Plus magic features hide subtle SQL behavior | Low | Medium | Banned features list in code review checklist (auto-fill of update SQL, etc.) |
| Spring StateMachine persistence overhead | Low | Low | Replace with hand-rolled enum-based machine (interface-compatible) |
| RocketMQ ops complexity vs RabbitMQ | Medium | Low | Dashboard included; team already runs it |

## 5. Considered alternatives (in detail)

### 5.1 NestJS + Prisma + Postgres + viem

- Pros: highest MVP velocity, type-shared with frontend, fast iteration.
- Cons: full rewrite by Java team; ecosystem for financial primitives
  thinner (JJWT/Argon2 are good in JS too, but the Spring StateMachine /
  audit / transaction-management combination is unmatched).
- Outcome: rejected on handoff cost.

### 5.2 Go + Gin + sqlc + go-ethereum

- Pros: best Web3 client maturity (go-ethereum is the reference impl);
  excellent concurrency for scanners; tiny binaries.
- Cons: team is Java-first; rewriting / re-staffing is a critical-path
  risk. Go's ecosystem for state machines and DI patterns expected by
  the team is sparser.
- Outcome: rejected on team fit; **revisit if the team adds Go
  capacity** for the scanner specifically (`ChainAdapter` boundary
  permits it).

### 5.3 Kotlin + Spring Boot

- Pros: 90% of Java's ecosystem, more concise syntax, Java-interop.
- Cons: team is plain Java; mixing Kotlin and Java in a single repo
  raises onboarding friction without a strong reason.
- Outcome: rejected; **could be reconsidered** as a per-module migration
  in v2 if the team adopts Kotlin.

### 5.4 Spring WebFlux (reactive)

- Pros: efficient I/O without blocking threads.
- Cons: as of Java 21 + virtual threads, the operational benefit of
  reactive is largely matched by `Thread.ofVirtual()` while keeping
  the imperative programming model. The reactive learning curve is a
  significant tax for handoff.
- Outcome: rejected; **virtual threads** picked instead.

## 6. Validation criteria

The decision will be considered **vindicated** if all are true at handoff:

- Backend team can clone, build, and run the MVP without external
  consultancy by day 2.
- ≥ 80% of MVP code survives unchanged into the v1 production codebase.
- No production-grade rewrite of any data model is required.
- Provider cutovers (mock → Cobo, mock → Circle) require config-only
  changes plus the new adapter implementation, not refactors of
  application services.

The decision will be considered **mistaken** if:

- More than 30% of MVP application code is rewritten in v1.
- The team raises a serious objection to MyBatis-Plus or RocketMQ
  within the first month — in which case revisit via a follow-up ADR.

## 7. Notes for future ADRs

- The next ADR (0002) is likely to record the choice of **custody
  vendor** (Cobo vs Safeheron vs Fireblocks) once the team starts
  integration.
- ADR-0003 candidate: **bridge vendor** (Squid vs LayerZero direct).
- ADR-0004 candidate: **fiat ramp vendor** for CNY (PingPong vs Lianlian
  vs Airwallex).

These are explicitly **deferred** — MVP wires them as interfaces only.
