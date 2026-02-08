# Rollback Plan: US-015 - Establish CI parity runbook

## Summary
Created `docs/CI_RUNBOOK.md` - a comprehensive mapping of GitHub Actions CI workflows to local commands. The runbook includes runtime expectations, prerequisites, troubleshooting guides, and AI-friendly copy-pasteable commands.

## Changes Made

### 1. Created docs/CI_RUNBOOK.md
- **Comprehensive workflow mapping**: All 10 CI workflows mapped to local commands
- **Quick reference tables**: CI job → local command → runtime → description
- **Prerequisites section**: Required software and environment setup
- **Troubleshooting guide**: Common issues and solutions
- **Act CLI integration**: Commands for running GitHub Actions locally
- **Pre-push verification checklist**: Ensure CI parity before pushing

## Rollback Options

### Option 1: Delete the Runbook (Recommended)
```bash
# Delete the runbook
git rm docs/CI_RUNBOOK.md
git commit -m "revert: remove CI runbook"
```

### Option 2: Keep as Reference (No Action)
The runbook is purely documentation and does not affect CI behavior. You can keep it as a reference or archive it:

```bash
# Archive instead of deleting
mkdir -p docs/archive
mv docs/CI_RUNBOOK.md docs/archive/CI_RUNBOOK.md
git add docs/archive/CI_RUNBOOK.md
git commit -m "docs: archive CI runbook"
```

### Option 3: Revert the Commit
```bash
# Revert the commit that added the runbook
git revert <commit-hash>

# OR reset if this is the latest commit
git reset --hard HEAD~1
```

## Verification After Rollback

```bash
# Verify CI still works (push a test commit or check existing runs)
gh run list --workflow=ci.yml

# Verify local commands still work
npm run lint
npm run typecheck
npm run build
npm run test

# Verify the runbook is removed/archived
test -f docs/CI_RUNBOOK.md && echo "Runbook exists" || echo "Runbook removed"
```

## Impact Assessment

### What This Change Affects
- **Documentation only**: No code changes, no CI configuration changes
- **Developer workflow**: Provides a single source of truth for CI-local parity
- **AI assistance**: AI agents can reference this runbook for local verification commands

### What This Change Does NOT Affect
- CI workflow execution (no changes to `.github/workflows/`)
- Build or test behavior
- Deployment processes
- Any runtime application behavior

## Known Issues

### Potential Documentation Drift
The runbook may become outdated if:
- New CI workflows are added
- Existing workflows are modified
- New npm scripts are added
- Script commands change

**Mitigation**: Update the runbook when modifying CI workflows or npm scripts.

### Maintenance Overhead
The runbook requires manual updates to stay in sync with:
- `.github/workflows/*.yml` files
- `package.json` scripts section
- Project structure changes

**Mitigation**: Make runbook updates part of the CI workflow change process.

## Alternative Approaches

### 1. Auto-Generated Runbook
Instead of maintaining a manual runbook, use a script to generate it:

```javascript
// tools/generate-ci-runbook.mjs
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const workflowDir = '.github/workflows';
const workflows = readdirSync(workflowDir).filter(f => f.endsWith('.yml'));

// Parse workflows and generate documentation...
```

**Pros**: Always up-to-date, no manual maintenance
**Cons**: Requires parsing YAML, may produce less readable documentation

### 2. Inline Documentation
Add documentation directly to CI workflow files as comments:

```yaml
# Local equivalent: npm run lint
lint:
  runs-on: ubuntu-latest
  steps:
    - run: npm run lint
```

**Pros**: Documentation co-located with code
**Cons**: Harder to read, requires checking multiple files

### 3. CONTRIBUTING.md Updates
Expand the existing CONTRIBUTING.md instead of creating a separate runbook.

**Pros**: Single source of truth, no new files
**Cons**: CONTRIBUTING.md may become too large, harder to maintain

## Rollback Decision Matrix

| Scenario | Recommended Action |
|----------|-------------------|
| Runbook is inaccurate | Delete and regenerate (Option 1) |
| Runbook is not being used | Archive for reference (Option 2) |
| Better alternative found | Revert and implement alternative (Option 3) |
| Causing confusion | Delete and improve CONTRIBUTING.md instead |

## Additional Notes

- The runbook follows the same structure as existing documentation (CONTRIBUTING.md, DEVELOPER_GUIDE.md)
- All commands in the runbook are copy-pasteable and tested
- Runtimes are based on actual CI execution times and local measurements
- Troubleshooting section addresses common issues reported in project history
- Act CLI integration enables local GitHub Actions testing
- Pre-push verification checklist ensures CI parity before pushing

## Related Documentation

- `CONTRIBUTING.md`: Full contribution guidelines
- `CLAUDE.md`: Project-specific instructions for AI agents
- `docs/guides/DEVELOPER_GUIDE.md`: Comprehensive development guide
- `.github/workflows/`: CI workflow definitions
- `package.json`: Available npm scripts
