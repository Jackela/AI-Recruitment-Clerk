# CI Runbook - Local Command Mapping

This runbook maps every GitHub Actions CI workflow to its corresponding local command. Use this for local development, debugging CI failures, and running tests before pushing.

## Prerequisites

### Required Software
- **Node.js**: >= 20.18.0 (see `.nvmrc`)
- **npm**: >= 10.0.0
- **git**: Latest version

### Setup Commands
```bash
# Install dependencies
npm install

# Verify installation
npm run lint  # Should complete without errors
```

### Environment Variables
Most CI workflows run without custom environment variables. Some workflows may require:
- `GITHUB_TOKEN`: For GitHub API calls (automatically provided in CI)
- `NPM_TOKEN`: For publishing packages (only in release workflow)

---

## CI Workflows

### 1. **Main CI Workflow** (`.github/workflows/ci.yml`)

Runs on: Pull requests, pushes to main branch

| CI Job | Local Command | Runtime | Description |
|--------|--------------|---------|-------------|
| `lint` | `npm run lint` | ~20s | ESLint checks on all projects |
| `typecheck` | `npm run typecheck` | ~15s | TypeScript compilation checks |
| `build` | `npm run build` | ~45s | Build all applications |
| `test_coverage` | `npm run test:coverage` | ~30s | Unit tests with coverage |
| `e2e_smoke` | `npm run test:e2e` | ~2-3m | Playwright E2E tests |
| `pii_scan` | `node tools/ci/pii-scan.mjs` | ~10s | PII data scanning |

**Run all CI checks locally:**
```bash
npm run ci:local
```
This runs: test → lint → typecheck → build

**Run individual jobs:**
```bash
npm run lint                    # Lint only
npm run typecheck               # Type check only
npm run build                   # Build only
npm run test:coverage           # Tests with coverage
npm run test:e2e                # E2E tests
```

---

### 2. **API Contract Validation** (`.github/workflows/contract-validation.yml`)

Runs on: Pushes to main/develop, PRs affecting contract files

| CI Job | Local Command | Runtime | Description |
|--------|--------------|---------|-------------|
| `validate-contracts` | `npm run validate:contracts:ci` | ~30s | Validate OpenAPI specs, TypeScript compilation |
| | `cd libs/api-contracts && npm test` | ~10s | Test API contracts library |
| | `npm run build:with-contracts` | ~1m | Build with contract validation |
| `frontend-backend-consistency` | Manual check | ~5s | Compare frontend/backend models (manual) |
| `security-check` | `grep -rE "password\|secret" libs/api-contracts/src/` | ~5s | Check for hardcoded secrets |

**Run contract validation locally:**
```bash
npm run validate:contracts:ci
npm run build:with-contracts
```

**Test API contracts library:**
```bash
cd libs/api-contracts && npm test
```

---

### 3. **Security Scan** (`.github/workflows/security.yml`)

Runs on: Pushes to main/develop, pull requests

| CI Job | Local Command | Runtime | Description |
|--------|--------------|---------|-------------|
| `codeql` | Not available locally | ~2m | CodeQL analysis (GitHub-hosted only) |
| `dependency-scan` | `npm audit --audit-level=moderate` | ~15s | Dependency vulnerability scan |
| `secret-scan` | `npx trufflehog filesystem . --only-verified` | ~30s | Secret scanning |
| | `gitleaks detect --source . --verbose` | ~20s | GitLeaks secret scanning |

**Run security scans locally:**
```bash
# Dependency scan
npm audit --audit-level=moderate

# Secret scan (requires installation)
npm install -g trufflehog gitleaks
trufflehog filesystem . --only-verified
gitleaks detect --source . --verbose
```

---

### 4. **Semantic Release** (`.github/workflows/release.yml`)

Runs on: Pushes to main/develop branches

| CI Step | Local Command | Runtime | Description |
|---------|--------------|---------|-------------|
| Install dependencies | `npm ci` | ~1m | Clean install dependencies |
| Dependency gate | `npm audit --json > data/security/dependency-inventory.json && node scripts/dependency-gate.mjs` | ~20s | Generate inventory and evaluate gate |
| Build project | `npm run build` | ~45s | Build for release |
| Semantic release | `npx semantic-release` | ~30s | Create release (dry-run locally) |

**Test release locally:**
```bash
# Generate dependency inventory
npm audit --json > data/security/dependency-inventory.json

# Evaluate release gate
node scripts/dependency-gate.mjs

# Build project
npm run build

# Dry-run semantic release (won't publish)
npx semantic-release --dry-run
```

---

### 5. **Code Coverage** (`.github/workflows/coverage.yml`)

Runs on: Pull requests, pushes to main

| CI Job | Local Command | Runtime | Description |
|--------|--------------|---------|-------------|
| `coverage` | `npm run test:coverage` | ~30s | Generate coverage report |
| | `node tools/ci/verify-quality-gates.mjs` | ~5s | Verify coverage thresholds |

**Run coverage checks locally:**
```bash
npm run test:coverage
node tools/ci/verify-quality-gates.mjs
```

---

### 6. **E2E Nightly** (`.github/workflows/e2e-nightly.yml`)

Runs on: Scheduled (cron), manual workflow dispatch

| CI Job | Local Command | Runtime | Description |
|--------|--------------|---------|-------------|
| `e2e-full` | `npm run test:e2e` | ~3-5m | Full E2E test suite |

**Run E2E tests locally:**
```bash
npm run test:e2e
```

---

### 7. **Continuous Deployment** (`.github/workflows/cd.yml`)

Runs on: Manual workflow dispatch with environment input

| CI Job | Local Command | Runtime | Description |
|--------|--------------|---------|-------------|
| `deploy` | Manual deployment | ~5m | Deploy to Railway (environment-specific) |

**Local deployment:**
```bash
# Deploy to Railway (requires Railway CLI)
railway up

# Or use the deployment script
npm run deploy:pre      # Deploy to pre-production
npm run deploy:prod     # Deploy to production
```

---

### 8. **Local CD Testing** (`.github/workflows/cd-local.yml`)

Runs on: Manual workflow dispatch for testing CD workflows

| CI Job | Local Command | Runtime | Description |
|--------|--------------|---------|-------------|
| `test-cd` | `act -W .github/workflows/cd-local.yml` | ~2m | Test CD workflow with act |

**Run CD workflow locally:**
```bash
npm run act:cd:local
```

---

### 9. **Migration Rehearsal** (`.github/workflows/migration-rehearsal.yml`)

Runs on: Manual workflow dispatch

| CI Job | Local Command | Runtime | Description |
|--------|--------------|---------|-------------|
| `rehearsal` | Manual migration testing | ~5m | Test migration procedures |

**Run migration rehearsal locally:**
```bash
npm run act:migration-rehearsal
```

---

### 10. **CI Affected** (`.github/workflows/ci-affected.yml`)

Runs on: Pull requests only (optimized for affected projects)

| CI Job | Local Command | Runtime | Description |
|--------|--------------|---------|-------------|
| `affected` | `npx nx run-many -t lint test build --all` | ~2m | Run tasks on affected projects only |

**Run affected commands locally:**
```bash
# Nx will automatically detect affected projects
npx nx run-many -t lint --all
npx nx run-many -t test --all
npx nx run-many -t build --all
```

---

## Quick Reference Commands

### Pre-Push Verification
```bash
npm run ci:local
```

### Full CI Verification
```bash
npm run test && npm run lint && npm run typecheck && npm run build && npm run test:e2e
```

### Quick Smoke Test
```bash
npm run lint && npm run typecheck
```

### Debugging CI Failures

**Lint failures:**
```bash
# Run lint with verbose output
npm run lint -- --verbose

# Auto-fix lint issues
npm run lint -- --fix
```

**Typecheck failures:**
```bash
# Run typecheck with detailed output
npx tsc --noEmit --project tsconfig.ci.json --pretty
```

**Build failures:**
```bash
# Build with verbose output
npm run build -- --verbose

# Build specific project
npx nx build app-gateway
```

**Test failures:**
```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/test.spec.ts
```

**E2E failures:**
```bash
# Run E2E tests with headed browser
npm run test:e2e -- --headed

# Run E2E tests in debug mode
npm run test:e2e -- --debug

# Run specific E2E test file
npx playwright test path/to/test.spec.ts
```

---

## Act CLI - Running GitHub Actions Locally

The project includes `act` commands to run GitHub Actions workflows locally.

### Prerequisites
```bash
# Install act (macOS/Linux)
brew install act

# Or install via npm
npm install -g act-cli
```

### Run Workflows Locally
```bash
# Run main CI workflow
npm run act:ci

# Run affected CI workflow
npm run act:ci-affected

# Run CD workflow (pre-production)
npm run act:cd:pre

# Run CD workflow (production)
npm run act:cd:prod

# Run E2E nightly workflow
npm run act:e2e-nightly

# Run migration rehearsal
npm run act:migration-rehearsal

# Run local CD test
npm run act:cd:local
```

---

## Runtime Expectations

| Command | Expected Runtime | Timeout |
|---------|-----------------|---------|
| `npm run lint` | ~20s | 15m (CI) |
| `npm run typecheck` | ~15s | 15m (CI) |
| `npm run build` | ~45s | 20m (CI) |
| `npm run test` | ~30s | 30m (CI) |
| `npm run test:coverage` | ~30s | 30m (CI) |
| `npm run test:e2e` | ~2-3m | 40m (CI) |
| `npm run ci:local` | ~2m | N/A (local) |
| `npm audit` | ~15s | 10m (CI) |

**Note**: CI runtimes include environment setup, caching, and artifact uploads. Local runtimes are typically faster.

---

## Troubleshooting

### Common Issues

**1. "MODULE_NOT_FOUND" errors**
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install
```

**2. "Nx command not found"**
```bash
# Reinstall dependencies
npm install

# Or use npx
npx nx <command>
```

**3. Playwright browser errors**
```bash
# Install Playwright browsers
npx playwright install --with-deps
```

**4. TypeScript errors in CI but not locally**
```bash
# Ensure local Node version matches CI
cat .nvmrc  # Check required version
nvm use     # Switch to required version (if using nvm)
node --version  # Verify version
```

**5. E2E tests fail locally**
```bash
# Start local servers first
npm run build && npm start

# In another terminal, run E2E tests
npm run test:e2e
```

---

## CI-Local Parity Checklist

Before pushing, ensure all local checks pass:

- [ ] `npm run lint` - No lint errors
- [ ] `npm run typecheck` - No type errors
- [ ] `npm run test` - All tests pass
- [ ] `npm run build` - Build succeeds
- [ ] `npm run test:e2e` - E2E tests pass (if applicable)

Run `npm run ci:local` for a quick verification (excludes E2E).

---

## Additional Resources

- **CONTRIBUTING.md**: Full contribution guidelines
- **CLAUDE.md**: Project-specific instructions
- **docs/ROLLBACK-*.md**: Rollback plans for specific user stories
- **.github/workflows/**: CI workflow definitions
- **package.json**: All available npm scripts
