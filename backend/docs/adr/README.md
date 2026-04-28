# Architecture Decision Records

This directory holds ADRs — short, immutable records of architecturally
significant decisions. Once accepted, an ADR is **not edited** in place;
it is instead **superseded** by a new ADR that records the change in
direction.

## Format

Each ADR is `NNNN-kebab-title.md` and contains, at minimum:

```markdown
# ADR-NNNN — Title

- Date: YYYY-MM-DD
- Status: proposed | accepted | superseded by ADR-NNNN | deprecated
- Decision makers: <roles>
- Stakeholders: <teams>

## Context
What forces are at play? What is the question?

## Decision
The choice we made, in one paragraph at most.

## Rationale
Why this over the alternatives.

## Consequences
Positive, negative, and risks.

## Considered alternatives
Each alternative + why rejected.

## Validation criteria
How do we know it was right?
```

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-backend-stack-java-spring-boot.md) | Backend stack: Java 21 + Spring Boot | accepted |

## When to write an ADR

Write one when the team makes a decision that:

- Constrains the **shape** of the codebase (language, framework, data
  model conventions).
- Introduces or removes a **vendor** dependency (custody, ramp, bridge,
  KYC, payments PSP).
- Changes a **security primitive** (auth flow, key management, signing
  scheme).
- Picks one of several **patterns** that the codebase will then
  consistently follow (event sourcing vs CRUD, monorepo vs polyrepo,
  REST vs gRPC).

Skip ADRs for:

- Library version bumps.
- Bug fixes.
- Refactors that don't change the architectural surface.
- Coding-style debates — those go in `docs/style.md`.
