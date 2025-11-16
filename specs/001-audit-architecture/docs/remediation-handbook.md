# Remediation Ownership & Escalation Handbook

1. **Assignment Rules**
   - Every high-severity finding must have a named engineering owner (person or squad) and a due date.
   - Medium/low severity items inherit the owning team from the component but may defer to quarterly planning.
2. **Escalation Path**
   - If a remediation remains `planned` with no progress for >14 days, escalate to the architecture governance lead.
   - Blocked items require an entry in the governance decision log plus an updated due date.
3. **Status Definitions**
   - `planned`: scoped and scheduled but not started.
   - `in-progress`: implementation underway.
   - `ready-for-validation`: awaiting CI/validation run.
   - `verified`: validation manifest attached and accepted.
   - `blocked`: waiting on dependency or failing validation.
4. **Validation Workflow**
   - Before moving to `ready-for-validation`, ensure verification steps list the exact commands/tests (e.g., `npm run gov:validate`).
   - Attach manifest IDs to the remediation entry once validation succeeds.
5. **Reporting**
   - Use `node tools/ci/governance/report-remediation-coverage.mjs` to confirm ≥90% of high-severity findings have owners + due dates.
   - Include coverage snapshots in decision logs for audit trails.
