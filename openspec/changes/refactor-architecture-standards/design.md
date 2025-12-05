# Design Notes: SSOT + SOLID + DDD Refactor

## Current Observations
- Nx monorepo mixes domain, infrastructure, and UI in `apps/` with limited shared guidance in `libs/`.
- Config files (.envs, JSON, shell scripts) repeat values (ports, queue names, feature toggles).
- Services often reach directly into data sources rather than through domain abstractions, hindering SOLID compliance.
- Test coverage varies and some flows (resume parsing, candidate pipeline) miss integration testing entirely.

## Target Architecture
1. **Bounded Contexts**: Define contexts like `candidate-management`, `job-matching`, `workflow-automation`, and house all domain logic under `libs/<context>/domain|application|infrastructure` folders.
2. **Layering**: Controllers/Angular components depend on application services; application services orchestrate domain aggregates; infrastructure adapters implement interfaces behind factories.
3. **SSOT Configuration**: Create `libs/configuration` (or similar) exporting typed config. Runtime services and scripts read from this module rather than ad-hoc env parsing.
4. **Module Boundaries**: Use Nx `tags` + `enforce-module-boundaries` to restrict imports (e.g., UI cannot import infrastructure, only application contracts).

## Testing Strategy
- **Unit**: Per bounded context, cover aggregates, services, and adapters using Jest with dependency injection/mocks.
- **Integration**: Target cross-context workflows (e.g., candidate submission through scoring) with in-memory or containerized dependencies.
- **E2E**: Maintain Playwright flows to validate top hiring scenarios.
- **Quality Gates**: Introduce coverage thresholds (≥85%) and require all suites in CI.

## Risks & Mitigations
- Large refactor scope: mitigate via phased tasks and per-context pull requests.
- Legacy contracts: provide compatibility adapters until consumers migrate.
- Test flakiness: stabilize fixtures and mock external services deterministically.

## Open Questions
- Exact list of bounded contexts (to be finalized during Task 1).
- Service-level SLOs that might influence architecture (pending stakeholder input).
