# Repository Refactor Checklist

Use this checklist before committing any refactoring changes to prevent regressions.

## Pre-Refactor

- [ ] **Understand existing code** - Read related files and understand current patterns
- [ ] **Check for dependencies** - Identify what imports/uses the code you're changing
- [ ] **Write tests first** - Add tests for behavior you're refactoring (TDD)
- [ ] **Create feature branch** - Never refactor directly on main

## During Refactor

- [ ] **Follow existing patterns** - Use established patterns from the codebase (see `scripts/ralph/progress.txt`)
- [ ] **Maintain ESM compatibility** - No CommonJS imports/exports (except webpack .cjs configs)
- [ ] **Preserve types** - All code must be strictly typed (no `any`)
- [ ] **Keep it minimal** - Only change what's necessary for the refactor

## Verification

### Local Checks
- [ ] **npm run typecheck** - TypeScript compilation must pass
- [ ] **npm run lint** - Linting must pass
- [ ] **npm run test** - Unit tests must pass
- [ ] **npm run build** - Build must succeed
- [ ] **npm run test:e2e** - E2E tests must pass
- [ ] **npm run validate:contracts:ci** - Contract validation must pass

### Quality Checks
- [ ] **No new required envs** - Unless explicitly adding a feature
- [ ] **Fail-fast maintained** - Applications must start correctly or fail immediately
- [ ] **No test-only code in production** - Remove mocks/stubs before committing
- [ ] **Files < 500 lines** - Split larger files (see `RULE 6: CODE QUALITY STANDARDS`)

## Post-Refactor

- [ ] **Update documentation** - CLAUDE.md, progress logs, etc.
- [ ] **Commit with clear message** - Format: `feat: [Story ID] - [Title]`
- [ ] **Pull request review** - Get review for non-trivial changes
- [ ] **Verify deployment** - Ensure build succeeds on CI/CD

## Quick Reference

### Project-Specific Commands
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm run test              # Unit tests
npm run test:e2e         # E2E tests
npm run ci:local         # Full CI suite locally

# Contract validation
npm run validate:contracts:ci

# Building
npm run build
```

### Key Files to Check
- `CLAUDE.md` - Project rules and patterns
- `scripts/ralph/progress.txt` - Codebase patterns and learnings
- `docs/NATS_BASE_CLASS_AUDIT.md` - NATS service architecture
- `tsconfig.ci.json` - TypeScript strict mode settings

### Common Patterns

- **Validation Pipe**: Use `@ai-recruitment-clerk/infrastructure-shared` -> `createDtoValidationPipe`
- **Env Access**: Use `@ai-recruitment-clerk/configuration` -> `validateEnv(serviceName)`
- **NATS Services**: Extend `BaseMicroserviceService` from `@ai-recruitment-clerk/service-base`
- **Error Responses**: Use `ErrorResponseDto` from `@ai-recruitment-clerk/shared-dtos`

## Notes

- This checklist is intentionally short - focus on the critical items
- For comprehensive refactors, consider breaking into smaller PRs
- When in doubt, ask for review before committing
