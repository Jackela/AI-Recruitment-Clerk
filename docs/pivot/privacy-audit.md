# Privacy and Audit Policy

This document defines privacy constraints and auditing for release/rollout operations and scoring features.

## Privacy Constraints
- Do not log raw resume/JD text or PII (email, phone, IDs) in application logs or build artifacts.
- Use redaction helpers for any user-provided content displayed in logs.
- CI includes a PII scan step that fails on potential PII in outputs.

## Auditing
- Audit events for ops endpoints (deploy, rollout, rollback, flag updates) are recorded to `tools/logs/audit/audit-YYYY-MM-DD.jsonl`.
- Each entry includes timestamp, actor (from `x-user-id`), action (HTTP verb), target (URL), status, and latency.
- Export endpoint: `GET /ops/audit/export?date=YYYY-MM-DD` returns recent audit entries.

## Access and Retention
- Access to audit exports is restricted to operators.
- Retain audit logs for the minimum required operational period; rotate daily.

## Redaction Utilities
- Use `libs/infrastructure-shared/src/privacy/redaction.util.ts` for text/object redaction.
- Avoid including payloads in audit logs; if necessary, redact before writing.

