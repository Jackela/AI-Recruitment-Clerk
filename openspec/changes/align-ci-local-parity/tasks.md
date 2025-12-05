# Tasks

1. [x] Inventory current CI jobs, environment variables, and npm scripts; capture any gaps that scripts must cover.
2. [x] Implement `scripts/ci/bootstrap-env.sh` and `scripts/ci/run-phase.sh` (`lint`, `typecheck`, `build`, `test`, `coverage`, `e2e`, `pii`, `governance`).
3. [x] Add `scripts/ci/run-all.sh` plus npm aliases (e.g., `ci:full`, `ci:phase:<name>`), ensuring `set -euo pipefail` and consistent logging.
4. [x] Update `.github/workflows/ci.yml` (and any dependent workflows) to call the new scripts instead of inline commands.
5. [x] Update README + README.zh-CN with instructions for running `npm run ci:full`, mapping outputs, and when to use `act`.
6. [x] Verify locally: executed `scripts/ci/run-phase.sh lint`, `scripts/ci/run-phase.sh e2e` (Docker-backed), and `scripts/ci/run-phase.sh governance` to produce Playwright reports plus `specs/001-audit-architecture/validation/*` manifests; governance parity step now only fails when integration/e2e are skipped (expected unless `GOVERNANCE_RUN_*` overrides are provided).
7. [x] Run `openspec validate align-ci-local-parity --strict` and ensure all tasks above are marked complete before implementation ends.
