## 1. Error Interceptor Tests

### 1.1 Error Correlation Interceptor Tests (4 tests)

- [x] 1.1.1 Create test file: `libs/shared-dtos/src/errors/error-interceptors.correlation.spec.ts`
- [x] 1.1.2 Test: Create new correlation context for request without headers
- [x] 1.1.3 Test: Propagate existing correlation context from request headers
- [x] 1.1.4 Test: Enhance error with correlation context on failure
- [x] 1.1.5 Test: Clean up correlation context after request completion

### 1.2 Error Logging Interceptor Tests (3 tests)

- [x] 1.2.1 Create test file: `libs/shared-dtos/src/errors/error-interceptors.logging.spec.ts`
- [x] 1.2.2 Test: Log successful operation completion
- [x] 1.2.3 Test: Log operation failure with error details
- [x] 1.2.4 Test: Log operation start metrics

### 1.3 Performance Tracking Interceptor Tests (4 tests)

- [x] 1.3.1 Create test file: `libs/shared-dtos/src/errors/error-interceptors.performance.spec.ts`
- [x] 1.3.2 Test: Log performance metrics for normal operations
- [x] 1.3.3 Test: Log warning for slow operations exceeding warn threshold
- [x] 1.3.4 Test: Log error for critical slow operations exceeding error threshold
- [x] 1.3.5 Test: Track memory usage during operation

### 1.4 Error Recovery Interceptor Tests (7 tests)

- [x] 1.4.1 Create test file: `libs/shared-dtos/src/errors/error-interceptors.recovery.spec.ts`
- [x] 1.4.2 Test: Allow operation when circuit breaker is closed
- [x] 1.4.3 Test: Block operation when circuit breaker is open
- [x] 1.4.4 Test: Transition to half-open after recovery timeout
- [x] 1.4.5 Test: Record failure and increment counter
- [x] 1.4.6 Test: Open circuit breaker after failure threshold exceeded
- [x] 1.4.7 Test: Reset circuit breaker on successful operation
- [x] 1.4.8 Test: Enhance error with recovery strategies

### 1.5 Global Error Interceptor Tests (8 tests)

- [x] 1.5.1 Create test file: `libs/shared-dtos/src/interceptors/global-error.interceptor.spec.ts`
- [x] 1.5.2 Test: Pass through EnhancedAppException without transformation
- [x] 1.5.3 Test: Transform standard HttpException to EnhancedAppException
- [x] 1.5.4 Test: Transform unknown errors to EnhancedAppException
- [x] 1.5.5 Test: Set correlation context from request headers
- [x] 1.5.6 Test: Log errors with appropriate severity levels
- [x] 1.5.7 Test: Sanitize sensitive headers in error logs
- [x] 1.5.8 Test: Map HTTP status codes to error types correctly
- [x] 1.5.9 Test: Map HTTP status codes to severity correctly

## 2. Error Guard Tests

### 2.1 JwtAuthGuard Error Tests (7 tests)

- [x] 2.1.1 Create test additions: `apps/app-gateway/src/auth/guards/jwt-auth.guard.errors.spec.ts`
- [x] 2.1.2 Test: Reject request with expired token
- [x] 2.1.3 Test: Reject request with invalid token signature
- [x] 2.1.4 Test: Reject request with not-before error
- [x] 2.1.5 Test: Reject request without authentication header
- [x] 2.1.6 Test: Enforce rate limiting when threshold exceeded
- [x] 2.1.7 Test: Handle malformed authorization header gracefully
- [x] 2.1.8 Test: Handle empty bearer token

### 2.2 GuestGuard Error Tests (3 tests)

- [x] 2.2.1 Create test file: `apps/app-gateway/src/guest/guards/guest.guard.errors.spec.ts`
- [x] 2.2.2 Test: Allow access for guest users within limits
- [x] 2.2.3 Test: Reject guest access to protected endpoints
- [x] 2.2.4 Test: Handle guest quota exceeded

### 2.3 OptionalJwtAuthGuard Error Tests (3 tests)

- [x] 2.3.1 Create test file: `apps/app-gateway/src/guest/guards/optional-jwt-auth.guard.errors.spec.ts`
- [x] 2.3.2 Test: Attach user when valid token provided
- [x] 2.3.3 Test: Continue as guest when no token provided
- [x] 2.3.4 Test: Continue as guest when token is invalid

## 3. Error Service Tests

### 3.1 Service Integration Interceptor Tests (8 tests)

- [x] 3.1.1 Create test file: `apps/app-gateway/src/common/interceptors/service-integration.interceptor.errors.spec.ts`
- [x] 3.1.2 Test: Return cached result when cache hit occurs
- [x] 3.1.3 Test: Execute service call when cache miss occurs
- [x] 3.1.4 Test: Throw timeout error when operation exceeds timeout
- [x] 3.1.5 Test: Retry failed operations up to maxRetries
- [x] 3.1.6 Test: Throw error when all retries exhausted
- [x] 3.1.7 Test: Return fallback response when fallback is enabled
- [x] 3.1.8 Test: Open circuit breaker after failure threshold
- [x] 3.1.9 Test: Validate required services before operation

### 3.2 HTTP Error Interceptor Tests (8 tests)

- [x] 3.2.1 Create test additions: `apps/ai-recruitment-frontend/src/app/interceptors/http-error.interceptor.errors.spec.ts`
- [x] 3.2.2 Test: Show network connection error message
- [x] 3.2.3 Test: Show authentication error and redirect to login
- [x] 3.2.4 Test: Show permission denied message
- [x] 3.2.5 Test: Show resource not found message
- [x] 3.2.6 Test: Show rate limit message with backoff
- [x] 3.2.7 Test: Show server error message
- [x] 3.2.8 Test: Retry safe HTTP methods on failure
- [x] 3.2.9 Test: Do not retry unsafe HTTP methods

## 4. Error Transformation Tests

### 4.1 HTTP to App Error Transformation Tests (10 tests)

- [x] 4.1.1 Create test file: `libs/shared-dtos/src/errors/error-transformation.spec.ts`
- [x] 4.1.2 Test: Transform 400 Bad Request to VALIDATION_ERROR
- [x] 4.1.3 Test: Transform 401 Unauthorized to AUTHENTICATION_ERROR
- [x] 4.1.4 Test: Transform 403 Forbidden to AUTHORIZATION_ERROR
- [x] 4.1.5 Test: Transform 404 Not Found to NOT_FOUND_ERROR
- [x] 4.1.6 Test: Transform 409 Conflict to CONFLICT_ERROR
- [x] 4.1.7 Test: Transform 422 Unprocessable to VALIDATION_ERROR
- [x] 4.1.8 Test: Transform 429 Rate Limit to RATE_LIMIT_ERROR
- [x] 4.1.9 Test: Transform 500 Internal Error to SYSTEM_ERROR
- [x] 4.1.10 Test: Transform 502/503/504 Gateway errors to EXTERNAL_SERVICE_ERROR
- [x] 4.1.11 Test: Transform unknown HTTP status to SYSTEM_ERROR

### 4.2 Database Error Transformation Tests (5 tests)

- [x] 4.2.1 Test: Transform connection error to user-friendly message
- [x] 4.2.2 Test: Transform query timeout to user-friendly message
- [x] 4.2.3 Test: Transform unique constraint violation to validation error
- [x] 4.2.4 Test: Transform foreign key violation to validation error
- [x] 4.2.5 Test: Transform serialization failure to retryable error

### 4.3 Validation Error Transformation Tests (4 tests)

- [x] 4.3.1 Test: Transform single field validation error
- [x] 4.3.2 Test: Transform multiple field validation errors
- [x] 4.3.3 Test: Transform nested object validation errors
- [x] 4.3.4 Test: Transform array validation errors

### 4.4 Unknown Error Transformation Tests (5 tests)

- [x] 4.4.1 Test: Transform standard Error to generic app error
- [x] 4.4.2 Test: Transform string thrown as error
- [x] 4.4.3 Test: Transform null/undefined thrown as error
- [x] 4.4.4 Test: Transform object thrown as error
- [x] 4.4.5 Test: Preserve stack trace when transforming errors

## 5. Error Logging Tests

### 5.1 Structured Error Logger Tests (8 tests)

- [x] 5.1.1 Create test file: `libs/infrastructure-shared/src/logging/logger.error.spec.ts`
- [x] 5.1.2 Test: Log critical severity error with fatal level
- [x] 5.1.3 Test: Log high severity error with error level
- [x] 5.1.4 Test: Log medium severity error with warn level
- [x] 5.1.5 Test: Log low severity error with debug level
- [x] 5.1.6 Test: Log error with correlation context
- [x] 5.1.7 Test: Log error with business impact information
- [x] 5.1.8 Test: Log error with user impact information
- [x] 5.1.9 Test: Log error with recovery strategies

### 5.2 Warning Logging Tests (4 tests)

- [x] 5.2.1 Test: Log warning when circuit breaker opens
- [x] 5.2.2 Test: Log warning when fallback is used
- [x] 5.2.3 Test: Log warning when retry is attempted
- [x] 5.2.4 Test: Log warning for performance threshold exceeded

### 5.3 Info Logging Tests (4 tests)

- [x] 5.3.1 Test: Log info when operation completes successfully
- [x] 5.3.2 Test: Log info when circuit breaker resets
- [x] 5.3.3 Test: Log info for cache hits
- [x] 5.3.4 Test: Log info for request correlation

### 5.4 Debug Logging Tests (4 tests)

- [x] 5.4.1 Test: Log debug for operation start
- [x] 5.4.2 Test: Log debug for correlation context propagation
- [x] 5.4.3 Test: Log debug for performance metrics
- [x] 5.4.4 Test: Log debug for error context enrichment

## 6. Verification and Coverage

### 6.1 Run Tests and Verify Coverage

- [x] 6.1.1 Run all new tests: `npm test -- --testPathPattern="error"`
- [x] 6.1.2 Verify all 40+ tests pass
- [x] 6.1.3 Check coverage report: `npm run test:coverage`
- [x] 6.1.4 Verify coverage increased by 5-8%
- [x] 6.1.5 Run lint: `npm run lint`
- [x] 6.1.6 Fix any lint errors in test files

### 6.2 Documentation

- [x] 6.2.1 Update TESTING.md with error handling test patterns
- [x] 6.2.2 Document error handling test utilities
- [x] 6.2.3 Add error handling test examples to README
