# Quickstart: CI/CD, Quality Gates, Migration & Gray Release

This guide explains how to run gates locally, deploy to pre-release, perform gray rollout, and rollback.

## Prerequisites
- Node.js ≥ 20.18
- npm ci
- Environments: pre-release, production (credentials configured)
- Anonymous real samples (resume×JD) prepared for validation

## Local Quality Gates
- Build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm run test` (unit/integration)
- E2E smoke: `npm run test:e2e`
- Typecheck: `npm run typecheck`

## Pre-release Deployment (one-click)
1. Merge to main (gates pass).
2. Deploy to pre-release; smoke tests auto-run.
3. Verify dashboards (latency, error rate, funnel).

## Gray Rollout (production)
1. Enable feature flag (disabled by default).
2. Set rollout percentage to 1% -> 5% -> 25% -> 50% -> 100%.
3. Monitor KPIs: scoring success, suggestion usability, error rate (±5% window).

## Ops Endpoint Auth (optional)
- If `OPS_API_KEY` is set, pass `x-ops-key: $OPS_API_KEY` on requests to `/ops/*`.
- Permissions are enforced in non-test environments; ensure calling user has required permissions.

## Rollback & Kill Switch
- Rollback to previous artifact.
- Use Kill Switch to force-disable feature if needed.
- All actions are audited.

## Privacy & Audit
- Do not log PII or raw resume/JD.
- Keep only anonymized fragments and metrics.
