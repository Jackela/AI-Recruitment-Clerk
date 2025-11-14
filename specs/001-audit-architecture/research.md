# Research – Holistic Architecture Governance Program

## Task: Research module inventory automation for Nx monorepo
- **Decision**: Use `nx graph --file` and `nx show projects --json` to generate a machine-readable inventory that maps every app/lib/script along with tags/implicit dependencies.
- **Rationale**: Nx already stores canonical project metadata (`project.json`, `nx.json` tags). Leveraging built-in graph commands guarantees coverage, respects SSOT, and avoids bespoke parsers.
- **Alternatives considered**:
  - Manual curation of a spreadsheet (error-prone, quickly outdated, violates SSOT).
  - Parsing `workspace.json`/`angular.json` directly (legacy files not guaranteed across Nx versions).

## Task: Find best practices for encoding SSOT/SOLID/DDD scoring
- **Decision**: Represent each principle as a checklist with binary pass/fail plus optional severity weighting, stored per component under `specs/001-audit-architecture/inventory/<component>.md`.
- **Rationale**: Checklists make expectations explicit, enable independent reviewers, and support evidence links. Severity weighting lets us prioritize remediation backlog.
- **Alternatives considered**:
  - Numeric maturity scales (harder to explain to stakeholders, invites subjective debate).
  - Free-form audit notes (difficult to compare, no consistent gating signal).

## Task: Research remediation planning governance
- **Decision**: Maintain a remediation backlog in `specs/001-audit-architecture/remediation.yaml` capturing finding IDs, owners, due dates, milestones, and CI evidence links, then sync high-severity items into the main issue tracker for execution.
- **Rationale**: YAML keeps the program source-controlled while enabling automation (scripts can parse and push status to dashboards). Syncing to tracker ensures delivery teams cannot ignore obligations.
- **Alternatives considered**:
  - Exclusive reliance on external PM tools (breaks traceability between audit evidence and tasks).
  - Keeping remediation tasks inside scattered README files (hard to aggregate, no accountability fields).

## Task: Patterns for achieving CI parity between `act` and GitHub Actions
- **Decision**: Treat `.actrc` as SSOT for runner images and secrets, mirror workflow matrices via `act --matrix`, and add a parity check step that compares `act` logs to the latest GitHub Actions run summary before allowing merge.
- **Rationale**: Aligning runner images/secrets ensures local simulations faithfully reproduce remote behavior. Explicit parity checks catch drifts (e.g., new job added upstream) before reviewers rely on outdated local results.
- **Alternatives considered**:
  - Only run `act` on a subset of jobs (risks missing failures introduced in untouched jobs).
  - Skip `act` entirely and rely on remote CI (contradicts spec requirement for pre-PR validation and slows iteration).

## Task: Determine storage for validation run evidence
- **Decision**: Store validation run manifests under `specs/001-audit-architecture/validation/<timestamp>.json` capturing commit SHA, local test results, `act` outcome, and remote Actions URL.
- **Rationale**: JSON artifacts are easy to diff, script, and reference from PR templates. Keeping them versioned proves compliance with “no merge without recorded passing results.”
- **Alternatives considered**:
  - Embedding results only in PR comments (lost once PR closes, not queryable offline).
  - Logging outputs in CI artifacts without repo history (hard to audit later, depends on retention policies).
