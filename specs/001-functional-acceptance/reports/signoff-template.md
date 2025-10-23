# Acceptance Sign‑off Report

**Run ID**: RUN-YYYYMMDD-NN  
**Date**: YYYY‑MM‑DD  
**Environment**: pre-release (see environment.md)  
**Scope**: P1 + P2 (per FR‑006)

## Summary

- P1 Journeys Accepted: X / X (100% required)
- P2 Acceptance Cases Passed: Y% (≥ 95% required), remaining tracked with ETA
- Critical Defects (Sev‑1/2) Open: 0 required
- Reopen Rate (SC‑004): Z% (≤ 10% target)

## Hard Gates (must be satisfied)

- Gate G1 (SC‑001): 100% of P1 journeys accepted with evidence; zero Sev‑1/2 open → [Pass|Fail]
- Gate G2 (SC‑002): ≥ 95% of acceptance cases across P1+P2 marked Pass → [Pass|Fail]
- Gate G3 (FR‑003): Run metadata complete (date, executor, environment, evidence refs, result) → [Pass|Fail]
- Gate G4 (FR‑007): Joint sign‑off required → [Pass|Fail]

If any gate fails, release is BLOCKED until resolved or an exception is approved per governance.

## Metrics & Sampling

- SC‑004 Reopen Rate = reopened_count / closed_count during the acceptance window.
- Window: From first acceptance run start to sign‑off date.
- Counting rules:
  - Include severities S1–S4.
  - Count per close→reopen transition per defect.
  - Exclude duplicates merged into a canonical ticket.
- Evidence Sampling (SC‑003): Provide time‑anchored proof for a representative sample of P1 journeys (or all, if feasible) showing start/stop timing.

## Evidence & Traceability

- Catalog index: specs/001-functional-acceptance/acceptance-catalog.md
- Evidence root: specs/001-functional-acceptance/evidence/YYYY-MM-DD/RUN-ID/
- Runs JSON: specs/001-functional-acceptance/runs/RUN-ID.json

## Approvals

- Product Owner: __________________  Date: __________
- QA Lead:       __________________  Date: __________
