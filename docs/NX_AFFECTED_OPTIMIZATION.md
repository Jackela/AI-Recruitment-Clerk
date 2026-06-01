# Nx Affected Test Optimization

## Overview

This optimization enables **intelligent test selection** - only running tests for projects affected by code changes. This reduces CI pipeline time by 70%+ for typical PRs.

## Quick Start

```bash
# Run tests only for affected projects
npm run test:affected

# Run smart test selection with detailed output
npm run test:smart

# Show which projects are affected
npm run nx:affected:show

# Generate dependency graph
npm run nx:graph
```

## Configuration Changes

### 1. Nx Configuration (`nx.json`)

```json
{
  "targetDefaults": {
    "test": {
      "cache": true,
      "dependsOn": ["build"],
      "inputs": [
        "default",
        "^default",
        "{workspaceRoot}/jest.config.mjs",
        "{projectRoot}/jest.config.ts"
      ]
    }
  }
}
```

**Benefits:**

- Test caching enabled
- Build dependency ensures tests run against latest code
- Proper input tracking for cache invalidation

### 2. CI Workflow (`.github/workflows/ci-affected.yml`)

```yaml
- name: Test affected
  run: |
    if [ "${{ github.event_name }}" = "pull_request" ]; then
      npx nx affected -t test --base=origin/main --head=HEAD --parallel=4
    else
      npx nx run-many -t test --all --parallel=4
    fi
```

**Features:**

- PRs: Only run affected tests
- Main branch: Run all tests
- Parallel execution (4 workers)

### 3. Cache Configuration

```yaml
- name: Cache Nx
  uses: actions/cache@v3
  with:
    path: |
      .nx/cache
      node_modules/.cache/nx
    key: nx-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

**Cache Strategy:**

- `.nx/cache`: Nx computation cache
- `node_modules/.cache/nx`: Task results
- Cache key includes package-lock.json hash

## Smart Test Selection Script

Located at `scripts/smart-test-selection.mjs`:

```bash
# Run affected tests
node scripts/smart-test-selection.mjs run

# Show affected projects with tests
node scripts/smart-test-selection.mjs show

# Generate dependency graph
node scripts/smart-test-selection.mjs graph
```

## NPM Scripts

| Script                     | Description                      |
| -------------------------- | -------------------------------- |
| `npm run test:affected`    | Run tests for affected projects  |
| `npm run test:affected:ci` | CI-optimized affected tests      |
| `npm run test:smart`       | Smart test selection with output |
| `npm run test:smart:show`  | Show affected test projects      |
| `npm run test:smart:graph` | Generate dep graph               |
| `npm run nx:graph`         | Full dependency graph            |
| `npm run nx:affected:show` | List affected projects           |

## How It Works

### Affected Detection

```
Code Change → Nx Graph Analysis → Affected Projects → Test Selection → Run Tests
```

1. **Git diff**: Compare base branch (main) to HEAD
2. **Dependency graph**: Nx analyzes project dependencies
3. **Test filter**: Only projects with `test` target and test files
4. **Parallel execution**: Run tests with 4 workers

### Example Scenario

**PR changes:** `apps/app-gateway/src/auth/auth.service.ts`

**Affected projects:**

- `app-gateway` (direct change)
- `libs/user-management-domain` (if depended on by auth)

**Tests run:**

- `app-gateway` unit tests
- `user-management-domain` unit tests
- E2E tests (if configured)

**Tests skipped:**

- Frontend tests
- Other service tests
- Unrelated library tests

## Performance Impact

### Before Optimization

- All tests: ~15-20 minutes
- Every PR runs 100% of tests

### After Optimization

- Typical PR: ~3-5 minutes (70% reduction)
- Large changes: ~10-15 minutes (affected only)
- Full run (main branch): ~15-20 minutes

## Best Practices

1. **Use affected for PRs**
   - Faster feedback
   - Reduced CI costs
   - Focus on relevant changes

2. **Full run on main branch**
   - Ensures stability
   - Catches integration issues
   - Baseline for affected detection

3. **Monitor cache hit rate**

   ```bash
   npx nx report
   ```

4. **Keep dependencies clean**
   - Minimize cross-project deps
   - Use library boundaries
   - Regular dep graph review

## Troubleshooting

### Tests not running when expected

Check affected status:

```bash
npx nx show projects --affected --base=origin/main
```

### Cache issues

Clear cache:

```bash
npx nx reset
rm -rf .nx/cache node_modules/.cache/nx
```

### Parallel execution issues

Reduce parallelism:

```bash
npx nx affected -t test --parallel=2
```

## Environment Variables

| Variable      | Description                | Default       |
| ------------- | -------------------------- | ------------- |
| `NX_BASE`     | Base git reference         | `origin/main` |
| `NX_HEAD`     | Head git reference         | `HEAD`        |
| `NX_PARALLEL` | Number of parallel workers | `4`           |
| `CI`          | CI mode flag               | -             |

## References

- [Nx Affected Documentation](https://nx.dev/nx-api/nx/documents/affected)
- [Nx Caching](https://nx.dev/features/cache-task-results)
- [Nx Graph](https://nx.dev/features/explore-graph)
