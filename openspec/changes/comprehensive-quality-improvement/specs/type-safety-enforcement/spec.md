## ADDED Requirements

### Requirement: No any type in production code

The system SHALL NOT use the `any` type in production source code files (excluding test files with `expect.any()` patterns).

#### Scenario: ESLint detects any type usage

- **WHEN** a developer writes code using `any` type
- **THEN** ESLint SHALL report an error with message indicating the file and line number

#### Scenario: CI blocks PR with any type

- **WHEN** a PR contains `any` type in production code
- **THEN** CI pipeline SHALL fail and block the merge

### Requirement: Proper type definitions for value objects

All ValueObject classes SHALL have properly typed `restore()` static methods.

#### Scenario: ValueObject restore with typed parameter

- **WHEN** calling `ValueObject.restore(data)`
- **THEN** `data` parameter SHALL have an explicit interface type
- **AND** the interface SHALL be exported and documented

### Requirement: Error context typing

Error handling classes SHALL use typed context objects instead of `Record<string, any>`.

#### Scenario: Domain error with typed context

- **WHEN** creating a DomainError with context
- **THEN** context SHALL implement a defined interface
- **AND** the interface SHALL specify all possible context properties

### Requirement: API response typing

All API response objects SHALL have explicit type definitions.

#### Scenario: Controller returns typed response

- **WHEN** a controller method returns data
- **THEN** the return type SHALL be explicitly defined
- **AND** the type SHALL match the Swagger/OpenAPI schema
