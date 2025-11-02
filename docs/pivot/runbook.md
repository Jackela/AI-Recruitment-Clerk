# Incident Runbook & Kill Switch

## Scope
- Release/rollback failures, gray rollout anomalies, elevated error rates, privacy incidents.

## Immediate Actions
- Engage on-call. Identify last successful deploy and current change.
- If incident correlates to new feature:
  - Use Kill Switch (feature flag) to disable user-facing paths.
  - Reduce gray rollout percentage to 0%.
- If deploy regression:
  - Trigger rollback job (production) to last known-good artifact.

## Diagnostics
- Check observability funnels (`/ops/observability/funnels`) and impact (`/ops/impact`).
- Review audit logs via `/ops/audit/export?date=YYYY-MM-DD`.
- Verify CI/CD logs for the failing build.

## Recovery
- After rollback/kill switch, confirm stability in observability dashboards.
- Draft remediation steps and file an incident report.

## Prevention
- Add failing scenarios to smoke/regression suites.
- Adjust thresholds in `config/quality-gates.json` via code-review.

