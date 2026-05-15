## ADDED Requirements

### Requirement: Auth service handles empty and null credentials

The AuthService SHALL validate and reject empty, null, or undefined credentials appropriately.

#### Scenario: Login with empty email

- **WHEN** login is attempted with empty string email
- **THEN** UnauthorizedException SHALL be thrown

#### Scenario: Login with null password

- **WHEN** login is attempted with null password
- **THEN** UnauthorizedException SHALL be thrown

#### Scenario: Register with empty name fields

- **WHEN** registration has empty firstName and lastName
- **THEN** registration SHALL succeed with empty names or validation error

#### Scenario: Register with undefined organization

- **WHEN** registration lacks organization data
- **THEN** default organization SHALL be generated or error returned

### Requirement: Auth service enforces rate limiting boundaries

The AuthService SHALL enforce rate limits at exact boundaries.

#### Scenario: Login at exact rate limit boundary (5 attempts)

- **WHEN** 5 failed login attempts occur within lockout window
- **THEN** account SHALL be locked after 5th attempt

#### Scenario: Login after lockout period expires

- **WHEN** login is attempted 15 minutes after lockout started
- **THEN** attempt SHALL be allowed and counter reset

#### Scenario: Concurrent login attempts at rate limit

- **WHEN** multiple simultaneous login attempts occur when at limit-1
- **THEN** exactly one SHALL succeed if valid, others trigger lockout

#### Scenario: Failed attempts counter boundary (INT_MAX)

- **WHEN** failed attempts counter approaches maximum integer
- **THEN** counter SHALL reset or overflow safely

### Requirement: Auth service handles token boundary conditions

The AuthService SHALL handle token validation at boundary conditions.

#### Scenario: Token expires at exact expiration time

- **WHEN** token validation occurs at exact expiration timestamp
- **THEN** token SHALL be rejected as expired

#### Scenario: Token validation with empty payload

- **WHEN** JWT payload is empty or missing required fields
- **THEN** UnauthorizedException SHALL be thrown

#### Scenario: Refresh token with null subject

- **WHEN** refresh token has null or undefined sub claim
- **THEN** UnauthorizedException SHALL be thrown

#### Scenario: Token with maximum age (24 hours)

- **WHEN** token is 24 hours and 1 second old
- **THEN** token SHALL be rejected as too old

### Requirement: Auth service handles concurrent authentication operations

The AuthService SHALL handle concurrent auth operations safely.

#### Scenario: Concurrent login with same credentials

- **WHEN** multiple simultaneous login requests with same valid credentials
- **THEN** all SHALL succeed and return valid tokens

#### Scenario: Concurrent logout with same token

- **WHEN** multiple logout requests with same token occur simultaneously
- **THEN** all SHALL succeed and token SHALL be blacklisted

#### Scenario: Concurrent token refresh

- **WHEN** same refresh token used for multiple simultaneous refresh requests
- **THEN** first SHALL succeed, subsequent SHALL be rejected (token blacklisted)

#### Scenario: Concurrent password change

- **WHEN** password change requested simultaneously from multiple sessions
- **THEN** first SHALL succeed, subsequent SHALL fail (invalid current password)

### Requirement: Auth service validates password strength boundaries

The AuthService SHALL enforce password strength at exact boundaries.

#### Scenario: Password at minimum length (7 characters)

- **WHEN** password of exactly 7 characters provided
- **THEN** validation SHALL fail (minimum 8 required)

#### Scenario: Password at exact minimum length (8 characters)

- **WHEN** password of exactly 8 characters with all required types
- **THEN** validation SHALL pass

#### Scenario: Password with only one character type

- **WHEN** password has only lowercase letters (no numbers, uppercase, special)
- **THEN** validation SHALL fail

#### Scenario: Password with maximum practical length (1000 chars)

- **WHEN** password of 1000 characters provided
- **THEN** bcrypt hashing SHALL complete successfully

### Requirement: Auth service handles token blacklist boundaries

The AuthService SHALL handle token blacklist operations at scale.

#### Scenario: Blacklist at maximum capacity

- **WHEN** token blacklist approaches memory limit
- **THEN** oldest entries SHALL be cleaned or memory error handled

#### Scenario: Concurrent token blacklisting

- **WHEN** same token blacklisted simultaneously from multiple requests
- **THEN** all SHALL succeed (idempotent operation)

#### Scenario: Token cleanup at interval boundary

- **WHEN** cleanup interval triggers with expired tokens
- **THEN** all expired tokens SHALL be removed

#### Scenario: Blacklist lookup with malformed token

- **WHEN** isBlacklisted called with malformed or empty token
- **THEN** function SHALL return false without error
