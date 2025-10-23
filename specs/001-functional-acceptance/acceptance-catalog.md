# Acceptance Catalog

**Purpose**: Index of P1 journeys and P2 feature acceptance cases with stable IDs and traceability to FR/US/SC.

## ID Schemes

- Acceptance Case ID: `CASE-<GROUP>-<NNN>` where GROUP is `P1J` (P1 Journey) or `P2F` (P2 Feature)
  - Examples: `CASE-P1J-001`, `CASE-P2F-014`
- Run ID: `RUN-YYYYMMDD-NN` (two‑digit sequence per day)
- Evidence Files: `[CASE_ID]_[step|result]_<SEQ>.(png|mp4|md)`

## P1 Journeys (must be 100% accepted per SC‑001)

Candidate entries derived from repository structure (confirm or adjust titles/outcomes):

| Case ID | Journey Title | Expected Outcome (summary) | FR/US refs | SC refs |
|---------|----------------|----------------------------|------------|---------|
| CASE-P1J-001 | Upload resume (frontend → gateway) | Resume file accepted and queued for processing | FR‑001, US1 | SC‑001, SC‑003 |
| CASE-P1J-002 | Parse resume → candidate profile | Structured profile generated from resume with key fields populated | FR‑001, US1 | SC‑001, SC‑003 |
| CASE-P1J-003 | Score candidate profile | Candidate score produced using current model version | FR‑001, US1 | SC‑001, SC‑003 |
| CASE-P1J-004 | Search and filter candidates | Results list returned matching filters with pagination | FR‑001, US1 | SC‑001, SC‑003 |
| CASE-P1J-005 | Generate candidate report | Downloadable/shareable report created for selected candidate | FR‑001, US1 | SC‑001, SC‑003 |

## P2 Features (≥95% pass per SC‑002)

Candidate entries derived from repository structure (confirm or adjust):

| Case ID | Feature | Expected Outcome (summary) | FR refs | SC refs |
|---------|---------|----------------------------|---------|---------|
| CASE-P2F-001 | JD extractor from job description | Relevant entities extracted from pasted JD text | FR‑002 | SC‑002 |
| CASE-P2F-002 | Bulk resume upload | Multiple resumes accepted; progress and results recorded | FR‑002 | SC‑002 |
| CASE-P2F-003 | Report customization options | Report includes selected sections/branding | FR‑002 | SC‑002 |
| CASE-P2F-004 | Usage/quota limits | Clear acceptance expectations when quota exceeded | FR‑002 | SC‑002 |
| CASE-P2F-005 | Scoring model version selection | Case records model version used in output | FR‑002 | SC‑002 |
| CASE-P2F-006 | Audit/report history retrieval | Prior generated reports can be listed and accessed | FR‑002 | SC‑002 |

## Notes

- Known data caveats impacting cases should be listed here with mitigation.
- Feature flag enablement instructions must be referenced per case when applicable.

## Index (Cases → Evidence → Runs)

| Case ID | Evidence (pattern) | Runs (example) |
|---------|---------------------|----------------|
| CASE-P1J-001 | evidence/YYYY-MM-DD/RUN-ID/CASE-P1J-001_result_01.png | runs/RUN-YYYYMMDD-01.json |
| CASE-P1J-002 | evidence/YYYY-MM-DD/RUN-ID/CASE-P1J-002_result_01.png | runs/RUN-YYYYMMDD-01.json |
| CASE-P1J-003 | evidence/YYYY-MM-DD/RUN-ID/CASE-P1J-003_result_01.png | runs/RUN-YYYYMMDD-01.json |
| CASE-P1J-004 | evidence/YYYY-MM-DD/RUN-ID/CASE-P1J-004_result_01.png | runs/RUN-YYYYMMDD-01.json |
| CASE-P1J-005 | evidence/YYYY-MM-DD/RUN-ID/CASE-P1J-005_result_01.png | runs/RUN-YYYYMMDD-01.json |
| CASE-P2F-001 | evidence/YYYY-MM-DD/RUN-ID/CASE-P2F-001_result_01.png | runs/RUN-YYYYMMDD-01.json |
| CASE-P2F-002 | evidence/YYYY-MM-DD/RUN-ID/CASE-P2F-002_result_01.png | runs/RUN-YYYYMMDD-01.json |
| CASE-P2F-003 | evidence/YYYY-MM-DD/RUN-ID/CASE-P2F-003_result_01.png | runs/RUN-YYYYMMDD-01.json |
| CASE-P2F-004 | evidence/YYYY-MM-DD/RUN-ID/CASE-P2F-004_result_01.png | runs/RUN-YYYYMMDD-01.json |
| CASE-P2F-005 | evidence/YYYY-MM-DD/RUN-ID/CASE-P2F-005_result_01.png | runs/RUN-YYYYMMDD-01.json |
| CASE-P2F-006 | evidence/YYYY-MM-DD/RUN-ID/CASE-P2F-006_result_01.png | runs/RUN-YYYYMMDD-01.json |
