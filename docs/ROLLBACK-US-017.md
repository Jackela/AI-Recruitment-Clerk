# Rollback Plan: US-017 - Add task-level smoke tests for fast feedback

## Summary
Added smoke test suite (`npm run test:smoke`) that runs a minimal subset of critical tests in ~10-15 seconds. Created Jest configuration, npm script, and comprehensive testing guide documentation.

## Changes Made

### 1. Created `jest.smoke.config.cjs`
- **Purpose**: Fast subset of tests for local iteration
- **Scope**: 8 projects (3 core libs, 3 domain libs, 2 apps)
- **Configuration**:
  - `maxWorkers: 1` - Serial execution for consistency
  - `testTimeout: 10000` - 10s timeout (fail fast)
  - `bail: true` - Stop on first failure
  - `verbose: false` - Reduced output

### 2. Added npm script to `package.json`
```json
"test:smoke": "jest --config jest.smoke.config.cjs --passWithNoTests"
```

### 3. Created `docs/TESTING_GUIDE.md`
- Comprehensive guide on when to use smoke vs full suite
- Quick reference table comparing all test commands
- Workflow recommendations for different scenarios
- Troubleshooting guide
- Customization instructions

### 4. Smoke Test Scope
**Included projects**:
- `libs/api-contracts` - API contracts and TypeScript compilation
- `libs/shared-dtos` - Core data structures
- `libs/infrastructure-shared` - Infrastructure (Redis, caching)
- `libs/user-management-domain` - Authentication
- `libs/job-management-domain` - Job management
- `libs/candidate-scoring-domain` - Scoring logic
- `apps/app-gateway` - API gateway
- `apps/ai-recruitment-frontend` - Frontend

**Excluded from smoke tests**:
- All other domain libraries (7 total)
- All other microservices (4 total)
- E2E tests (always separate)
- Integration tests (always separate)

## Rollback Options

### Option 1: Remove Smoke Test Command (Recommended)
```bash
# Remove the npm script from package.json
git checkout HEAD~1 -- package.json

# Delete the config and documentation
git rm jest.smoke.config.cjs docs/TESTING_GUIDE.md
git commit -m "revert: remove smoke test suite"
```

### Option 2: Keep but Disable
Rename the smoke test config to disable it:

```bash
# Rename the config file
git mv jest.smoke.config.cjs jest.smoke.config.cjs.disabled

# Update package.json to remove test:smoke script
# Edit package.json and remove the "test:smoke" line
```

### Option 3: Revert the Commit
```bash
# Revert the commit that added smoke tests
git revert <commit-hash>

# OR reset if this is the latest commit
git reset --hard HEAD~1
```

### Option 4: Modify Smoke Test Scope
If smoke tests are too slow or too minimal, adjust the scope:

```javascript
// Edit jest.smoke.config.cjs

// To make it faster (remove some projects):
const baseProjects = [
  '<rootDir>/libs/api-contracts/jest.config.cjs',
  '<rootDir>/libs/shared-dtos/jest.config.js',
  // Remove other projects...
];

// To make it more comprehensive (add more projects):
const baseProjects = [
  // ... existing projects
  '<rootDir>/libs/your-domain/jest.config.ts',
];
```

## Verification After Rollback

```bash
# Verify smoke test command is removed
npm run test:smoke  # Should fail with "unknown script"

# Verify config files are removed
test -f jest.smoke.config.cjs && echo "Config exists" || echo "Config removed"
test -f docs/TESTING_GUIDE.md && echo "Guide exists" || echo "Guide removed"

# Verify full test suite still works
npm run test  # Should pass
```

## Impact Assessment

### What This Change Affects
- **Local development workflow**: Provides fast feedback option during active development
- **Testing documentation**: Adds comprehensive testing guide
- **npm scripts**: Adds one new script (`test:smoke`)

### What This Change Does NOT Affect
- **CI workflows**: CI still runs full test suite (`npm run test:ci`)
- **Full test suite**: `npm run test` still runs all tests
- **E2E tests**: Smoke tests don't include E2E tests
- **PR validation**: Smoke tests are optional, not enforced

## Known Issues

### Potential Confusion
Developers might:
- Use smoke tests instead of full suite before pushing
- Forget to run full suite before creating PR
- Assume smoke tests are sufficient for validation

**Mitigation**: Documentation clearly states when to use smoke vs full suite. Smoke test config includes warning comment.

### Coverage Gaps
Smoke tests don't cover:
- Edge case domains (marketing, incentives, usage, etc.)
- Microservices beyond app-gateway and frontend
- Integration tests
- E2E tests

**Mitigation**: This is intentional. Smoke tests are for fast feedback, not comprehensive validation. Full suite must still be run before pushing.

### Maintenance Overhead
Two Jest configurations must be maintained:
- `jest.config.cjs` - Full suite (all projects)
- `jest.smoke.config.cjs` - Smoke tests (subset of projects)

**Mitigation**: Smoke test config is simple and stable. Only update when project structure changes significantly.

## Alternative Approaches

### 1. Test Tags/Groups
Use Jest's `test.only` or custom tags to mark smoke tests:

```javascript
// In each test file
test.smoke('should pass', () => {
  // ...
});

// Run with custom tag
jest --selectProjects smoke
```

**Pros**: No separate config, test-level granularity
**Cons**: Requires modifying test files, inconsistent adoption

### 2. Monorepo Project Selection
Use Nx to run tests for specific projects:

```bash
# Run tests for specific projects
npx nx test api-contracts shared-dtos app-gateway
```

**Pros**: Uses Nx capabilities, no new config
**Cons**: Command is longer, no dedicated script

### 3. Watch Mode with Filter
Use Jest watch mode with file pattern filtering:

```bash
jest --watch --testPathPattern="smoke"
```

**Pros**: Interactive, fast feedback
**Cons**: Requires test file naming convention, not scriptable

### 4. No Smoke Tests
Rely on full suite for all verification.

**Pros**: Single source of truth, no confusion
**Cons**: Slower feedback loop (30s vs 10-15s)

## Rollback Decision Matrix

| Scenario | Recommended Action |
|----------|-------------------|
| Smoke tests not being used | Remove (Option 1) |
| Smoke tests too slow | Reduce scope (Option 4) |
| Smoke tests causing confusion | Keep but improve documentation |
| Team prefers alternative approach | Remove and implement alternative (Option 2 + Alternative) |
| No issues, working well | Keep as is |

## Performance Comparison

| Command | Projects | Tests (approx) | Runtime |
|---------|----------|----------------|---------|
| `npm run test:smoke` | 8 | ~50-100 | 10-15s |
| `npm run test` | 20+ | ~200-300 | 30s |
| `npm run test:ci` | 20+ | ~200-300 | 30s + coverage |
| `npm run test:e2e` | 1 | ~20-50 | 2-3m |

*Note: Test counts are estimates based on typical Jest projects. Actual counts may vary.*

## Additional Notes

- **Smoke tests are optional**: They're a convenience for local development, not a requirement
- **Full suite is mandatory**: Always run full suite before pushing/creating PR
- **CI unchanged**: CI workflows still run full suite, smoke tests are local-only
- **Documentation first**: Testing guide explains proper usage to prevent confusion
- **Fast-fail configuration**: `bail: true` stops on first failure for immediate feedback
- **Serial execution**: `maxWorkers: 1` ensures consistent results and easier debugging
- **Short timeout**: 10s timeout catches hanging tests quickly
- **Minimal output**: `verbose: false` reduces noise for faster result scanning

## Related Documentation

- `jest.config.cjs` - Full test suite configuration
- `jest.smoke.config.cjs` - Smoke test configuration
- `docs/TESTING_GUIDE.md` - Comprehensive testing guide
- `docs/CI_RUNBOOK.md` - CI and local development practices
- `package.json` - All available npm scripts
