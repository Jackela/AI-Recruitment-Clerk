## ADDED Requirements

### Requirement: File size limit enforcement

No source file SHALL exceed 500 lines of code.

#### Scenario: ESLint detects large file

- **WHEN** a source file exceeds 500 lines
- **THEN** ESLint SHALL report a warning
- **AND** warning SHALL indicate current line count

#### Scenario: CI warns on large files

- **WHEN** CI runs linting
- **THEN** files over 500 lines SHALL be flagged
- **AND** the check SHALL not block the build (warning only)

### Requirement: Controller size limit

Controller classes SHALL NOT exceed 400 lines.

#### Scenario: Split large controller

- **WHEN** a controller exceeds 400 lines
- **THEN** controller SHALL be split into multiple controllers
- **AND** each new controller SHALL handle a sub-resource

### Requirement: Component size limit

Angular components SHALL NOT exceed 400 lines.

#### Scenario: Extract display logic

- **WHEN** a component exceeds 400 lines
- **THEN** display logic SHALL be extracted to a separate component
- **AND** business logic SHALL be extracted to a service

### Requirement: TODO comment tracking

Critical TODO comments SHALL be tracked and resolved.

#### Scenario: TODO in production code

- **WHEN** a TODO comment exists in production code
- **THEN** TODO SHALL include a ticket reference or date
- **AND** CI SHALL report count of TODO comments

### Requirement: Consistent code patterns

All services SHALL follow established patterns (Facade, Orchestrator, etc.).

#### Scenario: Service follows facade pattern

- **WHEN** creating a service with multiple dependencies
- **THEN** service SHALL use the facade pattern documented in CLAUDE.md
- **AND** complex operations SHALL use the orchestrator pattern
