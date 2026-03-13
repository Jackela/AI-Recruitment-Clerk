## ADDED Requirements

### Requirement: JwtAuthGuard SHALL handle authentication errors with specific messages

The JwtAuthGuard SHALL validate JWT tokens, handle various JWT error types, and provide user-friendly error messages.

#### Scenario: Reject request with expired token

- **WHEN** a request has an expired JWT token (TokenExpiredError)
- **THEN** the guard SHALL throw UnauthorizedException
- **AND** the message SHALL be "Token has expired. Please refresh your session."

#### Scenario: Reject request with invalid token signature

- **WHEN** a request has an invalid token (JsonWebTokenError)
- **THEN** the guard SHALL throw UnauthorizedException
- **AND** the message SHALL be "Invalid token. Please log in again."

#### Scenario: Reject request with not-before error

- **WHEN** a request has a token that is not yet valid (NotBeforeError)
- **THEN** the guard SHALL throw UnauthorizedException
- **AND** the message SHALL be "Token not yet valid."

#### Scenario: Reject request without authentication header

- **WHEN** a request has no authorization header for protected route
- **THEN** the guard SHALL attach guest user
- **AND** for strict auth, throw UnauthorizedException with "Authentication required"

#### Scenario: Enforce rate limiting when threshold exceeded

- **WHEN** a client exceeds RATE_LIMIT_MAX_REQUESTS (100) within RATE_LIMIT_WINDOW (1 minute)
- **THEN** the guard SHALL throw HttpException with TOO_MANY_REQUESTS status
- **AND** the message SHALL be "Too many requests. Please try again later."

#### Scenario: Handle malformed authorization header gracefully

- **WHEN** a request has malformed authorization header (not "Bearer token" format)
- **THEN** the guard SHALL treat as guest user
- **AND** not throw authentication error

#### Scenario: Handle empty bearer token

- **WHEN** a request has "Bearer " header with empty token
- **THEN** the guard SHALL attach guest user
- **AND** continue processing

---

### Requirement: GuestGuard SHALL handle guest access control errors

The GuestGuard SHALL manage guest user access, enforce limits, and handle quota exceeded errors.

#### Scenario: Allow access for guest users within limits

- **WHEN** a guest user accesses allowed endpoints
- **THEN** the guard SHALL allow the request
- **AND** attach guest context to request

#### Scenario: Reject guest access to protected endpoints

- **WHEN** a guest user tries to access protected endpoint
- **THEN** the guard SHALL deny access
- **AND** return appropriate error message

#### Scenario: Handle guest quota exceeded

- **WHEN** a guest user exceeds usage limits
- **THEN** the guard SHALL reject the request
- **AND** provide upgrade or login guidance

---

### Requirement: OptionalJwtAuthGuard SHALL handle optional authentication gracefully

The OptionalJwtAuthGuard SHALL attempt authentication but not fail if token is missing or invalid.

#### Scenario: Attach user when valid token provided

- **WHEN** a request has valid JWT token
- **THEN** the guard SHALL attach user to request
- **AND** allow access

#### Scenario: Continue as guest when no token provided

- **WHEN** a request has no authorization header
- **THEN** the guard SHALL not throw error
- **AND** continue processing without user context

#### Scenario: Continue as guest when token is invalid

- **WHEN** a request has invalid JWT token
- **THEN** the guard SHALL not throw error
- **AND** continue processing without user context

#### Scenario: Log optional auth failures for monitoring

- **WHEN** optional authentication fails
- **THEN** the guard SHALL log the failure at debug level
- **AND** continue processing
