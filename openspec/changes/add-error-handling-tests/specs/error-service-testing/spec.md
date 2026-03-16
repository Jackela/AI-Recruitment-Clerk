## ADDED Requirements

### Requirement: Service Integration Interceptor SHALL handle service failures with fallback

The ServiceIntegrationInterceptor SHALL implement timeout, retry, circuit breaker, and fallback mechanisms for service calls.

#### Scenario: Return cached result when cache hit occurs

- **WHEN** cacheable request is made and cache contains result
- **THEN** the interceptor SHALL return cached result
- **AND** log cache hit for debugging

#### Scenario: Execute service call when cache miss occurs

- **WHEN** cacheable request is made and cache is empty
- **THEN** the interceptor SHALL execute the operation
- **AND** cache the result for future requests

#### Scenario: Throw timeout error when operation exceeds timeout

- **WHEN** an operation takes longer than configured timeout (default 30000ms)
- **THEN** the interceptor SHALL throw RequestTimeoutException
- **AND** include operation name and timeout duration

#### Scenario: Retry failed operations up to maxRetries

- **WHEN** an operation fails with retryable error
- **THEN** the interceptor SHALL retry up to maxRetries times (default 3)
- **AND** succeed if any retry succeeds

#### Scenario: Throw error when all retries exhausted

- **WHEN** an operation fails and all retries are exhausted
- **THEN** the interceptor SHALL throw the last error
- **AND** log the failure with retry count

#### Scenario: Return fallback response when fallback is enabled

- **WHEN** an operation fails and fallback is enabled
- **THEN** the interceptor SHALL return fallback response
- **AND** include original error message in response

#### Scenario: Open circuit breaker after failure threshold

- **WHEN** operation failures exceed circuit breaker threshold (default 5)
- **THEN** the circuit breaker SHALL open
- **AND** subsequent calls SHALL throw ServiceUnavailableException

#### Scenario: Close circuit breaker after reset timeout

- **WHEN** circuit breaker is open and resetTimeout has passed (default 60000ms)
- **THEN** the circuit SHALL transition to half-open
- **AND** allow test request

#### Scenario: Validate required services before operation

- **WHEN** requiredServices is configured and services are unavailable
- **THEN** the interceptor SHALL throw ServiceUnavailableException
- **AND** list unavailable services in error message

#### Scenario: Cache successful operation result

- **WHEN** an operation succeeds and cacheable is enabled
- **THEN** the interceptor SHALL cache the result
- **AND** use cacheTTL for expiration (default 300s)

---

### Requirement: HTTP Error Interceptor SHALL handle frontend HTTP errors

The HttpErrorInterceptor SHALL handle HTTP errors on the frontend with retry, timeout, and user-friendly error display.

#### Scenario: Show network connection error message

- **WHEN** HTTP request fails with status 0 (network error)
- **THEN** the interceptor SHALL display "无法连接到服务器，请检查您的网络连接"
- **AND** not show notification for cancelled requests

#### Scenario: Show authentication error and redirect to login

- **WHEN** HTTP request returns 401 status
- **THEN** the interceptor SHALL display "您的登录已过期，请重新登录"
- **AND** redirect to login page with redirectUrl

#### Scenario: Show permission denied message

- **WHEN** HTTP request returns 403 status
- **THEN** the interceptor SHALL display "您没有权限执行此操作"
- **AND** log security event

#### Scenario: Show resource not found message

- **WHEN** HTTP request returns 404 status
- **THEN** the interceptor SHALL display "请求的资源不存在"
- **AND** show info-level notification

#### Scenario: Show rate limit message with backoff

- **WHEN** HTTP request returns 429 status
- **THEN** the interceptor SHALL display "请求过于频繁，请稍后再试"
- **AND** implement exponential backoff

#### Scenario: Show server error message

- **WHEN** HTTP request returns 500+ status
- **THEN** the interceptor SHALL display "服务器内部错误，请稍后再试"
- **AND** show error-level notification

#### Scenario: Retry safe HTTP methods on failure

- **WHEN** GET request fails with retryable error
- **THEN** the interceptor SHALL retry with exponential backoff
- **AND** use retryConfig.maxRetries (default 3)

#### Scenario: Do not retry unsafe HTTP methods

- **WHEN** POST/PUT/PATCH/DELETE request fails
- **THEN** the interceptor SHALL not retry
- **AND** throw error immediately

#### Scenario: Add correlation headers to requests

- **WHEN** making any HTTP request
- **THEN** the interceptor SHALL add correlation headers (X-Trace-ID, X-Request-ID)
- **AND** propagate existing correlation context

#### Scenario: Prevent notification spam for same error

- **WHEN** same error occurs within 5 seconds
- **THEN** the interceptor SHALL not show duplicate notification
- **AND** use sessionStorage to track last notification time
