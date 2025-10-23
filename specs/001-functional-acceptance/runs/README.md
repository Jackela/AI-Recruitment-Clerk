# Acceptance Run Metadata

**Authoritative Schema**: See D‑004 in `specs/001-functional-acceptance/spec.md`.

## Run ID Format

- `RUN-YYYYMMDD-NN` where `NN` is a two‑digit sequence starting at 01 per day

## Evidence Filenames

- Use `[CASE_ID]_[step|result]_NN.(png|mp4|md)` where `NN` starts at 01 per case artifact.
- Aligns with D‑003 in `specs/001-functional-acceptance/spec.md` and `evidence-guidelines.md`.

## JSON Structure

```json
{
  "id": "RUN-20251023-01",
  "date": "2025-10-23T10:30:00Z",
  "executor": "<name or role>",
  "environment": "pre-release",
  "flags": { "<flagName>": true },
  "dataset": "seed-2025-10-22#abc123",
  "cases": [
    { "caseId": "CASE-P1J-001", "result": "Pass", "evidence": ["evidence/2025-10-23/RUN-20251023-01/CASE-P1J-001_result_01.png"] }
  ]
}
```
