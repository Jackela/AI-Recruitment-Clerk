# Architecture Baseline

**Purpose**: Single source of truth for architectural layers, module boundaries, and allowed dependencies.

**Last Updated**: 2026-02-04

## Project Overview

AI Recruitment Clerk is a microservices-based monorepo using:
- **Frontend**: Angular 20.1 with NgRx state management
- **Backend**: NestJS microservices with NATS JetStream messaging
- **Database**: MongoDB with Redis caching
- **Build System**: Nx 21.5 with ESM modules only

## Architectural Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────────┐ │
│  │  Angular Frontend    │  │  NestJS Microservices                        │ │
│  │  (ai-recruitment-    │  │  • app-gateway (API Gateway)                 │ │
│  │   frontend)          │  │  • resume-parser-svc                         │ │
│  └──────────────────────┘  │  • jd-extractor-svc                          │ │
│                            │  • scoring-engine-svc                         │ │
│                            │  • report-generator-svc                       │ │
│                            └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SHARED CONTRACTS LAYER                              │
│  • api-contracts: Frontend-backend contract definitions                     │
│  • shared-dtos: Common DTOs, events, patterns                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DOMAIN LAYER                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Domain Libraries (libs/*-domain)                                     │  │
│  │                                                                      │  │
│  │ Structure per domain:                                                │  │
│  │   /domain          - Entities, value objects, domain events          │  │
│  │   /application     - Commands, queries, handlers, DTOs               │  │
│  │   /infrastructure  - Persistence, messaging, external APIs            │  │
│  │                                                                      │  │
│  │ Domains:                                                             │  │
│  │   • candidate-scoring-domain    • job-management-domain              │  │
│  │   • report-generation-domain   • resume-processing-domain            │  │
│  │   • incentive-system-domain    • marketing-domain                    │  │
│  │   • usage-management-domain    • user-management-domain              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE LAYER                                 │
│  • shared-nats-client   - NATS connection and stream management             │
│  • service-base         - BaseMicroserviceService for NATS services         │
│  • infrastructure-shared - Error handling, validation, utilities            │
│  • ai-services-shared   - Gemini client, prompt templates                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FOUNDATION LAYER                                  │
│  • configuration   - Environment variable validation (startup)              │
│  • types           - Shared TypeScript type definitions                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Module Boundary Rules

Enforced via `@nx/enforce-module-boundaries` in `eslint.config.mjs`.

### Tags

| Tag      | Description                           | Projects                                          |
|----------|---------------------------------------|---------------------------------------------------|
| `type:app` | Applications (deployable units)    | All apps/                                        |
| `scope:shared` | Shared infrastructure libraries | shared-nats-client, service-base, infrastructure-shared, ai-services-shared |
| `scope:domain` | Domain business logic           | All `*-domain` libs                              |
| `layer:contracts` | API contracts and DTOs      | api-contracts, shared-dtos                       |
| `type:utils` | Utility libraries                 | configuration, types                             |

### Allowed Dependencies

```
type:app → *, scope:domain, scope:shared, layer:contracts, type:utils
scope:domain → scope:shared, type:utils, scope:domain, layer:contracts
layer:contracts → type:utils
scope:shared → scope:shared, type:utils
type:utils → (no restrictions - utilities can be used anywhere)
```

### Forbidden Patterns

1. **Domain → Application**: Domain libraries must NOT import from applications
2. **Domain → Domain**: Direct domain-to-domain dependencies should use events/messaging
3. **Shared → Domain**: Infrastructure shared should NOT import from domain libraries
4. **Contracts → Domain**: API contracts must remain independent of domain implementation

## Domain-Driven Design Structure

Each domain library follows this internal structure:

```
libs/{domain-name}/src/
├── domain/              # Core business logic (no external dependencies)
│   ├── aggregates/      # Aggregate roots
│   ├── entities/        # Domain entities
│   ├── value-objects/   # Value objects
│   ├── domain-events/   # Domain events
│   └── domain-services/ # Domain services
├── application/         # Use cases (orchestration)
│   ├── commands/        # Command DTOs
│   ├── queries/         # Query DTOs
│   ├── handlers/        # Command/query handlers
│   └── dtos/           # Application DTOs
└── infrastructure/      # External concerns
    ├── persistence/     # Repository implementations
    ├── messaging/       # NATS event handlers/publishers
    └── external-apis/   # External service clients
```

## Critical Architectural Rules

### 1. ESM Modules Only (RULE 2)
- All `package.json` must have `"type": "module"`
- All `tsconfig.json` must use `"module": "ES2022"` and `"target": "ES2022"`
- **Exception**: Nx webpack configs use `.cjs` extension (Nx limitation)

### 2. Dependency Direction
Dependencies must flow **downward** only:
```
Applications
    ↓
Contracts
    ↓
Domains
    ↓
Infrastructure
    ↓
Foundation
```

### 3. Service Base Class Pattern
All NATS microservices must extend `BaseMicroserviceService`:
```typescript
import { BaseMicroserviceService } from '@ai-recruitment-clerk/service-base';

export class MyService extends BaseMicroserviceService {
  // Inherits: publishEvent(), publishErrorEvent(), subscribeToEvents()
}
```

### 4. Environment Validation (RULE 10)
All services must use `@ai-recruitment-clerk/configuration`:
```typescript
import { createValidator } from '@ai-recruitment-clerk/configuration';

const env = createValidator(serviceSchema);
const port = env.getNumber('PORT');
```

## Microservice Communication

### Message Flow
```
app-gateway (HTTP/REST)
    │
    ├──→ NATS Publish → resume-parser-svc
    ├──→ NATS Publish → jd-extractor-svc
    ├──→ NATS Publish → scoring-engine-svc
    └──→ NATS Publish → report-generator-svc
```

### Event Naming Convention
- Format: `{domain}.{action}.{result}`
- Examples: `resume.parsed.success`, `job.extracted.success`

## File Organization (RULE 5)

```
/
├── apps/              # Application source code
├── libs/              # Library source code
├── config/            # Configuration files
│   ├── docker/        # Docker compose files
│   └── deployment/    # Platform deployment configs
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── tests/             # Test files (if any at root)
```

## Enforcement

1. **TypeScript**: `npm run typecheck` must pass (strict mode, no any types)
2. **ESLint**: `npm run lint` enforces module boundaries via `@nx/enforce-module-boundaries`
3. **Build**: `npm run build` must succeed for all affected projects

## References

- ESLint config: `eslint.config.mjs`
- Project configs: `nx.json`, `*/project.json`
- CLAUDE.md: Project-specific rules and patterns
