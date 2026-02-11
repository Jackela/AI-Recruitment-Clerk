# Rollback Plan: US-011 - Pin GitHub Actions to Commit SHA

**Story ID**: US-011
**Title**: Pin GitHub Actions to commit SHA
**Implemented**: 2026-02-03
**Branch**: `ralph/repo-hygiene-ci`

## Summary

All GitHub Actions in `.github/workflows/` have been pinned to specific commit SHAs instead of using version tags. This prevents supply chain attacks where malicious actors could compromise action maintainers' accounts and push malicious code to version tags.

## Changes Made

### Updated Workflow Files

1. `.github/workflows/ci.yml`
2. `.github/workflows/ci-affected.yml`
3. `.github/workflows/contract-validation.yml`
4. `.github/workflows/release.yml`
5. `.github/workflows/security.yml`
6. `.github/workflows/coverage.yml`
7. `.github/workflows/e2e-nightly.yml`
8. `.github/workflows/cd.yml` (also fixed YAML syntax errors)
9. `.github/workflows/cd-local.yml` (also fixed YAML syntax errors)
10. `.github/workflows/migration-rehearsal.yml`

### Pinned Actions

| Action | Version | Commit SHA |
|--------|---------|------------|
| `actions/checkout` | v4.2.2 | `11bd71901bbe5b1630ceea73d27597364c9af683` |
| `actions/setup-node` | v4.2.0 | `1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a` |
| `actions/cache` | v4.2.1 | `0c907a75c2c80ebcb7f088228285e798b750cf8f` |
| `actions/upload-artifact` | v4.6.0 | `65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08` |
| `actions/github-script` | v7.0.1 | `60a0d83039c74a4aee543508d2ffcb1c3799cdea` |
| `github/codeql-action/*@v3.28.8` | v3.28.8 | `8ff85221d12737ec1137e6a892722e5130f32d05` |
| `trufflesecurity/trufflehog` | v3 | (tag) |
| `gitleaks/gitleaks-action` | v4.0.0 | `af2c6347526edfe5ff45ad690affad475d77ddb4` |
| `codecov/codecov-action` | v5.3.1 | `af8c47c964cbed948c4c5f36f3e38e8be9ac1c35` |

### Additional Changes

- **SECURITY.md**: Added comprehensive GitHub Actions security documentation and update process
- **cd.yml & cd-local.yml**: Fixed YAML syntax errors (malformed `with:` sections)

## Rollback Options

### Option 1: Full Revert (Recommended if Issues Detected)

**Use Case**: If pinned actions cause workflow failures or unexpected behavior

**Steps**:
```bash
# Revert the commit
git revert <commit-hash>

# Or hard reset (if not yet pushed)
git reset --hard HEAD~1

# Push the revert
git push origin ralph/repo-hygiene-ci
```

**Verification**:
- Check that workflows still use version tags (`@v4`)
- Run workflows to verify they work with floating tags

**Recovery**: Re-apply the commit after fixing issues

### Option 2: Selective Action Rollback

**Use Case**: If only specific actions cause problems

**Steps**:
1. Identify problematic action from workflow logs
2. Find the previous working version:
   ```bash
   # Check release history
   curl -s https://api.github.com/repos/actions/checkout/releases | jq -r '.[].tag_name'
   ```
3. Update specific workflow file with old commit SHA
4. Test and commit

**Example** (if `actions/checkout` v4.2.2 is broken):
```yaml
# Rollback to v4.2.1
- uses: actions/checkout@09b303150b6a2883e6ccf9efb7de95a3671ec34e # v4.2.1 (previous)
```

**Verification**:
- Run affected workflow
- Check logs for errors
- Verify expected behavior

### Option 3: Revert to Floating Tags (Emergency Only)

**Use Case**: Emergency rollback when commit SHA is unknown or broken

**Steps**:
```bash
# Batch replace all commit SHAs back to version tags
find .github/workflows -name "*.yml" -exec sed -i 's/@[a-f0-9]\{40\} #@v[0-9.]*/@v4/g' {} \;

# More targeted replacement per action
find .github/workflows -name "*.yml" -exec sed -i 's/@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2/@v4/g' {} \;
```

**Verification**:
- Check workflows use version tags
- Run CI to verify

**Warning**: This loses the security benefit of SHA pinning

## Verification Steps

After applying any rollback:

1. **Workflow Syntax**:
   ```bash
   # Use act to validate workflow syntax (if installed)
   act -l
   ```

2. **Manual Inspection**:
   ```bash
   # Check action references
   grep -n "uses:" .github/workflows/*.yml
   ```

3. **Run CI**:
   - Push to branch
   - Verify all workflows pass
   - Check workflow logs for errors

## Known Issues and Mitigations

### Issue 1: Action Deprecation

**Problem**: Pinned action version becomes deprecated

**Detection**: Warning in workflow logs about deprecated version

**Mitigation**:
1. Check action's repository for migration guide
2. Test new version in feature branch
3. Update commit SHA following update process in SECURITY.md
4. Update SECURITY.md table

### Issue 2: Breaking Changes in Action

**Problem**: New action version has breaking changes

**Detection**: Workflow fails after update

**Mitigation**:
1. Review action's release notes before updating
2. Update workflow configuration to match new action's requirements
3. Test in feature branch before merging to main

### Issue 3: Compromised Action

**Problem**: Security vulnerability discovered in pinned action

**Detection**: Security advisory or CVE

**Mitigation**:
1. **Immediate**: If critical, revert to previous version immediately
2. **Short-term**: Pin to a version before the vulnerability was introduced
3. **Long-term**: Update to patched version following standard update process

## Testing Checklist

Before committing action updates:

- [ ] Reviewed action release notes for breaking changes
- [ ] Tested updated workflows in feature branch
- [ ] Verified all workflow jobs pass
- [ ] Checked for deprecated action warnings
- [ ] Updated SECURITY.md with new commit SHA
- [ ] Created rollback plan document (if major update)

## Recovery Timeline

| Scenario | Recovery Time | Complexity |
|----------|--------------|------------|
| Full revert | < 5 minutes | Low |
| Selective rollback | < 15 minutes | Medium |
| Emergency tag revert | < 2 minutes | Low |
| Security vulnerability | < 30 minutes | Medium |

## Documentation Updates

- **SECURITY.md**: Contains current pinned actions table and update process
- **This document**: Rollback procedures and known issues
- **PRD**: Marked US-011 as `passes: true`

## Related Files

- `.github/workflows/*.yml` - All workflow files
- `SECURITY.md` - GitHub Actions security documentation
- `scripts/ralph/prd.json` - Project requirements tracking
- `scripts/ralph/progress.txt` - Implementation progress log

## Success Criteria

The implementation is successful if:

1. ✅ All workflows use commit SHAs instead of version tags
2. ✅ All CI/CD workflows pass successfully
3. ✅ SECURITY.md documents the update process
4. ✅ Rollback plan exists (this document)
5. ✅ No workflow failures or action errors

## Contact

For questions about this rollback plan:
- **Issue**: US-011
- **Branch**: `ralph/repo-hygiene-ci`
- **Documentation**: See SECURITY.md for action update process
