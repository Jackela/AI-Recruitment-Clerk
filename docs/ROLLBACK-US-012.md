# Rollback Plan: US-012 - Add Dependabot or Renovate for Dependency Hygiene

## Summary
**Story ID**: US-012
**Title**: Add Dependabot or Renovate for dependency hygiene
**Changes**: Enhanced Dependabot configuration with security update grouping, documented dependency update policy in CONTRIBUTING.md

## Implementation Changes

### Files Modified
1. `.github/dependabot.yml` - Added security-updates group to Dependabot configuration
2. `CONTRIBUTING.md` - Added comprehensive "Dependency Management Policy" section

### Changes Details

#### 1. Dependabot Configuration (`.github/dependabot.yml`)
- **Added**: `security-updates` group to group all security vulnerability fixes
- **Added**: Comments to clarify grouping strategy
- **Changed**: Enhanced existing groups with better documentation

#### 2. Documentation (`CONTRIBUTING.md`)
- **Added**: "Dependency Management Policy" section with:
  - Update groups explanation
  - Schedule information
  - Review workflow steps
  - Security updates policy
  - Troubleshooting guide

---

## Rollback Options

### Option 1: Git Revert (Recommended)
**Use when**: You want to completely remove the changes and return to previous state.

```bash
# Revert the commit
git revert <commit-hash>

# Or hard reset (if not yet pushed)
git reset --hard HEAD~1
```

**Verification**:
```bash
# Check that security-updates group is removed
grep -A 5 "security-updates" .github/dependabot.yml
# Should return nothing

# Check that documentation is removed
grep -A 10 "Dependency Management Policy" CONTRIBUTING.md
# Should return nothing
```

### Option 2: Manual Patch Removal
**Use when**: You want to selectively remove parts of the implementation.

#### Remove Security Updates Group from Dependabot
```bash
# Edit .github/dependabot.yml
# Remove the "security-updates" group section (lines 32-36)
```

**Original configuration**:
```yaml
groups:
  development-dependencies:
    dependency-type: "development"
    update-types:
      - "minor"
      - "patch"
  production-dependencies:
    dependency-type: "production"
    update-types:
      - "patch"
```

#### Remove Documentation from CONTRIBUTING.md
```bash
# Edit CONTRIBUTING.md
# Remove the entire "## 🤖 Dependency Management Policy" section
# Find it after "### Local CI Parity (Pre-push)" section
```

**Verification**:
```bash
# Verify Dependabot YAML is still valid
python -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"

# Verify markdown syntax
npx markdown-cli CONTRIBUTING.md || true
```

### Option 3: Configuration Rollback Only
**Use when**: Documentation is useful but configuration changes cause issues.

```bash
# Restore only the Dependabot configuration
git checkout HEAD~1 -- .github/dependabot.yml

# Keep the documentation changes
```

---

## Impact Analysis

### If Rolled Back
1. **Dependabot Behavior**:
   - Security updates will no longer be grouped
   - Each security vulnerability will create individual PRs
   - More PR noise but same security coverage

2. **Documentation**:
   - Loss of dependency management guidelines
   - Contributors must rely on external knowledge

3. **CI/CD**:
   - No impact on CI/CD pipelines
   - Existing Dependabot PRs will continue to work

### If Kept
1. **Benefits**:
   - Faster security remediation (grouped PRs)
   - Better developer experience (less PR noise)
   - Clear documentation for contributors

2. **Risks**:
   - Grouped security PRs may be larger (more dependencies to review)
   - Documentation requires maintenance as practices evolve

---

## Troubleshooting

### Issue: Dependabot not creating security-updates PRs

**Symptoms**: Security updates still create individual PRs instead of grouped ones.

**Diagnosis**:
```bash
# Check Dependabot logs
# Go to: https://github.com/Jackela/AI-Recruitment-Clerk/dependabot
```

**Solution**:
1. Verify YAML syntax:
   ```bash
   python -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"
   ```

2. Check that security-updates group is defined:
   ```bash
   grep -B 2 -A 5 "security-updates" .github/dependabot.yml
   ```

3. Wait for next scheduled run (weekly on Mondays)

### Issue: Documentation is confusing

**Symptoms**: Contributors report confusion about dependency update policy.

**Solution**: Update CONTRIBUTING.md with clarifications based on feedback.

### Issue: Too many PRs even with grouping

**Symptoms**: Dependabot creates too many PRs despite groups.

**Solution**: Adjust `open-pull-requests-limit` in `.github/dependabot.yml`:
```yaml
open-pull-requests-limit: 5  # Reduce from current value
```

---

## Verification Steps

### Pre-Rollback Verification
```bash
# 1. Confirm current state
git log --oneline -1
git diff --stat

# 2. Verify Dependabot config is valid
python -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"

# 3. Check for any open Dependabot PRs
gh pr list --author "app/dependabot"
```

### Post-Rollback Verification
```bash
# 1. Verify changes are reverted
git diff HEAD --stat

# 2. Validate YAML syntax
python -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"

# 3. Verify documentation removed (if applicable)
! grep -q "Dependency Management Policy" CONTRIBUTING.md

# 4. Test with act (optional)
act -j quality-check -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest
```

---

## Alternative Solutions

### If Dependabot causes issues, consider Renovate

**When to use**: Dependabot grouping doesn't meet requirements.

**Steps**:
1. Remove or disable Dependabot:
   ```bash
   # Delete .github/dependabot.yml
   rm .github/dependabot.yml
   ```

2. Add Renovate configuration (`renovate.json`):
   ```json
   {
     "$schema": "https://docs.renovatebot.com/renovate-schema.json",
     "extends": [
       "config:base"
     ],
     "groups": {
       "security": {
         "matchUpdateTypes": ["security"]
       }
     }
   }
   ```

3. Enable Renovate app on GitHub

---

## Related Documentation

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CONTRIBUTING.md - Dependency Management Policy](../CONTRIBUTING.md#-dependency-management-policy)
- [US-012 PRD](../scripts/ralph/prd.json#L158)
- [SECURITY.md - Dependency Remediation](../SECURITY.md)

---

## Approval & Sign-off

**Implemented by**: Ralph Agent
**Date**: 2026-02-03
**Status**: Ready for review
**Requires testing**: No (configuration-only changes)

**Rollback Decision**:
- [ ] Keep implementation
- [ ] Rollback using Option 1
- [ ] Rollback using Option 2
- [ ] Rollback using Option 3
- [ ] Implement alternative solution (Renovate)

---

## Notes

- **Pre-existing issue**: Project has broken npm installation (nx package not installed). This is unrelated to US-012 changes.
- **YAML validation**: Passed using Python yaml.safe_load()
- **Changes are minimal**: Only configuration (YAML) and documentation (Markdown)
- **No code changes**: No TypeScript, JavaScript, or test files modified
- **No runtime impact**: Changes only affect dependency update PR creation, not application behavior
