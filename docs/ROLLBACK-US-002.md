# Rollback Plan: US-002 - Restore API contract validation pipeline

## Change Summary
Verified that the API contract validation pipeline is working correctly. The validation script (`tools/contract-validation/validate-contracts.js`) is deterministic, requires no external services or environment variables, and passes all checks locally and in CI.

## Current State
- `npm run validate:contracts:ci` passes locally
- Contract validation is fully deterministic (file-based checks only)
- CI workflow `.github/workflows/contract-validation.yml` is properly configured
- No environment variables required (validation uses only file system operations)
- Tests in `libs/api-contracts` pass (14 tests)

## Validation Checks Performed
1. **OpenAPI smoke checks** - Verifies OpenAPI spec files exist and contain required strings
2. **TypeScript contract compilation** - Compiles contract types to ensure no syntax errors
3. **Contract-related TODO scan** - Checks for unresolved TODO/FIXME comments related to contracts
4. **Field naming consistency** - Warns if frontend/backend models have diverged fields
5. **Status enum synchronization** - Warns if status enums are out of sync

## Rollback Procedure

If contract validation causes CI failures or blocking issues:

### Option 1: Make validation non-blocking (Quick fix)
1. Edit `.github/workflows/contract-validation.yml`
2. Add `continue-on-error: true` to the failing job
3. Example:
   ```yaml
   jobs:
     validate-contracts:
       continue-on-error: true  # Add this line
       steps:
         # ... existing steps
   ```

### Option 2: Disable specific failing checks
Edit `tools/contract-validation/validate-contracts.js`:
1. Comment out the failing validation function call in `main()`
2. Or make specific checks return `true` (pass) unconditionally
3. Rebuild and redeploy

### Option 3: Skip contract validation temporarily
1. Edit `package.json`:
   ```json
   "validate:contracts:ci": "echo 'Contract validation temporarily disabled'"
   ```
2. Or remove the contract validation step from CI workflow
3. Document the reason and timeline for re-enabling

### Option 4: Revert recent contract changes
```bash
git revert <commit-hash>
git push
```

## Verification After Rollback
- [ ] `npm run validate:contracts:ci` runs (even if it doesn't fail)
- [ ] CI workflow completes without errors
- [ ] Main CI jobs (lint, typecheck, build, test) still pass
- [ ] No regressions in API contract definitions

## Risk Assessment
- **Risk Level**: Very Low
- **Impact**: Validation pipeline only - does not affect runtime
- **Detection**: CI will show failed validation checks
- **Recovery Time**: < 5 minutes for any option
- **Side Effects**: None - validation is purely diagnostic

## Important Notes
- Contract validation is **deterministic** - no external API calls or services
- No environment variables are required
- The script uses only file system operations and TypeScript compiler
- Warnings are informational and don't fail the build
- Only critical TypeScript compilation errors cause failure

## Related Files
- `tools/contract-validation/validate-contracts.js`
- `tools/contract-validation/tsconfig.json`
- `tools/contract-validation/type-safety-validator.ts`
- `.github/workflows/contract-validation.yml`
- `package.json` (validate:contracts and validate:contracts:ci scripts)
- `libs/api-contracts/` (contract definitions and tests)
