## Context

The AI-Recruitment-Clerk codebase implements a comprehensive error handling system across multiple layers:

**Current Error Handling Infrastructure:**

- **Error Interceptors**: 4 specialized interceptors in `libs/shared-dtos/src/errors/error-interceptors.ts` for correlation, logging, performance tracking, and recovery
- **Global Error Interceptor**: `libs/shared-dtos/src/interceptors/global-error.interceptor.ts` for standardized error formatting
- **Frontend Error Handling**: `apps/ai-recruitment-frontend/src/app/interceptors/http-error.interceptor.ts` for HTTP error transformation
- **Guards**: JWT and guest guards with error handling in `apps/app-gateway/src/auth/guards/`
- **Service Integration**: Circuit breaker and fallback logic in `apps/app-gateway/src/common/interceptors/service-integration.interceptor.ts`

**Current Test Coverage Gaps:**

- Error interceptors have 0% test coverage
- Guard error scenarios have partial coverage (JwtAuthGuard ~60%)
- Service integration interceptor has 0% coverage
- Error transformation logic is tested in isolation but not integrated
- Logging behavior is not systematically tested

## Goals / Non-Goals

**Goals:**

- Achieve 100% coverage for all error handling interceptors
- Add 40 comprehensive error handling test cases
- Test all error transformation paths (HTTP → App → User message)
- Verify circuit breaker behavior (open, half-open, closed states)
- Test retry mechanisms with exponential backoff
- Validate structured logging across all severity levels
- Ensure fallback mechanisms work correctly

**Non-Goals:**

- Modifying existing error handling logic (tests only)
- Adding new error handling features
- Performance testing of error paths
- E2E tests for error scenarios (focus on unit tests)
- Testing third-party library error handling

## Decisions

**1. Test Organization by Module**

- Group tests by module (interceptor, guard, service) rather than by error type
- Each test file focuses on a single component's error handling
- Rationale: Easier maintenance and clearer test intent

**2. Mock Strategy**

- Use Jest mocks for all external dependencies (NATS, database, cache)
- Mock `Logger` to verify log calls without console output
- Use `jest.useFakeTimers()` for timeout and retry tests
- Rationale: Isolated tests, faster execution, deterministic behavior

**3. Test Naming Convention**

- Descriptive names: `should transform HTTP 404 to EnhancedAppException`
- Group by behavior: `describe('Circuit Breaker', ...)`
- Include error context in test names
- Rationale: Self-documenting tests, easier debugging

**4. Assertion Strategy**

- Assert on error properties (type, code, message, status)
- Verify correlation context propagation
- Check logger calls with appropriate severity levels
- Assert on fallback return values
- Rationale: Comprehensive validation of error handling behavior

**5. Test Data Management**

- Use factory functions for creating test errors
- Share test fixtures across related tests
- Avoid hardcoded magic values
- Rationale: Maintainable tests, easy to update

## Risks / Trade-offs

**[Risk]** Adding 40 tests may increase CI time significantly
→ **Mitigation**: Tests are unit tests (fast execution), parallelized by Jest, estimated +30s CI time

**[Risk]** Mocking complex NestJS dependencies may make tests brittle
→ **Mitigation**: Use NestJS testing utilities, type-safe mocks, focus on behavior not implementation

**[Risk]** Coverage targets may encourage testing implementation details
→ **Mitigation**: Review all tests for behavioral focus, avoid testing private methods

**[Trade-off]** Comprehensive error testing vs. test maintenance burden
→ **Decision**: Accept higher maintenance for comprehensive coverage; error handling is critical infrastructure

**[Trade-off]** Mocking vs. integration testing
→ **Decision**: Use mocks for unit tests, existing E2E tests cover integration paths
