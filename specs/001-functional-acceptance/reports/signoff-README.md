# Sign‑off Instructions

Use this guide to complete the acceptance sign‑off for feature `001-functional-acceptance`.

## Documents

- Template: `specs/001-functional-acceptance/reports/signoff-template.md`
- Runs JSON: `specs/001-functional-acceptance/runs/RUN-YYYYMMDD-NN.json`
- Evidence root: `specs/001-functional-acceptance/evidence/YYYY-MM-DD/RUN-ID/`
- Defect process & severity: `specs/001-functional-acceptance/defect-process.md`

## Gates (Must Pass)

- G1 (SC‑001): 100% P1 journeys accepted; 0 open S1/S2.
- G2 (SC‑002): ≥ 95% overall acceptance Pass.
- G3 (FR‑003): Run metadata complete and linked.
- G4 (FR‑007): PO + QA Lead signatures.

## SC‑004 Reopen Rate

- Calculate as `reopened_count / closed_count` during the acceptance window.
- See the “Metrics & Sampling” section in the sign‑off template for counting rules.

## Procedure

1) Populate the sign‑off template with current run stats and links.
2) Verify gates and metrics, including evidence sampling for SC‑003.
3) Obtain PO and QA Lead approvals and archive the report.

## Scope Changes During Acceptance

- Any change to the accepted scope (adding/removing journeys/features) MUST be recorded with
  rationale and approvals.
- Update `acceptance-catalog.md` and affected checklists to reflect changes.
- Re-baseline SC‑002 targets if scope changes materially impact total case counts; document
  the adjustment in the sign‑off report.

## Automation

- Generate acceptance status snapshot:
  - `npm run acceptance:status`
  - Options: `-- -FeatureDir "specs/001-functional-acceptance" -OutName "acceptance-status-<date>.md"`
- Generate sign-off report from a run JSON:
  - `npm run acceptance:signoff -- -RunId RUN-YYYYMMDD-NN`
  - or: `npm run acceptance:signoff -- -RunFile specs/001-functional-acceptance/runs/RUN-YYYYMMDD-NN.json`
