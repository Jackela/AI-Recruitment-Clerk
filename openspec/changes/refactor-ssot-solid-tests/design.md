# Design Notes: SSOT, SOLID, and Test Coverage Refactoring

## Context
The codebase has evolved organically, leading to:
- Type definitions duplicated across multiple locations
- Large monolithic services handling multiple concerns
- Inconsistent test coverage, especially for security-critical components

## Goals
1. Achieve SSOT for all shared types (ValidationResult, ResumeDTO, Health types)
2. Reduce maximum service file size from 1,179 to <500 lines
3. Increase test coverage from 52% to 80%, with 95% for security components
4. Enable easier maintenance through clear separation of concerns

## Non-Goals
- Complete rewrite of business logic
- Changes to external APIs or database schemas
- Performance optimizations beyond what refactoring naturally provides

## Decisions

### Decision 1: Type Centralization Strategy
**Choice**: Create canonical types in `libs/shared-dtos/`
**Rationale**:
- Already the designated shared library
- All services already depend on it
- Minimizes import path changes

**Alternatives Considered**:
- Create new `libs/types/` package - Rejected (adds dependency)
- Co-locate types with services - Rejected (violates SSOT)

### Decision 2: Strategy Pattern for ParsingService
**Choice**: Use Strategy pattern with interface + concrete implementations
**Rationale**:
- Enables Open/Closed principle compliance
- Adding new file types won't require changes to orchestrator
- Each strategy can be tested independently

**Implementation**:
```typescript
interface ParsingStrategy {
  supports(mimeType: string): boolean;
  parse(buffer: Buffer, filename: string): Promise<ResumeDTO>;
}
```

### Decision 3: Facade Pattern for God Classes
**Choice**: Keep original service as facade, extract logic to focused services
**Rationale**:
- Maintains backward compatibility
- Consumers don't need to change imports
- Enables incremental migration

**Example**:
```typescript
// auth.service.ts (facade)
@Injectable()
export class AuthService {
  constructor(
    private registration: RegistrationService,
    private authentication: AuthenticationService,
    private token: TokenService,
  ) {}

  register(dto: RegisterDto) { return this.registration.register(dto); }
  login(dto: LoginDto) { return this.authentication.login(dto); }
}
```

### Decision 4: Test Priority Order
**Choice**: Security tests first, then business logic
**Rationale**:
- Security components protect against real vulnerabilities
- Guards and middleware are thin, easy to test
- Provides immediate security improvement

## Risks & Mitigations

### Risk 1: Breaking Changes During Refactoring
**Mitigation**:
- Use facade pattern to maintain existing APIs
- Re-export types from original locations
- Run tests after each change

### Risk 2: Import Path Conflicts
**Mitigation**:
- Update barrel exports in index.ts files
- Use TypeScript path aliases consistently
- Lint rules to catch invalid imports

### Risk 3: Circular Dependencies
**Mitigation**:
- Extract shared interfaces to separate files
- Use NestJS forwardRef() when needed
- Review dependency graph after changes

## Migration Plan

### Phase 1: SSOT (Low Risk)
1. Create new type files
2. Add re-exports from original locations
3. Update consumers gradually
4. Remove duplicate definitions

### Phase 2: Tests (No Risk)
1. Add test files - purely additive
2. No changes to production code
3. Immediate coverage improvement

### Phase 3: DRY (Medium Risk)
1. Create strategy implementations
2. Refactor orchestrator
3. Delete duplicate service
4. Update module providers

### Phase 4: SRP (Medium-High Risk)
1. Create new focused services
2. Move logic incrementally
3. Update facades
4. Update modules

## Open Questions
- Should MFAService refactoring be included or deferred?
- Should we add integration tests for refactored services?

## File Size Targets

| Service | Current | Target |
|---------|---------|--------|
| ParsingService | 1,179 | <300 |
| AuthService | 719 | <100 (facade) |
| AnalyticsIntegrationService | 914 | <100 (facade) |
| MFAService | 602 | <100 (facade) |
