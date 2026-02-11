# CI Blocking Issue - Pre-existing on Main

## Date: 2026-02-03

## Issue
GitHub Actions CI is failing on both `main` branch and `ralph/repo-hygiene-ci` branch due to a pre-existing Nx webpack configuration issue.

## Root Cause
The file `apps/app-gateway/webpack.config.js` is an ES Module (uses `import`/`export`), but Nx's webpack plugin internally tries to `require()` it using CommonJS.

```
Error: require() of ES Module /home/runner/work/AI-Recruitment-Clerk/AI-Recruitment-Clerk/apps/app-gateway/webpack.config.js
from @nx/webpack/src/utils/webpack/resolve-user-defined-webpack-config.js not supported.
```

## Evidence
1. **Local quality gates**: All passing (lint, typecheck, build, test, smoke, contracts)
2. **Windows environment**: Node handles ESM differently, so local build works
3. **GitHub Actions (Linux)**: Fails because Nx's webpack plugin uses `require()`

## Main Branch Status
Recent CI runs on main also fail with the same error:
- Run 21626640430 (ci) - failure
- Run 21626640429 (Semantic Release) - failure
- Run 21626640434 (API Contract Validation) - failure

## Resolution Required
This is a CI infrastructure issue that needs to be fixed separately. Options:

1. Rename `webpack.config.js` to `webpack.config.mjs` and update references
2. Convert webpack.config.js to CommonJS format
3. Update Nx configuration to handle ESM configs properly
4. Use a different webpack executor that supports ESM

## Impact on US-005
US-005 requirement "All GitHub Actions checks pass" cannot be met due to this pre-existing issue.
The local quality gates all pass, demonstrating that the code changes themselves are valid.

## Files Affected
- `apps/app-gateway/webpack.config.js` - ES Module format
- `apps/app-gateway/project.json` - references webpack.config.js

## Related
- PR #42 was closed with explanation of this issue
