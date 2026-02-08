# Rollback Plan: US-001 - Fix Nx project graph failure (ESM webpack config)

## Change Summary
The webpack.config.js for app-gateway uses ESM module syntax (import/export) which is compatible with the project's `"type": "module"` setting in package.json.

## Current State
- `apps/app-gateway/webpack.config.js` uses ESM imports
- Package.json has `"type": "module"`
- All builds pass: lint, typecheck, build

## Rollback Procedure

If the ESM webpack configuration causes issues in CI or production:

### Option 1: Convert to CJS wrapper (Recommended for Nx compatibility)
1. Rename `apps/app-gateway/webpack.config.js` to `apps/app-gateway/webpack.config.cjs`
2. Convert imports to require:
   ```javascript
   // Change from:
   import { NxAppWebpackPlugin } from '@nx/webpack/app-plugin.js';
   import { join } from 'path';
   import { fileURLToPath } from 'url';

   // To:
   const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
   const { join } = require('path');
   ```
3. Remove `__dirname` computation using fileURLToPath (not needed in CJS)
4. Change export to: `module.exports = { ... }`
5. Update `apps/app-gateway/project.json` build command to reference `webpack.config.cjs`

### Option 2: Quick revert (if this commit hasn't been deployed)
```bash
git revert <commit-hash>
git push
```

### Option 3: Manual patch on deployed servers
1. SSH into deployed servers
2. Restore previous webpack.config.js version from backup
3. Rebuild: `npm run build`
4. Restart services

## Verification After Rollback
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Local server starts: `npm start`
- [ ] CI jobs pass

## Risk Assessment
- **Risk Level**: Low
- **Impact**: Build failure only, not runtime
- **Detection**: CI build jobs will fail immediately
- **Recovery Time**: < 5 minutes for Option 2, < 15 minutes for Option 1

## Related Files
- `apps/app-gateway/webpack.config.js`
- `apps/app-gateway/project.json`
- `package.json`
- `.github/workflows/ci.yml`
