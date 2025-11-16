# Quickstart – Holistic Architecture Governance Program

## 1. Inventory Every Component
1. Install dependencies: `npm ci` (Node.js 20.18 required).
2. Generate the enforced inventory + coverage artifacts:
   ```bash
   npm run gov:inventory
   ```
   - Produces `inventory/components.json`, regenerates per-component checklist markdown, and fails if any project lacks SSOT/SOLID/DDD evidence or a valid `ownerTeam`.
3. Manual adjustments (if needed):
   ```bash
   npx nx graph --file specs/001-audit-architecture/inventory/graph.json
   npx nx show projects --json > specs/001-audit-architecture/inventory/projects.json
   ```
4. Curate checklist evidence in `specs/001-audit-architecture/inventory/<project>.md`; rerun `npm run gov:inventory` until coverage passes.

## 2. Record Findings & Remediation
1. Log violations in `specs/001-audit-architecture/findings/*.md` using the data-model fields (component, principle, severity, evidence).
2. Add remediation entries to `specs/001-audit-architecture/remediation.yaml` with owners, milestones, verification steps, and dependencies.
3. Reference findings/remediations in PR templates or issue tracker tickets for accountability.

## 3. Run Validation Pipelines
1. Execute the governance validation runner (wraps lint/unit/typecheck/E2E + remediation checks):
   ```bash
   npm run gov:validate
   ```
   - Stores manifests under `specs/001-audit-architecture/validation/<timestamp>.json`.
   - Fails when any suite fails or remediation coverage drops below 90%.
2. Simulate GitHub Actions with parity checks:
   ```bash
   act --workflows .github/workflows/ci.yml --secret-file .act.secrets
   ```
   - Ensure `.actrc` mirrors the remote runner image (ubuntu-latest) and matrices.
   - The parity utility (`tools/ci/governance/compare-ci-results.mjs`) flags missing secrets/services and marks manifests as `blocked` until resolved.
3. The `gov:validate` script automatically records results; attach logs under `specs/001-audit-architecture/validation/<timestamp>-act.log` for reference.

## 4. Open PR and Enforce Gates
1. Push branch `001-audit-architecture` and open a PR referencing the latest validation manifest.
2. Wait for GitHub Actions to complete; compare with local `act` outcome.
3. If results diverge:
   - Update `.actrc`/workflow secrets to match remote env.
   - Re-run local suites and `act`.
   - Append discrepancy notes to the validation manifest.
4. Merge only when both local and remote runs pass all jobs; otherwise close PR and continue remediation.

## 5. Maintain Decision Logs
- Append governance decisions (audit scope changes, waived findings, tooling updates) to `specs/001-audit-architecture/decisions.md` with timestamps.
- Update `research.md` when new dependencies or practices emerge; rerun `/speckit.plan` if scope shifts materially.
- Capture remediation coverage excerpts from `tools/ci/governance/report-remediation-coverage.mjs` to prove SC-002 compliance.
