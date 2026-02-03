# Testing Guide: Smoke Tests vs Full Suite

This guide explains when to use smoke tests versus the full test suite.

## Quick Reference

| Command | Runtime | When to Use | What It Tests |
|---------|---------|-------------|---------------|
| `npm run test:smoke` | ~10-15s | Active development, TDD cycles | Core libs + critical domains + main apps |
| `npm run test` | ~30s | Before committing, quick verification | All unit tests (full suite) |
| `npm run test:ci` | ~30s | PR validation, CI parity | Full suite + coverage thresholds |
| `npm run test:e2e` | ~2-3m | Before merging, feature completion | End-to-end browser tests |

## Smoke Tests (`npm run test:smoke`)

### Purpose
Fast feedback during active development. Run frequently while coding.

### What's Included
Smoke tests cover the most critical parts of the system:

**1. Core Shared Libraries (foundational)**
- `api-contracts` - Validates TypeScript compilation and API definitions
- `shared-dtos` - Core data structures used across the system
- `infrastructure-shared` - Redis, caching, and infrastructure

**2. Critical Domain Libraries (business logic)**
- `user-management-domain` - Authentication and user management
- `job-management-domain` - Job creation and management
- `candidate-scoring-domain` - Resume scoring logic

**3. Core Applications (entry points)**
- `app-gateway` - Main API gateway
- `ai-recruitment-frontend` - Angular frontend

### Configuration
- **Config file**: `jest.smoke.config.mjs`
- **Test timeout**: 10 seconds per test (fail fast)
- **Max workers**: 1 (serial execution for consistent results)
- **Bail on failure**: Stops on first failure (fast feedback)
- **Verbose**: Off (reduced output for faster scanning)

### When to Use Smoke Tests

✅ **Use smoke tests for:**
- **TDD red-green-refactor cycles**: Run on every save during active development
- **Quick sanity checks**: Verify code compiles and core logic works
- **Before committing**: Catch obvious issues before running full suite
- **Refactoring non-critical code**: Fast feedback when changing UI, config, etc.
- **Local development**: When working on isolated features

❌ **Don't use smoke tests for:**
- **Before pushing**: Always run full suite before pushing
- **PR validation**: CI runs full suite, smoke tests aren't enough
- **After completing features**: Verify with full suite + E2E tests
- **Debugging test failures**: Full suite provides more context

## Full Test Suite (`npm run test`)

### Purpose
Comprehensive verification of all unit tests across the entire codebase.

### What's Included
All unit tests from:
- **All 14 libraries**: Every domain library, shared library, and utility
- **All 6 microservices**: app-gateway, resume-parser, jd-extractor, scoring-engine, report-generator, ai-recruitment-frontend
- **All test files**: Including integration tests, unit tests, and component tests

### Configuration
- **Config file**: `jest.config.mjs`
- **Pass with no tests**: Allows projects with no tests
- **Parallel execution**: Runs tests in parallel for speed
- **Standard timeout**: Default Jest timeouts

### When to Use Full Suite

✅ **Use full suite for:**
- **Before pushing**: Always run before `git push`
- **Pre-commit verification**: Part of `npm run ci:local`
- **After feature completion**: Verify all tests pass
- **Debugging failures**: Get full context on what's broken
- **CI parity**: Match what CI runs

## CI Test Suite (`npm run test:ci`)

### Purpose
CI parity with coverage thresholds and quality gates.

### What's Included
- Full test suite (all projects)
- Code coverage report
- Coverage threshold enforcement (via `verify-quality-gates.mjs`)

### Configuration
- **CI mode**: Optimized for CI environments
- **Coverage reporting**: Generates coverage reports
- **Quality gates**: Fails if coverage thresholds not met

## E2E Tests (`npm run test:e2e`)

### Purpose
End-to-end browser testing using Playwright.

### What's Included
- Full user flows in a real browser
- Frontend-backend integration
- Critical user journeys (job creation, resume upload, etc.)

### Configuration
- **Framework**: Playwright (Nx integration)
- **Browsers**: Chrome, Firefox, WebKit (configurable)
- **Runtime**: 2-3 minutes typically

### When to Use E2E Tests

✅ **Use E2E tests for:**
- **Before merging**: Always run before merging to main
- **Feature completion**: Verify end-to-end functionality
- **Regression testing**: Catch integration issues
- **Deployment verification**: Test after deployments

## Test Workflow Recommendations

### During Active Development (TDD)
```bash
# 1. Red: Write failing test
# 2. Green: Run smoke tests (fast feedback)
npm run test:smoke

# 3. Refactor: Run smoke tests again
npm run test:smoke

# 4. Before commit: Run full suite
npm run test
```

### Before Committing
```bash
# Quick verification (includes smoke + other tests)
npm run test

# Or run full CI parity locally
npm run ci:local  # test → lint → typecheck → build
```

### Before Pushing
```bash
# Always run full suite before pushing
npm run test

# If you have time, run full CI locally
npm run ci:local
npm run test:e2e  # Only if needed
```

### Before Creating PR
```bash
# Complete verification
npm run ci:local      # Lint, typecheck, test, build
npm run test:e2e      # E2E tests

# Verify no issues
gh pr view  # Check PR status
```

## Troubleshooting

### Smoke Tests Pass but Full Suite Fails
**Cause**: Code change broke a non-critical test
**Solution**: Run full suite to see what's failing
```bash
npm run test  # See full output
```

### Full Suite Passes but CI Fails
**Cause**: Environment difference or coverage threshold
**Solution**:
```bash
# Run with coverage
npm run test:ci

# Check coverage thresholds
node tools/ci/verify-quality-gates.mjs
```

### Smoke Tests Too Slow
**Cause**: Too many projects in smoke config
**Solution**: Edit `jest.smoke.config.mjs` to remove less critical projects

### Tests Flaky (Inconsistent Results)
**Cause**: Parallel execution or race conditions
**Solution**:
```bash
# Run serially for debugging
npm run test -- --runInBand

# Or use smoke tests (already serial)
npm run test:smoke
```

## Customizing Smoke Tests

To add or remove projects from smoke tests, edit `jest.smoke.config.mjs`:

```javascript
const baseProjects = [
  // Add more libraries here
  '<rootDir>/libs/your-library/jest.config.ts',

  // Remove projects by commenting them out
  // '<rootDir>/apps/slow-app/jest.config.ts',
];
```

**Guidelines for smoke test scope:**
- **Include**: Core libraries, critical domains, main apps
- **Exclude**: Edge cases, experimental features, slow tests
- **Target runtime**: 10-15 seconds maximum
- **Target coverage**: ~20-30% of total tests

## Additional Resources

- `jest.config.mjs` - Full test suite configuration
- `jest.smoke.config.mjs` - Smoke test configuration
- `docs/CI_RUNBOOK.md` - CI and local development practices
- `CONTRIBUTING.md` - Contribution guidelines
