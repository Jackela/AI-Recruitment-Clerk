# Test Coverage Improvement Design

**Date**: 2026-02-27
**Branch**: refactor/controller-splitting-and-test-improvements
**Goal**: Improve test coverage from ~67% to 80% across all microservices

## Current State

| Metric     | Current | Target |
| ---------- | ------- | ------ |
| Lines      | ~67.5%  | 80%    |
| Functions  | ~63.6%  | 80%    |
| Branches   | ~54.1%  | 80%    |
| Statements | ~67.6%  | 80%    |

### Services Without Coverage Config

- `jd-extractor-svc` - Missing coverage threshold
- `scoring-engine-svc` - Missing coverage threshold
- `report-generator-svc` - Missing coverage threshold
- `app-gateway` - No coverage config found

### Services With Coverage Config

- `resume-parser-svc` - 70% threshold configured

## Phase 1: Unify Coverage Configuration

### Standard Jest Coverage Config

```typescript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

### Files to Update

1. `apps/jd-extractor-svc/jest.config.ts`
2. `apps/scoring-engine-svc/jest.config.ts`
3. `apps/report-generator-svc/jest.config.ts`
4. `apps/app-gateway/jest.config.ts` (create if missing)

## Phase 2: Coverage Gap Analysis

Run tests with coverage report:

```bash
npm run test:cov
```

Analyze results to identify:

- Files/functions missing tests
- Branch coverage gaps (conditionals, error paths)
- Priority ranking for fixes

## Phase 3: Test Implementation

### Priority Order

1. **High Priority** - Core business logic
   - Scoring algorithms
   - Resume parsing logic
   - Report generation

2. **Medium Priority** - Controllers and integration
   - API endpoints
   - NATS message handlers
   - Integration services

3. **Low Priority** - Utilities and helpers
   - Utility functions
   - Test fixtures
   - Configuration helpers

### Testing Patterns to Apply

- Use existing test fixtures from `test-fixtures.ts`
- Mock external dependencies (NATS, MongoDB, APIs)
- Focus on branch coverage (error paths, edge cases)
- Use `libs/shared-dtos/src/testing/mock-factories.ts` for DTO mocks

## Success Criteria

- [ ] All services have 70% coverage threshold in jest.config.ts
- [ ] All services pass `npm run test:cov` with thresholds
- [ ] Global coverage reaches 80% target
- [ ] Branch coverage improved from 54% to 70%+

## References

- CLAUDE.md - Project rules and testing requirements
- docs/TESTING_GUIDE.md - Testing best practices
- docs/TESTING_PATTERN.md - Testing patterns
