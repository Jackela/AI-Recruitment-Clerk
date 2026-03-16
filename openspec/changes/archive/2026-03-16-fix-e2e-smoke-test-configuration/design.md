## Context

The E2E smoke tests in the CI pipeline are failing immediately after build completion with the following issues:

1. **Playwright webServer configuration mismatch**: The `webServer` block is disabled when `E2E_SKIP_WEBSERVER=true`, but the CI manually starts the server. This creates confusion about which component is responsible for server management.

2. **Insufficient server startup verification**: The CI waits for port 4200 to respond, but doesn't verify the Angular app is actually serving content, leading to connection refused errors when tests start.

3. **Short timeout for production build**: The webServer timeout is set to 30 seconds, which may be insufficient for serving a production Angular build with all optimizations.

4. **Missing health check endpoint**: No systematic way to verify the frontend is ready to accept requests before starting tests.

5. **Port binding race conditions**: Multiple processes may compete for port 4200 during test initialization.

Current state:

- CI builds the frontend with `npx nx build ai-recruitment-frontend --configuration=production`
- CI starts static server with `npx nx run ai-recruitment-frontend:serve-static --port 4200`
- CI sets `E2E_SKIP_WEBSERVER=true` to prevent Playwright from starting its own server
- Tests fail with connection errors before executing any test code

## Goals / Non-Goals

**Goals:**

- Ensure E2E tests can reliably connect to the frontend server in CI
- Add proper health checks to verify server readiness before test execution
- Increase server startup timeouts to handle production build serving delays
- Provide clear error messages when server startup fails
- Maintain compatibility with local development workflow
- Reduce E2E test flakiness due to server connectivity issues

**Non-Goals:**

- Changing test logic or test assertions
- Adding new test cases
- Modifying the frontend application code
- Changing the build process
- Adding new browsers or test environments

## Decisions

### 1. Keep CI-managed server with `E2E_SKIP_WEBSERVER=true`

**Rationale**: The CI workflow already manages the static server lifecycle (start before tests, stop after tests). This provides better control and allows for health check verification.

**Alternative considered**: Let Playwright manage the server via webServer config. Rejected because it would require significant CI refactoring and lose the explicit health check step.

### 2. Add comprehensive server health check with HTML content verification

**Rationale**: Simply checking if port 4200 responds to HTTP isn't sufficient. We need to verify the Angular app has actually bootstrapped by checking for key elements in the response.

**Implementation**:

- Check HTTP status code 200
- Verify response contains `<app-root>` or `arc-root` element
- Verify response contains Angular bootstrap indicators
- Retry with exponential backoff for up to 60 seconds

### 3. Increase webServer timeout from 30s to 60s in CI

**Rationale**: Production builds with optimization and minification take longer to start serving, especially in resource-constrained CI environments.

### 4. Use `npx serve` command directly in Playwright config as fallback

**Rationale**: If running locally without `E2E_SKIP_WEBSERVER`, we need a simple, reliable static file server that doesn't require complex nx setup.

**Command**: `npx serve dist/apps/ai-recruitment-frontend/browser -l ${devServerPort} -s`

### 5. Add detailed logging for server startup phases

**Rationale**: Current failures provide minimal debugging information. Adding logs for each phase (build complete, server starting, health check, tests starting) will help diagnose issues quickly.

### 6. Keep `reuseExistingServer: !process.env['CI']` for local development

**Rationale**: In local development, if a dev server is already running, Playwright should use it. In CI, always use the freshly started server.

## Risks / Trade-offs

**[Risk] Increased CI execution time due to health check polling**
→ Mitigation: Health check has 60-second timeout with early exit on success. Most builds will pass health check within 5-10 seconds.

**[Risk] Health check passes but tests still fail due to timing**
→ Mitigation: Add explicit wait for hydration in test fixtures and global setup. Use Playwright's built-in retry mechanisms.

**[Risk] Port conflicts if cleanup fails between CI runs**
→ Mitigation: Add pre-test cleanup step to kill any processes on port 4200. Use `lsof` or `fuser` to identify and terminate lingering processes.

**[Risk] Static server fails to start but health check doesn't detect it**
→ Mitigation: Check both HTTP response status and content. Log server stdout/stderr for debugging.

**[Trade-off] Using external server adds complexity vs Playwright-managed server**
→ Acceptance: The trade-off is worth it for the explicit health check and CI control benefits.

## Migration Plan

1. Update `playwright.config.ts`:
   - Increase webServer timeout to 60 seconds
   - Add better error messages for server startup failures
   - Keep webServer config for local development

2. Update CI workflow (`.github/workflows/ci.yml`):
   - Add comprehensive server health check with content verification
   - Add pre-test cleanup for port 4200
   - Increase health check timeout to 60 seconds
   - Add logging for each phase

3. Update `global-setup.ts`:
   - Add server readiness verification for external mode
   - Log connection attempts and failures

4. Test the changes:
   - Run E2E tests locally with `E2E_SKIP_WEBSERVER=true`
   - Verify CI workflow passes
   - Confirm tests connect successfully to server

## Open Questions

1. Should we add a dedicated `/health` endpoint to the frontend build output for easier health checking?
   - Decision: No, checking for `<app-root>` is sufficient for now.

2. What is the acceptable failure threshold before marking E2E as failed?
   - Decision: Current retry count (2 retries in CI) is sufficient. No changes needed.

3. Should we parallelize server startup with other CI tasks?
   - Decision: No, server must be ready before tests. Current sequential approach is correct.
