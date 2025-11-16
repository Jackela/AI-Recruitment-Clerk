# Architecture Audit Playbook

1. Run `npm run gov:inventory` to refresh project list, graph, and ownership validation.
2. Run `node tools/ci/governance/write-checklists.mjs` to materialize checklists for any new projects.
3. For each component:
   - Review existing checklist entry in `specs/001-audit-architecture/inventory/<component>.md`.
   - Interview owners to confirm SSOT/SOLID/DDD evidence.
   - Record findings (PASS/FAIL status + links) directly in the checklist.
   - Where failures exist, log a remediation entry in `remediation.yaml` and cross-reference from the checklist.
4. Store supporting logs or diagrams under `docs/` if they are shared between components.
5. After completing all components, run `npm run gov:inventory` again to ensure no coverage gaps remain (the script will fail if any checklist is missing or incomplete).
