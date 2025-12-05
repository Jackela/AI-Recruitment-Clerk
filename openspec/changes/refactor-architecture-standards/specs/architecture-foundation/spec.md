## ADDED Requirements

### Requirement: Single Source of Truth Configuration
All runtime components MUST consume configuration values through a dedicated shared module that centralizes validation, typing, and defaults.

#### Scenario: Services load config via shared provider
- **WHEN** an app, library, or script needs an environment or feature flag value
- **THEN** it imports the value from the shared configuration package rather than duplicating parsing logic
- **AND** the configuration module validates inputs at startup, failing fast on missing or invalid values

### Requirement: Enforced SOLID Module Boundaries
Code MUST respect SOLID principles through explicit layer boundaries, dependency inversion, and Nx module rules.

#### Scenario: Layered imports are validated
- **GIVEN** libraries are tagged by layer (domain, application, infrastructure, presentation)
- **WHEN** a developer imports from a disallowed layer (e.g., UI reaching into infrastructure)
- **THEN** lint/module-boundary checks fail CI, blocking the change until the dependency path is compliant

### Requirement: Domain-Driven Context Ownership
Every business capability MUST reside inside a bounded context that exposes well-defined contracts to other contexts.

#### Scenario: Cross-context communication goes through contracts
- **WHEN** one context (e.g., job-matching) needs data or behavior from another (e.g., candidate-management)
- **THEN** it interacts through explicit interfaces or DTOs owned by the providing context
- **AND** direct access to internal domain models of another context is forbidden

### Requirement: Infrastructure Behind Interfaces
Infrastructure concerns (persistence, external services, messaging) MUST be accessed via interfaces bound in application layers to preserve dependency inversion.

#### Scenario: Persistence adapters implement contracts
- **WHEN** domain services require persistence or integrations
- **THEN** they depend on interfaces defined in the application layer
- **AND** concrete adapters live in infrastructure modules that implement those interfaces and are wired through dependency injection
