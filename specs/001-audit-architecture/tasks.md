# Tasks: Holistic Architecture Governance Program

**Input**: Design documents from `/specs/001-audit-architecture/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the documentation and tooling scaffolding required for governance work.

- [X] T001 Scaffold governance workspace directories (inventory/, findings/, validation/, templates/, docs/) and overview README in `specs/001-audit-architecture/README.md`
- [X] T002 Add repository-local ignore rules for generated graphs and validation logs in `specs/001-audit-architecture/.gitignore`
- [X] T003 [P] Register npm workspace scripts (`gov:inventory`, `gov:validate`) in `package.json` pointing to forthcoming governance tooling

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared tooling and schemas that every user story depends on.

- [X] T004 Implement Nx inventory extraction CLI at `tools/ci/governance/collect-inventory.mjs` (runs `nx graph` + `nx show projects --json`)
- [X] T005 [P] Define system data-model schema covering components/findings/remediations/validation runs in `specs/001-audit-architecture/schemas/data-model.schema.json`
- [X] T006 [P] Create validation run manifest schema enforcing parity fields in `specs/001-audit-architecture/validation/manifest-schema.json`
- [X] T007 Enforce ownership requirements by extending `tools/ci/governance/collect-inventory.mjs` to fail when any component lacks `ownerTeam` or remains `UNASSIGNED`

**Checkpoint**: Inventory CLI + schemas validated; user stories can proceed independently.

---

## Phase 3: User Story 1 – Portfolio-wide Architecture Audit (Priority: P1) 🎯 MVP

**Goal**: Provide a repeatable workflow that inventories all Nx projects and records SSOT/SOLID/DDD compliance with evidence.

**Independent Test**: Running `npm run gov:inventory` produces updated `inventory/components.json`, generates/updates per-component checklists, and fails if any project lacks SSOT/SOLID/DDD evidence files.

### Implementation

- [X] T008 [P] [US1] Generate machine-readable component inventory via the CLI and commit output to `specs/001-audit-architecture/inventory/components.json`
- [X] T009 [P] [US1] Author SSOT/SOLID/DDD checklist template with severity guidance in `specs/001-audit-architecture/templates/principle-checklist.md`
- [X] T010 [P] [US1] Implement checklist generator script at `tools/ci/governance/write-checklists.mjs` that creates/updates `specs/001-audit-architecture/inventory/<component>.md`
- [X] T011 [US1] Add coverage enforcement to `tools/ci/governance/collect-inventory.mjs` so `npm run gov:inventory` fails when any component lacks checklist evidence or unresolved violations
- [X] T012 [US1] Document the audit execution playbook (inputs, reviewers, evidence capture cadence) in `specs/001-audit-architecture/docs/audit-playbook.md`
- [X] T013 [US1] Record baseline findings for top-tier services in `specs/001-audit-architecture/findings/app-gateway.md`, `specs/001-audit-architecture/findings/ai-recruitment-frontend.md`, and `specs/001-audit-architecture/findings/resume-parser-svc.md`

**Checkpoint**: US1 outputs (inventory file, checklist automation, coverage gate, sample findings) reviewed and independently testable.

---

## Phase 4: User Story 2 – Remediation Planning & Tracking (Priority: P2)

**Goal**: Convert findings into an accountable remediation backlog with owners, milestones, and acceptance criteria.

**Independent Test**: `specs/001-audit-architecture/remediation.yaml` validates against schema, lists high-severity findings with owners/dates, and `npm run gov:validate` reports ≥90% high-severity coverage.

### Implementation

- [X] T014 [P] [US2] Create remediation backlog schema including milestones and verification steps in `specs/001-audit-architecture/schemas/remediation.schema.json`
- [X] T015 [US2] Seed `specs/001-audit-architecture/remediation.yaml` with backlog entries linking to US1 findings and governance milestones
- [X] T016 [P] [US2] Implement remediation file validator CLI at `tools/ci/governance/validate-remediation.mjs` invoked by `npm run gov:validate`
- [X] T017 [US2] Publish ownership & escalation handbook detailing workflows at `specs/001-audit-architecture/docs/remediation-handbook.md`
- [X] T018 [P] [US2] Build coverage reporter at `tools/ci/governance/report-remediation-coverage.mjs` to calculate the percentage of high-severity findings with owners/due dates and fail when <90%

**Checkpoint**: US2 artifacts validated; remediation backlog ready for tracking with coverage metrics.

---

## Phase 5: User Story 3 – Validation & Merge Control (Priority: P3)

**Goal**: Guarantee no branch merges until local suites, `act`, and GitHub Actions all pass with recorded manifests and parity checks.

**Independent Test**: Updating any remediation branch runs lint/unit/integration/typecheck/E2E via `npm run gov:validate`, stores manifests in `specs/001-audit-architecture/validation/`, and both `act` + GitHub Actions enforce parity before merges.

### Implementation

- [ ] T019 [US3] Align `.actrc` runner images, secrets file references, and workflow selection with `.github/workflows/ci.yml`
- [ ] T020 [P] [US3] Add parity comparison utility recording local vs remote CI status at `tools/ci/governance/compare-ci-results.mjs`
- [ ] T021 [US3] Implement validation runner script at `tools/ci/governance/run-quality-gates.mjs` to execute `npm run lint`, `npm run test`, `npm run test:e2e`, and `npm run typecheck`
- [ ] T022 [US3] Integrate the validation runner into `npm run gov:validate` and emit suite summaries plus parity metadata into `specs/001-audit-architecture/validation/<timestamp>.json`
- [ ] T023 [P] [US3] Enhance the parity utility to detect missing secrets/services, flag manifests as `blocked`, and capture remediation notes before re-run
- [ ] T024 [US3] Update `.github/workflows/ci.yml` to invoke the validation runner, upload manifests, verify parity results, and block merges on failure
- [ ] T025 [US3] Provide validation manifest template + documentation in `specs/001-audit-architecture/validation/manifest-template.json` and example log references

**Checkpoint**: US3 gating workflow proven locally and remotely.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, decision tracking, and consistency checks across stories.

- [ ] T026 Refresh `specs/001-audit-architecture/quickstart.md` with final CLI commands, coverage enforcement, parity expectations, and troubleshooting steps
- [ ] T027 [P] Seed initial governance decision log entries (audit scope, parity policy, coverage thresholds) in `specs/001-audit-architecture/decisions.md`
- [ ] T028 [P] Extend `tools/ci/verify-quality-gates.mjs` to assert presence of the latest validation manifest before allowing merges

---

## Dependencies & Execution Order

1. **Phase 1 → Phase 2**: Setup tasks must complete before tooling/schemas are meaningful.
2. **Phase 2 → User Stories**: Inventory CLI + schemas (including ownership enforcement) are prerequisites for US1–US3.
3. **User Story Order**: Execute US1 (inventory + coverage) first, then US2 (remediation + coverage metrics), then US3 (validation gates). US2 depends on findings from US1; US3 depends on outputs from both earlier stories.
4. **Polish Phase**: Runs after all user stories to align docs and CI safety checks.

## Parallel Opportunities

- T003, T005, T006, T007, T008, T009, T010, T014, T016, T018, T020, T023, T027, and T028 touch distinct files and can run in parallel once their prerequisites finish.
- After Phase 2 completes, different contributors can own US1, US2, and US3 concurrently, provided they respect data handoffs (e.g., US2 consumes findings committed by US1).

## Independent Test Criteria by Story

- **US1**: `npm run gov:inventory` regenerates `inventory/components.json`, emits/updates per-component checklists, and fails if any component lacks SSOT/SOLID/DDD evidence. Sample findings exist for high-impact services.
- **US2**: `npm run gov:validate` validates `remediation.yaml`, and `tools/ci/governance/report-remediation-coverage.mjs` reports ≥90% of high-severity findings with owners/dates.
- **US3**: A sample branch runs the validation runner locally and in CI, generates manifests with suite results + parity status, `.actrc` matches workflow images, and merges are blocked when parity or suites fail.

## Suggested MVP Scope

Deliver **User Story 1 (Portfolio-wide Architecture Audit)** after completing Phases 1–3. This provides immediate visibility into architectural debt and unlocks remediation planning.

## Implementation Strategy

1. Complete Phases 1–2 to establish tooling, schemas, and ownership enforcement.
2. Deliver US1 as MVP; verify coverage enforcement and sample findings.
3. Layer US2 to convert findings into an actionable backlog with measurable coverage.
4. Finish with US3 to harden validation + merge gates, ensuring all suites run before parity checks.
5. Use Phase 6 polish tasks to update quickstart, decision logs, and CI safeguards.
