# Tasks: Dependency Vulnerability Hardening

**Input**: Design documents from `/specs/001-harden-deps/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included only where the user stories explicitly require validation steps.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish working context and capture the vulnerability baseline

- [X] T001 Review existing findings in `act-security-deps.log` to catalogue current high/moderate vulnerabilities and affected packages.
- [X] T002 Create `docs/security/dependency-remediation.md` with sections for remediation records, approvals, and release gate notes.
- [X] T003 Export `npm audit --json` output into `data/security/dependency-inventory.json` for traceable vulnerability tracking.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Harden CI workflows so user stories can rely on enforced dependency gates

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Update `.github/workflows/security.yml` to fail when dependency scans report any high or moderate severity findings.
- [X] T005 Add `scripts/dependency-gate.mjs` to aggregate scan results into a machine-readable release gate summary, including assigned remediation owners for each finding.

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Security pipeline clears dependency risks (Priority: P1) 🎯 MVP

**Goal**: Ensure automated dependency scans return zero high/moderate vulnerabilities

**Independent Test**: Run `npm run dependency-scan` and confirm `act-security-deps.log` reports zero high/moderate findings

### Implementation for User Story 1

- [X] T006 [US1] Upgrade Playwright dependencies in `package.json` and regenerate `package-lock.json` to remediate flagged CVEs.
- [X] T007 [US1] Update Vite and related build tooling versions in `package.json` to patched releases without breaking Nx builds.
- [X] T008 [US1] Bump `class-validator` versions in `package.json` and `libs/shared-dtos/package.json` to eliminate moderate vulnerabilities.
- [X] T009 [US1] Run `npm run audit` and `npm run dependency-scan`, updating `act-security-deps.log` to verify zero high/moderate findings.

**Checkpoint**: User Story 1 delivers a clean security scan and updated dependency baseline

---

## Phase 4: User Story 2 - Engineers update dependencies safely (Priority: P2)

**Goal**: Validate that dependency changes leave the platform stable across automated quality gates

**Independent Test**: Execute `npm run lint`, `npm run test`, and `npm run test:e2e`; all suites must pass without new failures

### Implementation for User Story 2

- [X] T010 [US2] Execute `npm run lint` via `package.json` and resolve lint issues introduced by dependency upgrades.
- [X] T011 [US2] Run `npm run test` and `npm run test:e2e`, capturing updated reports under `test-results/` to confirm no regressions.
- [X] T012 [US2] Synchronize job model fields in `libs/api-contracts/src/job-management/job.contracts.ts` with backend responses to clear contract validation warnings.

**Checkpoint**: User Story 2 confirms the upgraded dependencies keep the system stable and contract-compliant

---

## Phase 5: User Story 3 - Stakeholders confirm remediation before release (Priority: P3)

**Goal**: Provide stakeholders with remediation evidence and enforce release gating on resolved vulnerabilities

**Independent Test**: Trigger the release workflow (e.g., via `act -j release`) and verify `.github/workflows/release.yml` blocks until vulnerability counts are zero with documentation in place

### Implementation for User Story 3

- [X] T013 [US3] Integrate `scripts/dependency-gate.mjs` into `.github/workflows/release.yml`, ensuring release failures display the assigned remediation owner when vulnerabilities remain.
- [X] T014 [US3] Document final remediation decisions, owners, and approvals in `docs/security/dependency-remediation.md`.
- [X] T015 [US3] Publish a stakeholder summary in `docs/security/release-gate-status.md` showing resolved counts and approval timestamps.

**Checkpoint**: User Story 3 equips stakeholders with auditable records and enforced release controls

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation tidy-up

- [X] T016 Run `npm run validate:contracts` and append updated results to `act-contracts.log` for future baselines.
- [X] T017 [P] Refresh `specs/001-harden-deps/quickstart.md` steps to reflect the final remediation workflow.
- [X] T018 Log detection and remediation completion timestamps in `docs/security/dependency-remediation.md` to verify the two-business-day SLA defined in SC-002.

---

## Dependencies & Execution Order

### Phase Dependencies

| Phase | Depends On | Notes |
|-------|------------|-------|
| Setup | — | Establishes baseline artifacts |
| Foundational | Setup | CI gates rely on baseline artifacts |
| User Story 1 | Foundational | Requires enforced dependency gate |
| User Story 2 | Foundational | Runs stability checks after US1 dependencies update |
| User Story 3 | Foundational, User Story 1 | Needs zero vulnerabilities and gate script |
| Polish | All targeted stories | Final verification and documentation |

### User Story Dependency Graph

- US1 (P1) → US2 (P2)
- US1 (P1) → US3 (P3)

### Validation Checklist

- Each user story culminates in an independent test run matching the specification.
- No user story depends on undocumented work outside its phase checkpoints.

## Parallel Execution Examples

### User Story 1

```bash
# Parallel candidates once package.json edits complete:
Task: "T008 [US1] Bump class-validator versions in package.json and libs/shared-dtos/package.json"
Task: "T009 [US1] Run npm run audit and npm run dependency-scan"
```

### User Story 2

```bash
# Parallel candidates after lint fixes land:
Task: "T011 [US2] Run npm run test and npm run test:e2e"
Task: "T012 [US2] Synchronize job model fields in libs/api-contracts/src/job-management/job.contracts.ts"
```

### User Story 3

```bash
# Parallel candidates while documentation is updated:
Task: "T014 [US3] Document final remediation decisions in docs/security/dependency-remediation.md"
Task: "T015 [US3] Publish summary in docs/security/release-gate-status.md"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Deliver Phase 3 (User Story 1) to achieve a zero high/moderate vulnerability scan
3. Validate with `npm run dependency-scan` and share results for approval

### Incremental Delivery

1. US1: Achieve clean dependency scans (MVP)
2. US2: Prove stability through automated suites
3. US3: Finalize stakeholder-facing governance and release gating

### Parallel Team Strategy

- Developer A: Focus on dependency upgrades (US1) while Developer B prepares the gating automation (Foundational).
- After US1 completion, split US2 (automated validation) and US3 (stakeholder documentation) between team members following the dependency graph.

## Notes

- Tasks marked `[P]` can be executed in parallel once their prerequisites finish.
- Stop after each checkpoint to validate that the corresponding user story meets its independent test.
- Commit frequently with Conventional Commit messages aligned to the work completed.
