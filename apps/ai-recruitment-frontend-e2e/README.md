# E2E Tests - AI Recruitment Clerk

## Overview

This directory contains Playwright end-to-end tests for the AI Recruitment Clerk frontend application.

## Setup Requirements

### Prerequisites

1. **Node.js**: Version 20.18.0 or higher
2. **npm**: Version 10.0.0 or higher
3. **Playwright Browsers**: Install via `npx playwright install --with-deps`

### Local Development

For local development, the E2E tests use the Angular dev server with live reload:

```bash
# Run E2E tests with dev server (default)
npm run test:e2e
```

The dev server will be started automatically by Playwright's webServer configuration on port 4200.

### CI Environment

In CI (GitHub Actions), the tests use a pre-built static server for faster startup:

1. Frontend is built with `--configuration=production`
2. Static files are served using `nx run ai-recruitment-frontend:serve-static`
3. Port defaults to 4200 (configurable via `DEV_SERVER_PORT` env var)

### Running Tests Manually

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test src/simple-test.spec.ts

# Run with headed browser (useful for debugging)
npx playwright test --headed

# Run with UI mode (interactive debugging)
npx playwright test --ui

# Run in debug mode
npx playwright test --debug
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PLAYWRIGHT_BASE_URL` | Base URL for the application | `http://localhost:4200` |
| `DEV_SERVER_PORT` | Port for the dev/static server | `4200` |
| `E2E_SKIP_WEBSERVER` | Skip Playwright webServer startup | `false` |
| `E2E_USE_REAL_API` | Use real API instead of mock server | `false` |
| `E2E_ENABLE_FIREFOX` | Enable Firefox test project | `false` |
| `CI` | CI mode flag (auto-set in GitHub Actions) | `false` |

### Mock Server

The E2E tests use a mock API server (Express.js) that provides mock data for testing:

- Health check: `GET /api/health`
- Jobs: `GET /api/jobs`, `POST /api/jobs`, etc.
- Upload: `POST /api/upload/resume`
- Gap analysis: `POST /api/scoring/gap-analysis`

The mock server is started automatically by `global-setup.ts` before tests run.

### Test Files

Test files are located in `src/` and follow the pattern `*.spec.ts`:

- `simple-test.spec.ts` - Basic app loading tests
- `core-user-flow.spec.ts` - Core user journey tests
- `console-errors.spec.ts` - Console error detection
- `diagnostic.spec.ts` - Diagnostic tests
- And more...

## Debugging

### View Test Results

```bash
# Open HTML report
npx playwright show-report
```

### Debug Failed Tests

Failed tests generate:
- Screenshots (in `test-results/`)
- Videos (in `test-results/`)
- Traces (if configured)

### Common Issues

1. **Port conflicts**: Ensure no other service is using port 4200
2. **Browser installation**: Run `npx playwright install --with-deps`
3. **Build failures**: Ensure `npm run build` passes before E2E tests

## CI Integration

The E2E tests run in GitHub Actions as part of the `e2e_smoke` job in `.github/workflows/ci.yml`.

Timeout settings:
- Job timeout: 40 minutes
- Dev server startup: 60 seconds (static), 300 seconds (dev)
- Individual test: 30 seconds
- Global timeout: 15 minutes

## Recent Changes

- **US-009**: Improved E2E configuration for CI reliability
  - Switched from manual dev server startup to Playwright's built-in webServer
  - Static server used in CI for faster startup
  - Dev server used for local development with live reload
  - Simplified global-setup.ts (no more detached processes)
  - Updated CI workflow to build frontend before E2E tests
