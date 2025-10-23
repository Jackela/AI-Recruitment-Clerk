# Evidence Guidelines

Authoritative conventions for acceptance evidence artifacts.

## Filenames

- Pattern: `[CASE_ID]_[step|result]_NN.(png|mp4|md)`
- `NN` starts at `01` and increments per artifact.
- Store under: `evidence/<YYYY-MM-DD>/<RUN_ID>/`

## Required Content

- Each artifact must clearly indicate the step/result it supports.
- For SC‑003 timing verification, evidence MUST include time‑anchored proof:
  - Timestamped screenshots, or
  - Screen recordings showing start/stop events

## Examples

- `CASE-P1J-001_step_01.png`
- `CASE-P1J-001_result_01.mp4`

## Cross‑References

- See `specs/001-functional-acceptance/spec.md` D‑003 for authoritative naming rules.
- See `specs/001-functional-acceptance/runs/README.md` for run metadata structure.

