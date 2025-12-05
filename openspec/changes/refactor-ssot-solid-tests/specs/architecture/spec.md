## ADDED Requirements

### Requirement: Single Source of Truth for Shared Types
All shared type definitions SHALL be defined in a single canonical location within `libs/shared-dtos/`.

#### Scenario: ResumeDTO is defined in single location
- **WHEN** a developer needs the ResumeDTO type
- **THEN** they import it from `@ai-recruitment-clerk/shared-dtos`
- **AND** no other package defines a ResumeDTO type

#### Scenario: ValidationResult is consistent across codebase
- **WHEN** validation functions return a ValidationResult
- **THEN** all ValidationResult types have identical structure
- **AND** they are imported from `@ai-recruitment-clerk/shared-dtos/validation`

---

### Requirement: Maximum Service File Size
No service file SHALL exceed 500 lines of code to ensure single responsibility principle compliance.

#### Scenario: Service files are appropriately sized
- **WHEN** a service file is analyzed
- **THEN** it contains fewer than 500 lines of code
- **AND** it handles a single bounded responsibility

#### Scenario: God classes are split into focused services
- **WHEN** a service exceeds 500 lines
- **THEN** it is refactored into multiple focused services
- **AND** a facade maintains backward compatibility

---

### Requirement: Security Component Test Coverage
All security-critical components (guards, middleware, interceptors) SHALL have at least 95% test coverage.

#### Scenario: Guards are fully tested
- **WHEN** a security guard is deployed
- **THEN** it has tests for valid tokens, invalid tokens, missing tokens
- **AND** it has tests for authorization scenarios

#### Scenario: Middleware is fully tested
- **WHEN** security middleware is deployed
- **THEN** it has tests for CSRF protection scenarios
- **AND** it has tests for security header injection

---

### Requirement: Strategy Pattern for File Parsing
File parsing SHALL use the Strategy pattern to enable extension without modification.

#### Scenario: Adding new file type support
- **WHEN** a new file type needs to be supported
- **THEN** a new strategy implementation is created
- **AND** the orchestrator service is not modified

#### Scenario: Each file type has dedicated strategy
- **WHEN** a file is submitted for parsing
- **THEN** the appropriate strategy is selected based on MIME type
- **AND** parsing logic is isolated to that strategy

---

### Requirement: Centralized File Validation Constants
File validation constants (max size, allowed types) SHALL be defined in a single location.

#### Scenario: File size limits are consistent
- **WHEN** file size is validated
- **THEN** the same constant is used across all validators
- **AND** the constant is imported from `@ai-recruitment-clerk/shared-dtos/constants`

#### Scenario: MIME type allowlist is consistent
- **WHEN** file MIME type is validated
- **THEN** the same allowlist is used across all validators
- **AND** the allowlist is imported from centralized constants

---

### Requirement: Facade Pattern for Backward Compatibility
Refactored services SHALL maintain backward compatibility through facade pattern.

#### Scenario: Existing consumers continue working
- **WHEN** a god class is split into focused services
- **THEN** the original service remains as a facade
- **AND** existing consumers do not require import changes

#### Scenario: Facade delegates to focused services
- **WHEN** a method is called on the facade
- **THEN** it delegates to the appropriate focused service
- **AND** no business logic resides in the facade
