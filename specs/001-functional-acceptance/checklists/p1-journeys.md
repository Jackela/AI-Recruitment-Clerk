# P1 Journeys — Acceptance Cases

Purpose: Authoritative acceptance cases for P1 user journeys. These are not implementation tests; they define the scenario, expected outcome, evidence, and result states for acceptance.

References: FR-001, FR-005, SC-001, SC-003, D-002, D-006, environment.md, acceptance-catalog.md

How to use
- Create one section per Acceptance Case using the template below.
- Use IDs from `acceptance-catalog.md` (CASE-P1J-###).
- Measure duration per SC‑003 from first actionable UI to final expected outcome; include timestamps in evidence.
- Result states per spec D‑002 (Pass / Fail / Blocked). Do not redefine here; link to spec.

---

## Template

### CASE-P1J-XXX — <Journey Title>
- Spec refs: FR‑001, FR‑005; SC‑001, SC‑003; D‑002, D‑006
- Preconditions: <account/data>; Environment: pre‑release; Flags: <on/off>
- Steps:
  1. <step>
  2. <step>
- Expected Outcome: <concise, objective>
- Evidence: `evidence/YYYY-MM-DD/RUN-ID/CASE-P1J-XXX_result_01.png` (add more as needed)
- Result: Pass | Fail | Blocked
- Notes: <optional>

---

## Seed Cases (placeholders)

### CASE-P1J-001 — <Journey name>
- Spec refs: FR‑001, FR‑005; SC‑001, SC‑003; D‑002, D‑006
- Preconditions: Test account available; Environment: pre‑release; Flags: <list>
- Steps:
  1. …
  2. …
- Expected Outcome: …
- Evidence: `evidence/<date>/<run>/CASE-P1J-001_result_01.png`
- Result: Pass | Fail | Blocked

### CASE-P1J-002 — <Journey name>
- Spec refs: FR‑001, FR‑005; SC‑001, SC‑003; D‑002, D‑006
- Preconditions: Test account available; Environment: pre‑release; Flags: <list>
- Steps:
  1. …
  2. …
- Expected Outcome: …
- Evidence: `evidence/<date>/<run>/CASE-P1J-002_result_01.png`
- Result: Pass | Fail | Blocked

---

## Stub Cases (from acceptance-catalog.md)

### CASE-P1J-001 — Upload resume (frontend → gateway)
- Spec refs: FR‑001, FR‑005; SC‑001, SC‑003; D‑002, D‑006
- Preconditions: Test account available; Environment: pre‑release; Flags: <list>
- Steps:
  1. Open the upload UI and select a valid resume file (e.g., PDF/DOCX).
  2. Submit the file and observe client-side confirmation of receipt.
  3. Confirm server acknowledges upload and enqueues processing (UI message/logged status).
- Expected Outcome: Resume file accepted and queued for processing
- Evidence: `evidence/<date>/<run>/CASE-P1J-001_result_01.png`
- Result: Pass | Fail | Blocked
- Alternate/Recovery: If an invalid file is selected, user guidance allows selecting a valid
  file and proceeding within SC‑003 timing; acceptance remains Pass.
- Exception: External storage or gateway outage → Result: Blocked with incident/defect link.

### CASE-P1J-002 — Parse resume → candidate profile
- Spec refs: FR‑001, FR‑005; SC‑001, SC‑003; D‑002, D‑006
- Preconditions: Test account; a valid resume sample; Environment: pre‑release
- Steps:
  1. Navigate to the profile parsing status for the uploaded resume.
  2. Trigger or observe parsing completion.
  3. Open the generated candidate profile view.
- Expected Outcome: Structured profile generated from resume with key fields populated
- Evidence: `evidence/<date>/<run>/CASE-P1J-002_result_01.png`
- Result: Pass | Fail | Blocked
- Alternate/Recovery: If parsing warns on minor fields, user may retry with a different
  sample; acceptance remains Pass if core fields populate.
- Exception: Model service unavailable → Blocked; log and re‑run after recovery.

### CASE-P1J-003 — Score candidate profile
- Spec refs: FR‑001, FR‑005; SC‑001, SC‑003; D‑002, D‑006
- Preconditions: Parsed candidate profile available; Environment: pre‑release
- Steps:
  1. From the candidate profile, request scoring.
  2. Wait for scoring to complete.
  3. View the calculated score and associated model version.
- Expected Outcome: Candidate score produced using current model version
- Evidence: `evidence/<date>/<run>/CASE-P1J-003_result_01.png`
- Result: Pass | Fail | Blocked
- Alternate/Recovery: If score requires refresh due to stale data, user can refresh and
  complete within SC‑003.
- Exception: Scoring service timeout → Blocked with incident/defect link.

### CASE-P1J-004 — Search and filter candidates
- Spec refs: FR‑001, FR‑005; SC‑001, SC‑003; D‑002, D‑006
- Preconditions: Candidate data available; Environment: pre‑release
- Steps:
  1. Open search, enter a query and apply at least one filter.
  2. Submit search and paginate if needed.
  3. Inspect that results match filters and ordering rules.
- Expected Outcome: Results list returned matching filters with pagination
- Evidence: `evidence/<date>/<run>/CASE-P1J-004_result_01.png`
- Result: Pass | Fail | Blocked
- Alternate/Recovery: If no results returned, guidance suggests adjusting filters; acceptance
  remains Pass if expected result appears.
- Exception: Backend search dependency degraded → Blocked; re‑run later.

### CASE-P1J-005 — Generate candidate report
- Spec refs: FR‑001, FR‑005; SC‑001, SC‑003; D‑002, D‑006
- Preconditions: Candidate selected; Environment: pre‑release
- Steps:
  1. From a candidate profile, choose report generation.
  2. Select required sections/options.
  3. Generate and download/view the report output.
- Expected Outcome: Downloadable/shareable report created for selected candidate
- Evidence: `evidence/<date>/<run>/CASE-P1J-005_result_01.png`
- Result: Pass | Fail | Blocked
- Alternate/Recovery: If a section selection is invalid, user reselects and proceeds within
  SC‑003.
- Exception: Report service outage → Blocked; link incident and re‑run.
