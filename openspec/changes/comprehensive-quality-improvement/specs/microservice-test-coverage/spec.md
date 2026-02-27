## ADDED Requirements

### Requirement: Minimum test coverage threshold

All microservices SHALL maintain a minimum of 80% test coverage.

#### Scenario: CI verifies test coverage

- **WHEN** CI runs tests for a microservice
- **THEN** coverage report SHALL be generated
- **AND** build SHALL fail if coverage is below 80%

#### Scenario: Coverage report includes all source files

- **WHEN** generating coverage report
- **THEN** all source files in src/ directory SHALL be included
- **AND** test files SHALL be excluded from coverage calculation

### Requirement: Unit tests for message handlers

All NATS message handlers SHALL have unit tests.

#### Scenario: Resume parser message handler test

- **WHEN** testing resume-parser-svc message handler
- **THEN** test SHALL verify successful resume parsing
- **AND** test SHALL verify error handling for invalid input

#### Scenario: JD extractor message handler test

- **WHEN** testing jd-extractor-svc message handler
- **THEN** test SHALL verify successful JD extraction
- **AND** test SHALL verify skill extraction accuracy

### Requirement: Service layer unit tests

All service classes SHALL have unit tests for public methods.

#### Scenario: Scoring engine service test

- **WHEN** testing scoring-engine-svc
- **THEN** test SHALL verify scoring algorithm correctness
- **AND** test SHALL verify edge cases (empty resume, missing skills)

#### Scenario: Report generator service test

- **WHEN** testing report-generator-svc
- **THEN** test SHALL verify report generation for all formats
- **AND** test SHALL verify template rendering

### Requirement: Integration tests for external API calls

Services calling external APIs (Gemini, OpenAI) SHALL have integration tests with mocked responses.

#### Scenario: Gemini API integration test

- **WHEN** testing Gemini API integration
- **THEN** test SHALL use recorded/mocked responses
- **AND** test SHALL verify proper error handling for API failures
