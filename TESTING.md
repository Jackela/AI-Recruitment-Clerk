# Testing

This project uses Jest for unit and integration-style tests, Angular TestBed for frontend unit tests, and Playwright for browser E2E flows.

## Coverage Commands

Use the documented coverage command before checking coverage-related OpenSpec tasks:

```bash
npm run test:coverage
```

The command writes the aggregate coverage report to:

- `coverage/coverage-summary.json`
- `coverage/lcov-report/index.html`

For CI-style local validation, run:

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run audit
npm run build
```

## Error Handling Test Patterns

Error handling tests should exercise observable behavior instead of only checking implementation details. Prefer these patterns:

- Correlation: build a minimal `ExecutionContext`, pass request headers through the interceptor, and assert response correlation headers and enriched errors.
- Logging: spy on the structured logger or Nest logger method that corresponds to severity, then assert context fields such as operation, trace id, request id, user id, and recovery strategies.
- Performance: mock `Date.now()` around the intercepted operation and assert duration, threshold warnings, critical alerts, and memory metadata.
- Recovery: drive circuit breaker state through success and failure sequences, then assert closed, open, half-open, fallback, and recovery-strategy behavior.
- Guards: call `handleRequest()` or `canActivate()` with expired, malformed, missing, and invalid authentication input; assert the specific exception or guest fallback behavior.
- Frontend HTTP errors: use Angular `TestBed`, mocked `ToastService`, mocked `Router`, and `lastValueFrom()` to assert retry, notification, redirect, and dedupe behavior.

## Error Handling Test Utilities

Use the existing utilities and helpers instead of recreating ad hoc equivalents:

- `ErrorCorrelationManager` from `libs/shared-dtos/src/errors/error-correlation.ts` for setting, reading, and clearing correlation context.
- `EnhancedAppException` from `libs/shared-dtos/src/errors/enhanced-error-types.ts` for standardized error assertions.
- `ErrorTransformer` from `libs/shared-dtos/src/errors/error-transformation.ts` for HTTP, database, validation, and unknown error conversion tests.
- `StructuredLoggerFactory` from `libs/shared-dtos/src/errors/structured-logging.ts` when interceptor tests need to intercept structured logger calls.
- Minimal `ExecutionContext` factories inside spec files for Nest interceptors and guards. Keep them local to each spec unless multiple files need exactly the same shape.
- RxJS `of`, `throwError`, `timer`, and `lastValueFrom` for interceptor success, failure, timeout, retry, and fallback scenarios.

## Focused Error Handling Specs

Run these focused suites when changing the error handling stack:

```bash
npx jest --config libs/shared-dtos/jest.config.js --runInBand --runTestsByPath libs/shared-dtos/src/errors/error-interceptors.correlation.spec.ts libs/shared-dtos/src/errors/error-interceptors.logging.spec.ts libs/shared-dtos/src/errors/error-interceptors.performance.spec.ts libs/shared-dtos/src/errors/error-interceptors.recovery.spec.ts libs/shared-dtos/src/interceptors/global-error.interceptor.spec.ts libs/shared-dtos/src/errors/error-transformation.spec.ts
npx jest --config libs/infrastructure-shared/jest.config.ts --runInBand --runTestsByPath libs/infrastructure-shared/src/logging/logger.error.spec.ts
npx jest --config apps/app-gateway/jest.config.ts --runInBand --runTestsByPath apps/app-gateway/src/auth/guards/jwt-auth.guard.errors.spec.ts apps/app-gateway/src/guest/guards/guest.guard.errors.spec.ts apps/app-gateway/src/guest/guards/optional-jwt-auth.guard.errors.spec.ts apps/app-gateway/src/common/interceptors/service-integration.interceptor.errors.spec.ts
npx jest --config apps/ai-recruitment-frontend/jest.config.ts --runInBand --runTestsByPath apps/ai-recruitment-frontend/src/app/interceptors/http-error.interceptor.errors.spec.ts
```

Run `npm run test:coverage` after the focused suites to generate the aggregate coverage report used for OpenSpec verification.

## OpenSpec Error Handling Coverage Evidence

For `openspec/changes/add-error-handling-tests`, use both the aggregate command and the focused reports:

- Aggregate report: `npm run test:coverage`
- Error handling reports:
  - `coverage/error-handling/shared-dtos/coverage-summary.json`
  - `coverage/error-handling/app-gateway/coverage-summary.json`
  - `coverage/error-handling/frontend/coverage-summary.json`
  - `coverage/error-handling/infrastructure-shared/coverage-summary.json`

The OpenSpec design baseline identified error interceptors and the service integration interceptor as having no systematic error-path coverage. The focused reports verify the implemented coverage for that scope:

| Scope                                                                   | Line coverage |
| ----------------------------------------------------------------------- | ------------- |
| Shared DTO error interceptors, transformation, global error interceptor | 91.11%        |
| App gateway guards and service integration interceptor                  | 75.57%        |
| Frontend HTTP error interceptor                                         | 85.14%        |
| Infrastructure logger structured error logging                          | 88.23%        |

Weighted across these OpenSpec error-handling targets, current line coverage is 83.95% (565 covered lines out of 673). That validates the intended coverage uplift for the error-handling scope while the aggregate root report remains the broader repository quality signal.
