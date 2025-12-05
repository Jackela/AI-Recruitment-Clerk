# Align CI And Local Parity

## Summary
We will introduce a single set of CI helper scripts (bootstrap, per-phase runner, and full pipeline orchestrator) that both GitHub Actions and local developers call. The change also formalizes documentation so every engineer runs the same sequence that CI enforces, eliminating "works locally" drift.

## Why Now
- GitHub Actions jobs in `.github/workflows/ci.yml` duplicate environment variables and sequencing, making it easy for local steps to diverge.
- Developers lack a one-command ritual before opening a PR; they must remember each `npm run …` invocation.
- The user explicitly asked for a KISS workflow where AI/automation only needs to run a single script to complete CI.

## Current Constraints
- Node 20.18.0 is pinned via `.nvmrc` and GitHub Actions currently hardcodes `node-version: '20'`.
- E2E smoke tests rely on Playwright browsers and its Docker image; local runs must install browsers up front.
- Governance tooling outputs artifacts that CI uploads—local runs must still produce the same files for comparison.

## Proposed Changes
1. **Bootstrap script** to export shared CI env (`CI=true`, `NX_DAEMON=false`, etc.) and enforce the `.nvmrc` version.
2. **Phase runner script** that wraps existing npm commands (lint, typecheck, build, coverage, e2e, pii, governance) with logging, playwright install, and error handling.
3. **Full pipeline script + npm alias** that executes all phases sequentially; GitHub Actions jobs call the per-phase script while developers run `npm run ci:full`.
4. **Documentation updates** (README variants) describing the workflow, expected artifacts, and when to rely on `act`.

## Success Criteria
- `npm run ci:full` succeeds on a clean checkout using the same Node version as CI.
- GitHub Actions references only the new scripts (no duplicated env scaffolding) and continues to pass.
- Documentation clearly states the pre-push checklist and AI automation entrypoint.

## Open Questions
- Should the Playwright container image also be runnable locally via a helper script, or is installing browsers sufficient?
- Do we need an additional spec for nightly or deployment workflows, or can they reuse the same runner later?

