## Why

The codebase has comprehensive error handling infrastructure including interceptors, guards, and error transformation logic, but lacks systematic test coverage for error paths. Without tests for error scenarios, regressions in error handling can go undetected, leading to poor user experience and potential security vulnerabilities. This change adds 40 test cases to ensure all error handling paths are properly tested.

## What Changes

- Add comprehensive test coverage for error handling interceptors:
  - ErrorCorrelationInterceptor tests for correlation context management
  - ErrorLoggingInterceptor tests for structured error logging
  - PerformanceTrackingInterceptor tests for threshold alerts
  - ErrorRecoveryInterceptor tests for circuit breaker patterns
  - GlobalErrorInterceptor tests for error transformation

- Add error handling tests for guards:
  - JwtAuthGuard tests for authentication error scenarios
  - GuestGuard tests for guest access error handling
  - OptionalJwtAuthGuard tests for optional authentication errors

- Add error handling tests for service integration interceptor:
  - Circuit breaker error handling
  - Timeout error handling
  - Retry mechanism error handling
  - Fallback mechanism tests

- Add error transformation tests:
  - HTTP error to App error conversion
  - Database error to user message conversion
  - Validation error to form error conversion
  - Unknown error to generic error conversion

- Add logging tests:
  - Error logging with correlation
  - Warning logging for degraded operations
  - Info logging for normal operations
  - Debug logging for detailed diagnostics

## Capabilities

### New Capabilities

- `error-interceptor-testing`: Comprehensive test suite for error handling interceptors including correlation, logging, performance tracking, and recovery
- `error-guard-testing`: Test coverage for authentication and authorization guards error scenarios
- `error-service-testing`: Tests for service-level error handling including circuit breakers, retries, and fallbacks
- `error-transformation-testing`: Tests for error type conversions and message transformations
- `error-logging-testing`: Tests for structured logging across all error severity levels

### Modified Capabilities

None - this change only adds test coverage without modifying existing functionality.

## Impact

- **Test Files**: New spec files in `apps/app-gateway/src/common/interceptors/`, `apps/app-gateway/src/auth/guards/`, `apps/ai-recruitment-frontend/src/app/interceptors/`
- **Dependencies**: No new runtime dependencies; only Jest testing utilities
- **Coverage**: Expected to increase overall test coverage by 5-8%
- **CI/CD**: No changes required - tests will run with existing `npm test` command
- **Documentation**: Test files serve as documentation for error handling behavior
