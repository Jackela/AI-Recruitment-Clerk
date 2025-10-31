# Quickstart – Dependency Vulnerability Hardening

## Prerequisites
- Node.js 20.18+
- npm 10+
- Existing repository checkout on branch `001-harden-deps`
- Access to security tooling credentials (if required by CI jobs)

## Setup
1. Install dependencies:
   ```bash
   npm ci
   ```
2. Verify baseline security scan results:
   ```bash
   npm run dependency-scan
   ```
3. Review current vulnerability inventory in `data/security/dependency-inventory.json` or `act-security-deps.log` (if populated from `npm run dependency-scan`).

## Remediation Workflow
1. Generate the vulnerability inventory snapshot and gate summary:
   ```bash
   npm audit --audit-level=moderate --json > data/security/dependency-inventory.json
   node scripts/dependency-gate.mjs
   ```
2. Identify vulnerable packages using the generated JSON + gate output. For each affected package, determine patched versions and update `package.json` / lockfile accordingly (use `npm install <pkg>@<version>` or overrides where necessary).
3. After applying updates, run validation suites:
   ```bash
   npm run lint
   npm run test
   npm run test:e2e
   npm run validate:contracts
   npm run dependency-scan
   ```
4. Update `docs/security/dependency-remediation.md` with owner assignments, timelines, and verification evidence. Log SLA timestamps in the "Remediation SLA Tracking" section.
5. Repeat steps 1–4 until dependency scans report zero high/moderate findings and the release gate summary status is `clear`.

## Release Gate Verification
1. Trigger the GitHub Actions `dependency-scan` job (via `act` locally or CI) to ensure the release gate returns `isBlocked: false`.
2. Re-run the gate locally for confirmation:
   ```bash
   npm audit --audit-level=moderate --json > data/security/dependency-inventory.json
   node scripts/dependency-gate.mjs
   cat data/security/release-gate-summary.json
   ```
3. Update `docs/security/release-gate-status.md` with the latest gate outcome and share with the security board for final approval.

## Troubleshooting
- If an upgrade introduces regressions, isolate changes using Nx affected commands (`npx nx affected:test`) and adjust dependency versions or apply patches.
- For unavailable patches, escalate to security governance to determine acceptable temporary controls or vendor timelines—deployment remains blocked until resolved.
