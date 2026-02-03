# Rollback Plan: US-006 through US-010 (Batch)

## Overview
This rollback plan covers user stories US-006 through US-010, all of which verify existing configurations or add minimal documentation/templates.

## US-006: Stabilize E2E execution for local and CI
**Status**: Already configured correctly
- E2E tests use Playwright via Nx: `npm run test:e2e`
- Playwright config at `apps/ai-recruitment-frontend-e2e/playwright.config.ts`
- CI E2E step in `.github/workflows/ci.yml` uses explicit waits
- Server lifecycle managed by Nx dev server

**Rollback**:
```bash
# If E2E configuration needs to be reverted
git revert <commit-hash>
```

## US-007: Harden GitHub Actions workflows
**Status**: Already configured correctly
- All workflows have minimal permissions (contents: read only)
- npm caching enabled in all workflows
- Concurrency groups configured to cancel redundant runs
- Example: `concurrency: group: ci-${{ github.workflow }}-${{ github.ref }}`

**Rollback**:
```bash
# If workflow hardening needs to be reverted
git revert <commit-hash>
```

## US-008: AI-coding friendly contribution workflow
**Status**: Already configured correctly
- PR template (`.github/PULL_REQUEST_TEMPLATE.md`) includes all required sections:
  - Change list (Files Changed section)
  - Risks (Security & Performance section)
  - Rollback plan (Deployment Considerations → Rollback Plan)
  - Tests run (Testing Evidence section)
- CONTRIBUTING.md documents single-issue change policy
- Review checklist comprehensive (lines 227-266)

**Rollback**:
```bash
# If PR template changes need to be reverted
git checkout HEAD~1 .github/PULL_REQUEST_TEMPLATE.md
git checkout HEAD~1 CONTRIBUTING.md
```

## US-009: Introduce CODEOWNERS and review coverage
**Changes Made**: Expanded `.github/CODEOWNERS` to cover:
- `apps/**` → @app-owners
- `libs/**` → @lib-owners
- `.github/workflows/**` → @release-owners
- E2E tests → @qa-owners
- Security files → @security-team
- Default → @maintainers

**Rollback**:
```bash
# Restore original CODEOWNERS
git show HEAD~1:.github/CODEOWNERS > .github/CODEOWNERS
git add .github/CODEOWNERS
git commit -m "revert: restore original CODEOWNERS"
```

Or simply edit `.github/CODEOWNERS` and remove new entries.

## US-010: Add issue templates for bug/feature/ops
**Changes Made**: Added `.github/ISSUE_TEMPLATE/ops_task.yml`

**Rollback**:
```bash
# Remove ops template
rm .github/ISSUE_TEMPLATE/ops_task.yml
git add .github/ISSUE_TEMPLATE/ops_task.yml
git commit -m "revert: remove ops task template"
```

## Bulk Rollback

If all changes from US-006 through US-010 need to be reverted:

```bash
# Option 1: Revert all commits
git log --oneline -10  # Find commit hashes
git revert <commit-hash-010> <commit-hash-009> ... <commit-hash-006>

# Option 2: Reset to before changes
git reflog -10  # Find pre-US-006 state
git reset --hard <commit-before-006>
```

## Verification After Rollback

For each story, verify:
- [ ] US-006: `npm run test:e2e` still works (if tests exist)
- [ ] US-007: CI workflows still run with correct permissions
- [ ] US-008: PR template exists and has required sections
- [ ] US-009: CODEOWNERS file exists (minimal or expanded)
- [ ] US-010: At least bug_report.yml and feature_request.yml exist

## Risk Assessment

| Story | Risk Level | Impact | Recovery Time |
|-------|-----------|--------|---------------|
| US-006 | Very Low | E2E tests only | < 2 min |
| US-007 | Low | CI workflows | < 5 min |
| US-008 | Very Low | Documentation | < 2 min |
| US-009 | Low | Code review requirements | < 2 min |
| US-010 | Very Low | Issue templates | < 1 min |

## Important Notes

1. **Most configurations already existed** - these stories verified and documented existing state
2. **CODEOWNERS expansion** adds review requirements but doesn't break anything
3. **ops_task.yml** is a new template that doesn't affect existing workflows
4. **CI workflows** were already hardened - no changes needed
5. **PR template** was already comprehensive - no changes needed
6. All changes are non-breaking and additive only

## Related Files

- `apps/ai-recruitment-frontend-e2e/playwright.config.ts` - E2E configuration
- `.github/workflows/ci.yml` - CI workflow (E2E step)
- `.github/workflows/contract-validation.yml` - Contract validation workflow
- `.github/workflows/release.yml` - Release workflow
- `.github/PULL_REQUEST_TEMPLATE.md` - PR template
- `CONTRIBUTING.md` - Contribution guidelines
- `.github/CODEOWNERS` - Code review requirements
- `.github/ISSUE_TEMPLATE/bug_report.yml` - Bug report template
- `.github/ISSUE_TEMPLATE/feature_request.yml` - Feature request template
- `.github/ISSUE_TEMPLATE/ops_task.yml` - Operations task template (new)
