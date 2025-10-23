# Defect Process and Severity Taxonomy

This document defines defect severity levels, triage, and re‑verification aligned with the
feature specification and success criteria.

## Severity Levels (S1–S4)

- S1 — Critical: Blocking core functionality or data loss; no acceptable workaround. Stops
  acceptance. Must be fixed before release.
- S2 — High: Major functionality impaired with limited workaround; high user impact.
- S3 — Medium: Non‑critical functional variance; reasonable workaround exists; moderate impact.
- S4 — Low: Minor issues including cosmetic or trivial behavior with low impact.

Notes:
- For acceptance “Pass” (D‑002), zero open S1/S2 is required.
- Sign‑off gate G1 enforces zero S1/S2 open on P1 journeys (SC‑001).

## Triage & Tracking

- Log defects with: title, environment, steps to reproduce, expected vs actual behavior,
  severity (S1–S4), evidence links, and owner.
- Link defects to Acceptance Case IDs for traceability.

## Re‑verification Workflow

1) Fix delivered and linked to defect ticket.
2) Re‑run the original Acceptance Case steps.
3) Update the run JSON with the new result and evidence.
4) Close or re‑open defect accordingly.

## Reopen Rate (SC‑004)

- Definition: reopened_count / closed_count during the acceptance window.
- Sampling Window: From first acceptance run start to sign‑off date.
- Counting Rules:
  - Include all severities S1–S4.
  - Count a defect once per close→reopen transition.
  - Exclude duplicates merged into a canonical ticket.
- Report Location: Sign‑off report under “Metrics & Sampling”.

