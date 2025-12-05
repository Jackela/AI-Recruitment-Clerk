## ADDED Requirements

### Requirement: Unified CI phase scripts
All CI jobs (lint, typecheck, build, coverage, e2e, pii, governance) MUST execute via shared bash helpers that set the same environment variables in every context.

#### Scenario: GitHub job uses phase script
- **GIVEN** `.github/workflows/ci.yml` runs on a GitHub-hosted runner
- **WHEN** any CI job executes
- **THEN** it invokes `scripts/ci/run-phase.sh <phase>` after sourcing `scripts/ci/bootstrap-env.sh`
- **AND** the script exports `CI=true`, `NX_DAEMON=false`, `NX_SKIP_NX_CACHE=true`, and honors `.nvmrc`.

### Requirement: Local CI parity command
Developers MUST have a documented command that sequentially executes every CI phase locally using the same scripts as GitHub Actions.

#### Scenario: Run full CI locally
- **GIVEN** a developer on Node 20.18.0 wants to validate changes
- **WHEN** they run `npm run ci:full`
- **THEN** the command calls `scripts/ci/run-all.sh`
- **AND** each phase reuses `scripts/ci/run-phase.sh`
- **AND** the process stops at the first failure with a non-zero exit code.

### Requirement: CI parity documentation
Project documentation MUST describe how to run the unified scripts, interpret outputs, and when to use `act` for deeper validation.

#### Scenario: README explains workflow
- **GIVEN** a contributor reads `README.md` or `README.zh-CN.md`
- **WHEN** they look at the development or contributing sections
- **THEN** they see steps for running `npm run ci:full`, per-phase commands, and optional `npm run act:ci` usage
- **AND** the docs call out expected artifacts (coverage, governance, Playwright reports).

