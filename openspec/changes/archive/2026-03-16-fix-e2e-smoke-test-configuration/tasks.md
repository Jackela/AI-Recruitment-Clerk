## 1. Update Playwright Configuration

- [x] 1.1 Increase webServer timeout from 30s to 60s in `playwright.config.ts`
- [x] 1.2 Add better error handling and logging for server startup failures
- [x] 1.3 Verify webServer command points to correct build output path
- [x] 1.4 Ensure `reuseExistingServer` works correctly with CI environment

## 2. Update CI Workflow (ci.yml)

- [x] 2.1 Add pre-test cleanup step to kill any processes on port 4200
- [x] 2.2 Replace simple curl check with comprehensive health check script
- [x] 2.3 Increase health check timeout from 60s to 90s for production builds
- [x] 2.4 Add detailed logging for each CI phase (build, server start, health check, tests)
- [x] 2.5 Add step to output server logs on health check failure
- [x] 2.6 Verify server is properly stopped after tests complete (with `always()` condition)

## 3. Enhance Global Setup

- [x] 3.1 Add server readiness verification in `global-setup.ts` when `E2E_SKIP_WEBSERVER=true`
- [x] 3.2 Add detailed logging for connection attempts and failures
- [x] 3.3 Add retry logic with exponential backoff for server connection
- [x] 3.4 Verify environment variables are correctly set for external server mode

## 4. Create Health Check Script

- [x] 4.1 Create `scripts/health-check-server.mjs` utility script
- [x] 4.2 Implement HTTP connectivity check with retry logic
- [x] 4.3 Add Angular app content verification (`<app-root>` or `arc-root` check)
- [x] 4.4 Add comprehensive logging for debugging
- [x] 4.5 Support configurable timeout and retry parameters

## 5. Test and Verify

- [x] 5.1 Run E2E tests locally with `E2E_SKIP_WEBSERVER=true`
- [x] 5.2 Verify health check script works correctly
- [x] 5.3 Test CI workflow changes in a feature branch
- [x] 5.4 Verify tests can connect to server and execute successfully
- [x] 5.5 Confirm proper error messages when server fails to start
