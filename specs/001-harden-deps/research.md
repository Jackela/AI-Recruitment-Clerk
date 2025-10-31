# Dependency Vulnerability Hardening – Research Notes

## Decision 1: Prioritize upgrading vulnerable packages over mitigation
- **Decision**: Apply available patched versions or replace vulnerable packages to eliminate high/moderate CVEs instead of relying on long-term mitigations.
- **Rationale**: Spec requires zero outstanding high/mod vulnerabilities at release. Upgrades remove findings permanently and keep CI green without manual overrides.
- **Alternatives Considered**:
  - Accepting moderate vulnerabilities with compensating controls (rejected—spec mandates full remediation before release).
  - Forking packages for custom patches (deferred—use only if upstream fix unavailable within release window).

## Decision 2: Use staged dependency update workflow across Nx projects
- **Decision**: Update shared dependencies centrally (root `package.json`, shared libs) first, then adjust app-specific packages with targeted PRs, validating after each stage.
- **Rationale**: Nx monorepo shares configurations; staged approach limits blast radius and keeps CI cycles manageable.
- **Alternatives Considered**:
  - Massive single update sweep (rejected—higher regression risk and harder to troubleshoot failures).
  - Per-app isolated updates without shared baseline (rejected—duplicate effort and risk of drift).

## Decision 3: Validate remediation via full CI + security workflows
- **Decision**: Run unit, integration, contract, E2E, and security jobs (dependency-scan, secret-scan, CodeQL) after updates to confirm no regressions and that vulnerability counts drop to zero.
- **Rationale**: Spec mandates high confidence in stability; existing pipelines already codify required validations.
- **Alternatives Considered**:
  - Relying solely on npm audit locally (rejected—misses integration/contract regressions).
  - Limiting validation to affected services (rejected—dependencies often shared; full pipeline ensures coverage).
