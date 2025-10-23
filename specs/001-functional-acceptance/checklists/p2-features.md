# P2 Features — Acceptance Cases

Purpose: Authoritative acceptance cases for P2 features to achieve ≥95% pass rate per SC‑002.

References: FR-002, SC-002, D-002, environment.md, acceptance-catalog.md

How to use
- Create one section per Acceptance Case using the template below.
- Use IDs from `acceptance-catalog.md` (CASE-P2F-###).
- Result states per spec D‑002 (Pass / Fail / Blocked). Do not redefine here; link to spec.

---

## Template

### CASE-P2F-XXX — <Feature Title>
- Spec refs: FR‑002; SC‑002; D‑002
- Preconditions: <data/setup>; Environment: pre‑release; Flags: <on/off>
- Steps:
  1. <step>
  2. <step>
- Expected Outcome: <concise, objective>
- Evidence: `evidence/YYYY-MM-DD/RUN-ID/CASE-P2F-XXX_result_01.png` (add more as needed)
- Result: Pass | Fail | Blocked
- Notes: <optional>

---

## Seed Cases (placeholders)

### CASE-P2F-001 — <Feature>
- Spec refs: FR‑002; SC‑002; D‑002
- Preconditions: <setup>
- Steps:
  1. …
  2. …
- Expected Outcome: …
- Evidence: `evidence/<date>/<run>/CASE-P2F-001_result_01.png`
- Result: Pass | Fail | Blocked

### CASE-P2F-002 — <Feature>
- Spec refs: FR‑002; SC‑002; D‑002
- Preconditions: <setup>
- Steps:
  1. …
  2. …
- Expected Outcome: …
- Evidence: `evidence/<date>/<run>/CASE-P2F-002_result_01.png`
- Result: Pass | Fail | Blocked

---

## Stub Cases (from acceptance-catalog.md)

### CASE-P2F-001 — JD extractor from job description
- Spec refs: FR‑002; SC‑002; D‑002
- Preconditions: Sample JD text; Environment: pre‑release
- Steps:
  1. Open JD extractor UI and paste a representative job description.
  2. Run extraction and wait for completion.
  3. View extracted entities/fields in the results panel.
- Expected Outcome: Relevant entities extracted from pasted JD text
- Evidence: `evidence/<date>/<run>/CASE-P2F-001_result_01.png`
- Result: Pass | Fail | Blocked
- Enablement: If feature‑flagged, set flags in `runs/RUN-ID.json` → `flags: { <flag>: true }`.
- Exception: Extraction service unavailable → Blocked; link incident.

### CASE-P2F-002 — Bulk resume upload
- Spec refs: FR‑002; SC‑002; D‑002
- Preconditions: Multiple resume files; Environment: pre‑release
- Steps:
  1. Open bulk upload and select multiple valid resume files.
  2. Start upload and monitor progress for all items.
  3. Confirm all files reach a terminal state (accepted/failed) with reasons.
- Expected Outcome: Multiple resumes accepted; progress and results recorded
- Evidence: `evidence/<date>/<run>/CASE-P2F-002_result_01.png`
- Result: Pass | Fail | Blocked
- Enablement: If feature‑flagged, configure per run JSON.
- Exception: Queue/back‑end down → Blocked.

### CASE-P2F-003 — Report customization options
- Spec refs: FR‑002; SC‑002; D‑002
- Preconditions: Candidate profile; Environment: pre‑release
- Steps:
  1. Open report generation with a candidate selected.
  2. Choose customization options (sections/branding).
  3. Generate preview and confirm selected options appear.
- Expected Outcome: Report includes selected sections/branding
- Evidence: `evidence/<date>/<run>/CASE-P2F-003_result_01.png`
- Result: Pass | Fail | Blocked
- Enablement: If feature‑flagged, configure per run JSON.
- Exception: Rendering service failure → Blocked.

### CASE-P2F-004 — Usage/quota limits
- Spec refs: FR‑002; SC‑002; D‑002
- Preconditions: Quota near limit; Environment: pre‑release
- Steps:
  1. Perform actions approaching the quota limit.
  2. Trigger an action exceeding the limit.
  3. Observe the quota limit acceptance behavior (message/defer) as specified.
- Expected Outcome: Clear acceptance expectations when quota exceeded
- Evidence: `evidence/<date>/<run>/CASE-P2F-004_result_01.png`
- Result: Pass | Fail | Blocked
- Enablement: If feature‑flagged, configure per run JSON.
- Exception: Quota service unreachable → Blocked.

### CASE-P2F-005 — Scoring model version selection
- Spec refs: FR‑002; SC‑002; D‑002
- Preconditions: Multiple model versions available; Environment: pre‑release
- Steps:
  1. Select a scoring model version (if configurable) or view the default.
  2. Score a candidate profile.
  3. Confirm the recorded model version is present in results.
- Expected Outcome: Case records model version used in output
- Evidence: `evidence/<date>/<run>/CASE-P2F-005_result_01.png`
- Result: Pass | Fail | Blocked
- Enablement: If feature‑flagged, configure per run JSON.
- Exception: Model registry down → Blocked.

### CASE-P2F-006 — Audit/report history retrieval
- Spec refs: FR‑002; SC‑002; D‑002
- Preconditions: Prior reports exist; Environment: pre‑release
- Steps:
  1. Navigate to report history/audit view.
  2. Retrieve the list of prior generated reports.
  3. Open at least one historical report entry to confirm accessibility.
- Expected Outcome: Prior generated reports can be listed and accessed
- Evidence: `evidence/<date>/<run>/CASE-P2F-006_result_01.png`
- Result: Pass | Fail | Blocked
- Enablement: If feature‑flagged, configure per run JSON.
- Exception: History store unreachable → Blocked.
