## ADDED Requirements

### Requirement: Coverage Benchmarks
Each Nx project MUST maintain at least 85% statement coverage for unit tests and publish coverage reports in CI artifacts.

#### Scenario: Coverage gate enforced in CI
- **WHEN** `npm run test` executes in CI
- **THEN** coverage thresholds of ≥85% statements (and ≥80% branches) are enforced per project
- **AND** the pipeline fails if any project drops below the threshold

### Requirement: Integration and E2E Regression Suites
Critical workflows MUST be validated by integration and end-to-end suites that run on every PR and nightly.

#### Scenario: Hiring funnel regression passes
- **GIVEN** the candidate intake → scoring → interview scheduling workflow
- **WHEN** integration/e2e tests run via `npm run test:integration` and `npm run test:e2e`
- **THEN** they exercise the full workflow with deterministic fixtures
- **AND** failures block merges until resolved

### Requirement: Documented Regression Checklist
A regression checklist MUST describe required commands, data setup, and ownership so releases follow a repeatable process.

#### Scenario: Release engineer follows documented steps
- **WHEN** preparing a release candidate
- **THEN** the engineer can run the documented regression checklist to execute lint, unit, integration, e2e, and smoke tests
- **AND** the checklist references the SSOT configuration and expected artifacts
