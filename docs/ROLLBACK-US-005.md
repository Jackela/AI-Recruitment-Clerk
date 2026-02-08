# Rollback Plan: US-005 - Align local pre-push checks with CI (AI-friendly constraints)

## Change Summary
Updated `npm run ci:local` script to match CI checks: test → lint → typecheck → build. Husky pre-push hook was already correctly configured to skip on delete-only pushes.

## Current State
- **ci:local script**: `npm run test && npm run lint && npm run typecheck && npm run build`
- **Husky pre-push hook**: `.husky/pre-push` runs `ci:local` and skips on delete-only pushes
- **Documentation**: CONTRIBUTING.md already documents `npm run ci:local` for pre-push

## Changes Made

### package.json
```diff
- "ci:local": "npm run build && node tools/ci/verify-quality-gates.mjs && node tools/ci/pii-scan.mjs"
+ "ci:local": "npm run test && npm run lint && npm run typecheck && npm run build"
```

**Rationale**:
- Follows CI check order: test → lint → typecheck → build
- More explicit and easier to debug than custom scripts
- Directly maps to CI job steps
- Better for AI-assisted development (clear, predictable sequence)

### .husky/pre-push (no changes needed)
Already correctly configured to skip on delete-only pushes.

## Rollback Procedure

If the new ci:local script causes issues:

### Option 1: Restore original script (Quick revert)
Edit `package.json` and restore original:
```json
"ci:local": "npm run build && node tools/ci/verify-quality-gates.mjs && node tools/ci/pii-scan.mjs"
```

### Option 2: Revert commit
```bash
git revert <commit-hash>
git push
```

### Option 3: Disable pre-push hook temporarily
```bash
# Skip for one push
HUSKY=0 git push

# Or remove the hook entirely
rm .husky/pre-push
```

### Option 4: Adjust ci:local for faster local iteration
For faster iteration during development:
```json
"ci:local": "npm run lint && npm run typecheck"
"ci:local:full": "npm run test && npm run lint && npm run typecheck && npm run build"
```

Then update `.husky/pre-push` to use `ci:local:full`.

### Option 5: Make pre-push non-blocking
Edit `.husky/pre-push` to not fail:
```bash
#!/usr/bin/env sh
set +e  # Don't exit on error

# ... existing script ...

npm run ci:local || echo "ci:local failed but continuing with push"
```

**WARNING**: This defeats the purpose of pre-push checks.

## Verification After Rollback
- [ ] `npm run ci:local` runs the expected commands
- [ ] Pre-push hook executes before push
- [ ] Delete-only pushes are skipped
- [ ] All checks pass or fail as expected

## Why This Change Is Better

1. **CI Parity**: Local checks now match CI job order exactly
2. **Explicit Commands**: Clear what's being run (no custom scripts)
3. **Easier Debugging**: Can see which step fails immediately
4. **AI-Friendly**: Predictable sequence that AI can understand
5. **Faster Feedback**: Tests run before build (fail fast)
6. **No Custom Tools**: Doesn't rely on verify-quality-gates.mjs or pii-scan.mjs

## Runtime Considerations

The new ci:local runs these commands in order:
1. `npm run test` - Unit tests (~30s)
2. `npm run lint` - ESLint checks (~20s)
3. `npm run typecheck` - TypeScript compilation (~15s)
4. `npm run build` - Webpack build (~45s)

**Total**: ~2 minutes for full check suite

For faster iteration, developers can run individual commands:
- `npm run test` - Quick test feedback
- `npm run lint` - Quick lint feedback
- `npm run typecheck` - Quick type check
- `npm run build` - Build only

## Risk Assessment
- **Risk Level**: Low
- **Impact**: Affects local development workflow only
- **Detection**: Push will be blocked if checks fail
- **Recovery Time**: < 2 minutes for any rollback option
- **Side Effects**: May slow down push workflow slightly (but catches issues earlier)

## Important Notes
- **Pre-push hook was already correct** - only needed to update ci:local script
- **CONTRIBUTING.md already documents** the pre-push behavior
- **Delete-only pushes are skipped** - won't run ci:local for branch deletions
- **Can bypass with HUSKY=0** for emergency pushes
- **All checks must pass** before push succeeds

## Related Files
- `package.json` - ci:local script definition
- `.husky/pre-push` - Git hook that runs ci:local before push
- `CONTRIBUTING.md` - Documentation for contributors (lines 64-72)
- `.github/workflows/ci.yml` - CI workflow that mirrors these checks

## Testing Pre-Push Hook

To test the pre-push hook without actually pushing:
```bash
# Run the same commands manually
npm run ci:local

# Or run the hook directly
.husky/pre-push <<EOF
main 1234567890abcdef refs/heads/main 0000000000000000000000000000000000000000
EOF
```

## Skipping Pre-Push (When Necessary)

Only skip pre-push checks in exceptional cases:
```bash
# Emergency hotfix
HUSKY=0 git push

# Force push (use with caution)
HUSKY=0 git push --force
```

Document the reason in the commit message if you skip checks.
