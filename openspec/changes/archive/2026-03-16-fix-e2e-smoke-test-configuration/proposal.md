## Why

The E2E smoke tests are failing quickly (~1m20s) after the build succeeds, preventing reliable CI/CD verification. The tests cannot properly connect to the frontend server due to configuration mismatches between the CI workflow, Playwright configuration, and missing server health checks. This prevents the team from catching frontend integration issues before deployment.

## What Changes

- Fix Playwright configuration to properly handle CI environment with pre-started static server
- Update CI workflow to ensure proper server startup verification before running tests
- Add comprehensive error handling and logging for server readiness checks
- Increase server startup timeouts to account for production build serving delays
- Remove redundant server management that conflicts with Playwright's webServer config
- Ensure tests can find and connect to the built frontend static files

## Capabilities

### New Capabilities

- `e2e-server-health-check`: Robust health check system for verifying frontend server readiness before test execution
- `e2e-ci-configuration`: Proper CI/CD integration for Playwright tests with external static server

### Modified Capabilities

- `e2e-test-execution`: Update test execution flow to work with pre-built production frontend in CI

## Impact

- **CI/CD Pipeline**: The `e2e_smoke` job in `.github/workflows/ci.yml` will be updated
- **Playwright Configuration**: `apps/ai-recruitment-frontend-e2e/playwright.config.ts` will be refactored
- **Test Execution**: Tests will run against production build instead of development server
- **No Breaking Changes**: Existing local development workflow remains unchanged
