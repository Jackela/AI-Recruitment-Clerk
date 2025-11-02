# Branch Protection and Required Checks

To maintain high quality and safe releases, configure branch protection for `main`:

## Required status checks
- CI (workflow: `ci`)
  - lint
  - typecheck
  - build
  - test_coverage
  - e2e_smoke
  - pii_scan
- Affected CI (workflow: `ci-affected`)
  - affected (job runs lint/test/build/e2e for changed projects)

## Additional workflows
- e2e-nightly: full end-to-end run on a schedule; not required for PR merge.
- migration-rehearsal: manual; uploads migration logs and reports as artifacts.

## Enforcement
- Require branches up to date before merging (optional if using `ci-affected`).
- Enforce code owners on `config/quality-gates.json`.
- Block PR merge on failed checks.

## Notes
- Ops endpoints require `x-ops-key` when `OPS_API_KEY` is set; see `docs/pivot/ops-auth.md`.
- Ensure secrets and environment variables are configured in repository settings for CD workflows.

