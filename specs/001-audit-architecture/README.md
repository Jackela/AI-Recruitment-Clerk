# Holistic Architecture Governance Workspace

This directory stores the artifacts required to audit every Nx project against SSOT, SOLID, and DDD principles, plan remediations, and enforce validation gates.

| Folder | Purpose |
|--------|---------|
| `inventory/` | Generated Nx inventory (components.json, per-component checklists, supplementary graph dumps). |
| `findings/` | Markdown summaries of best-practice violations with evidence and severity. |
| `validation/` | Validation manifests, parity reports, and supporting logs for local + remote CI runs. |
| `templates/` | Reusable checklist, manifest, and reporting templates referenced by the governance tooling. |
| `docs/` | Playbooks, handbooks, and decision records referenced by all user stories. |

Additional files:
- `plan.md`, `spec.md`, `tasks.md`: canonical SpecKit artifacts for this feature.
- `checklists/`: specification quality confirmations.

Run `npm run gov:inventory` and `npm run gov:validate` from the repo root to engage the governance tooling as it becomes available.
