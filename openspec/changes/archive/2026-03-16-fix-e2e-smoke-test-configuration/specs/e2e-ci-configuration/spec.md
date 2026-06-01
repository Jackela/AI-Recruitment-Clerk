## ADDED Requirements

### Requirement: CI workflow starts static server before E2E tests

The CI workflow SHALL start the static file server for the production build before running E2E tests.

#### Scenario: Server startup in CI

- **WHEN** the E2E smoke job runs in CI
- **AND** the frontend has been built with production configuration
- **THEN** the CI SHALL start the static server using `npx nx run ai-recruitment-frontend:serve-static`
- **AND** the server SHALL be started on port 4200

### Requirement: CI workflow verifies server readiness

The CI workflow SHALL verify the server is ready to accept requests before starting tests.

#### Scenario: Pre-test health check

- **WHEN** the static server has been started
- **THEN** the CI SHALL run a comprehensive health check
- **AND** the health check SHALL verify HTTP 200 response
- **AND** the health check SHALL verify Angular app content
- **AND** the CI SHALL only proceed to tests after health check passes

#### Scenario: Health check timeout

- **WHEN** the health check does not pass within 60 seconds
- **THEN** the CI SHALL output the server logs
- **AND** the CI SHALL fail the job with a descriptive error

### Requirement: CI workflow stops server after tests

The CI workflow SHALL stop the static server after E2E tests complete, regardless of test results.

#### Scenario: Cleanup after tests

- **WHEN** E2E tests complete (pass or fail)
- **THEN** the CI SHALL terminate the static server process
- **AND** the CI SHALL verify the port is released

### Requirement: CI workflow sets correct environment variables

The CI workflow SHALL set environment variables that configure Playwright to use the pre-started server.

#### Scenario: Environment configuration

- **WHEN** the E2E tests are executed
- **THEN** the environment variable `E2E_SKIP_WEBSERVER` SHALL be set to `"true"`
- **AND** the environment variable `CI` SHALL be set to `"true"`
- **AND** Playwright SHALL connect to the external server instead of starting its own

### Requirement: Playwright configuration handles CI mode

The Playwright configuration SHALL properly handle the CI mode with external server.

#### Scenario: External server mode

- **WHEN** `E2E_SKIP_WEBSERVER` is set to `"true"`
- **THEN** Playwright SHALL NOT start its own webServer
- **AND** Playwright SHALL use the configured baseURL (http://localhost:4200)
- **AND** Playwright SHALL connect to the externally managed server

#### Scenario: Local development mode

- **WHEN** `E2E_SKIP_WEBSERVER` is not set or is `"false"`
- **THEN** Playwright SHALL start its own webServer
- **AND** Playwright SHALL serve the pre-built frontend files
- **AND** Playwright SHALL wait for the server to be ready before starting tests
