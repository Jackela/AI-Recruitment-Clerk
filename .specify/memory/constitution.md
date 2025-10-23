<!--
Sync Impact Report
- Version change: N/A → 1.0.0
- Modified principles: N/A (initial adoption)
- Added sections: Core Principles; Engineering Standards; Development Workflow; Governance
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check gates aligned)
  - ✅ .specify/templates/tasks-template.md (Tests now REQUIRED, TDD-first)
  - ⚠ .specify/templates/spec-template.md (No change required; optional note to include acceptance scenarios already present)
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): If historical adoption pre-dates 2025-10-23, update to original date.
-->

# AI Recruitment Clerk Constitution

## Core Principles

### I. Clean Architecture & Maintainability First (NON-NEGOTIABLE)
Business logic stays independent of frameworks and I/O. Maintainability, clarity, and
testability take precedence over premature optimization.

- Enforce layered dependency direction: domain → application → infrastructure → interface.
  Inner layers MUST NOT depend on outer layers.
- Business rules live in `libs/<domain>/` with explicit public APIs via `index.ts`.
- `apps/*` may only compose modules, wire adapters, and expose interfaces (HTTP, CLI, MQ).
- Keep modules small and cohesive; avoid god services, cyclic deps, and broad exports.
- Nx `@nx/enforce-module-boundaries` MUST pass; violations require documented justification.
- Favor readability and refactoring safety; no dead code, no hidden side effects.

Rationale: Isolation of domain logic ensures stability, enables parallelism, and lowers
change cost across services.

### II. Test‑Driven Development (TDD) (NON-NEGOTIABLE)
Tests drive design. Write a failing test before writing implementation.

- Strict Red‑Green‑Refactor cycle for all new code and bug fixes.
- Unit tests colocated under project `apps/*/src/**/?(*.)spec.ts` and `libs/*/**/?(*.)spec.ts`.
- Integration and contract tests under `apps/app-gateway/test/**` and E2E via Playwright
  under `e2e/` for critical user journeys.
- CI gates: `npm run test:ci` MUST pass with coverage ≥ 90% lines/branches for touched areas.
- Tests MUST be deterministic, isolated, and fast; avoid network/file I/O in unit tests.

Rationale: TDD produces decoupled, verifiable designs and prevents regressions.

### III. Domain‑Driven Design (DDD)
Design around the domain and bounded contexts. Use the ubiquitous language.

- Model Entities, Value Objects, Domain Services in `libs/<domain>/` per bounded context.
- Aggregates define transactional consistency; expose intent via commands and domain events.
- Anti‑corruption layers protect contexts from external models and APIs.
- No anemic models: business invariants enforced inside aggregates/value objects.
- Contracts between contexts expressed via shared DTOs in `libs/shared-dtos` and documented
  in `specs/` and OpenAPI where applicable.

Rationale: DDD aligns code with business, enabling evolvability and robust boundaries.

### IV. SOLID Principles & Composition Over Inheritance
Apply SOLID to maintain flexibility and reduce coupling. Prefer composition.

- SRP: Each class/module has one responsibility; split when responsibilities diverge.
- OCP: Extend via new implementations; do not modify stable abstractions for new behavior.
- LSP: Subtypes honor contracts; avoid leaky inheritance.
- ISP: Keep interfaces small; avoid fat service contracts.
- DIP: Depend on abstractions; use NestJS DI for provider wiring; no hard‑wired singletons.
- Favor pure functions and composition; inheritance only for true is‑a relationships.

Rationale: SOLID plus composition reduces ripple effects and simplifies testing.

### V. Fail‑Fast and Observability
Surface failures immediately and make systems diagnosable.

- Validate inputs at boundaries using NestJS pipes (`class-validator`) and DTO schemas.
- Fail fast on invalid state; never swallow errors. Return typed errors or throw with context.
- Timeouts, retries, and circuit breakers configured for all outbound calls (LLM, NATS, DB).
- Structured logging with correlation IDs; logs are machine‑parsable and human‑readable.
- Health checks and readiness probes required for all deployable apps in `apps/`.
- Key events and metrics are emitted for critical flows (parse, extract, score).

Rationale: Early, explicit failures localize defects; observability accelerates recovery.

## Engineering Standards

- Language: TypeScript (strict mode). Formatting via Prettier; lint via ESLint (Nx flat config).
- Project layout: Nx monorepo. Deployables in `apps/`; reusable code in `libs/`.
- Naming: Kebab‑case folders; tests end with `.spec.ts`.
- Security: No secrets in VCS. Start from `.env.example`. Review `SECURITY.md`.
- Contracts: Validate with `npm run validate:contracts` before builds.
- Versioning: Semantic Versioning for public APIs and packages; document breaking changes.
- Performance: Adhere to targets in `README.md` and HLD; justify deviations in PR.
- Dependencies: Prefer stable, well‑maintained packages; pin versions in `package-lock.json`.

## Development Workflow

1) Plan: Write spec (`specs/`) with user stories, acceptance criteria, and contracts.
2) Design: Create plan in `specs/<feature>/plan.md`; define data model and quickstart.
3) TDD: Write failing unit/integration tests first; then implement; refactor.
4) Review: PRs MUST include rationale, tests, and updated docs; respect module boundaries.
5) CI: `npm run lint`, `npm run typecheck`, `npm run test:ci` mandatory gates.
6) Release: Version bump per SemVer; update changelog and affected docs.

## Governance
The Constitution supersedes conflicting practices. Exceptions require explicit, time‑boxed
justifications documented in PRs with mitigation plans.

- Amendment Procedure: Propose a PR modifying this file with rationale and impact assessment.
  Approval required from Tech Lead and one peer reviewer. Provide migration plan when needed.
- Versioning Policy (this document): Semantic Versioning
  - MAJOR: Remove/redefine principles or governance in incompatible ways.
  - MINOR: Add principles/sections or materially expand guidance.
  - PATCH: Non‑semantic clarifications or editorial fixes.
- Compliance: Reviewers verify TDD, DDD placement, SOLID adherence, fail‑fast and
  observability. CI enforces lint, type checks, tests, and boundaries.
- Review Cadence: Quarterly governance review; track exceptions and retire them promptly.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): first adoption date assumed 2025-10-23 | **Last Amended**: 2025-10-23
