# Quality Gates and Approvals

This document defines the mandatory quality gates for PRs and main builds and how they are enforced.

## Gates
- Lint: `npm run lint` must pass with no errors.
- Typecheck: `npm run typecheck` must pass.
- Coverage: Minimum threshold from `config/quality-gates.json` (lines/statements) enforced.
- E2E smoke: `npm run test:e2e` runs for smoke where required.

## Central Configuration
- File: `config/quality-gates.json`
  - `coverage`: required minimum (0–1)
  - `lintErrors`: 0 required
  - `typecheck`: true/false
  - `requireE2ESmoke`: true/false

## CI Integration
- Workflow: `.github/workflows/ci.yml`
- Script: `tools/ci/verify-quality-gates.mjs` reads `config/quality-gates.json` and executes required steps.

## Approvals
- Threshold changes require review by release owners via `.github/CODEOWNERS`.

## Privacy
- PII scanning via `tools/ci/pii-scan.mjs` may be enabled in CI to ensure no PII appears in build outputs.

