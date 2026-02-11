# Rollback Plan: US-014 - Tighten lint/format boundaries and module boundaries

## Summary
Added ESLint ignore patterns to `eslint.config.mjs` and enhanced module boundary constraints to prevent unsafe cross-module imports. Deleted redundant `.eslintignore` file.

## Changes Made

### 1. eslint.config.mjs
- **Added ignore patterns**: `**/build`, `**/*.min.js`, `**/e2e`, `**/tmp`, `**/temp`, `**/out`
- **Enhanced module boundaries**: Added tag-based constraints:
  - `type:app` can depend on any library
  - `scope:shared` can only depend on `scope:shared`, `type:utils`
  - `scope:domain` can depend on `scope:shared`, `type:utils`, `scope:domain`, `layer:contracts`
  - `layer:contracts` can only depend on `type:utils`
  - `type:utils` can depend on anything

### 2. .eslintignore
- **Deleted**: All patterns moved to `eslint.config.mjs`

## Rollback Options

### Option 1: Full Revert (Recommended)
```bash
# Revert the commit
git revert <commit-hash>

# OR reset if this is the latest commit
git reset --hard HEAD~1
```

### Option 2: Restore .eslintignore Only
```bash
# Recreate .eslintignore with original content
cat > .eslintignore << 'EOF'
node_modules/
dist/
build/
coverage/
*.min.js
e2e/
.nx/
tmp/
temp/
out/
EOF

# Revert eslint.config.mjs changes
git checkout HEAD~1 -- eslint.config.mjs
```

### Option 3: Disable Module Boundaries
If module boundaries are causing issues, you can temporarily disable them:

```javascript
// In eslint.config.mjs, change:
'@nx/enforce-module-boundaries': [
  'warn',
  { /* ... */ }
],

// To:
'@nx/enforce-module-boundaries': 'off',
```

## Verification After Rollback

```bash
# Verify linting still works
npm run lint

# Verify .eslintignore is restored if using Option 2
test -f .eslintignore && echo ".eslintignore exists" || echo ".eslintignore missing"
```

## Known Issues

### Potential Module Boundary Violations
If you see lint errors after rollback about module boundaries:

1. **Check tags in project.json files**: Ensure libraries have appropriate tags
2. **Adjust constraints**: Modify the `depConstraints` in `eslint.config.mjs` to be more permissive
3. **Add missing tags**: Run `nx g @nx/js:lib --name=example --tags=scope:shared,type:lib`

### Tagging Reference
- `scope:shared` - Shared utility libraries used across the project
- `scope:domain` - Domain-specific business logic libraries
- `type:app` - Applications (apps/)
- `type:lib` - Libraries (libs/)
- `type:utils` - Pure utility functions with minimal dependencies
- `layer:contracts` - API contracts and interfaces (minimal dependencies)

## Verification Before Rollback

After rollback, verify that:
1. `npm run lint` passes without errors
2. `npm run typecheck` passes without errors
3. `npm run build` completes successfully
4. No unexpected lint warnings appear in CI

## Additional Notes

- Module boundaries are set to `warn` level, not `error`, so they won't break builds
- The catch-all rule (`sourceTag: '*'`) ensures untagged projects don't get unexpected errors
- ESLint flat config (eslint.config.mjs) is the modern standard and replaces both .eslintrc and .eslintignore
- All ignore patterns from .eslintignore have been migrated to the `ignores` array in eslint.config.mjs
