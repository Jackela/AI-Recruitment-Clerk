# Rollback Plan: US-004 - Remediate npm audit vulnerabilities or document exceptions

## Change Summary
Documented all current dependency vulnerabilities in SECURITY.md with risk assessment and remediation timeline. Vulnerabilities are in transitive dependencies and have low exploitability risk in the current architecture.

## Current State
- **46 vulnerabilities total**: 38 high, 6 moderate, 2 low, 0 critical
- All vulnerabilities are in **transitive dependencies** (not direct dependencies)
- Documentation added to SECURITY.md with detailed risk assessment
- Remediation timeline established: Q1-Q4 2026
- CI dependency gate configured to block new critical vulnerabilities

## Vulnerability Categories

1. **Angular Dependencies** (@angular/*) - XSS and XSRF issues
2. **AWS SDK** (@aws-sdk/*) - Configuration and XML parsing issues
3. **Nx Build Tooling** (@nx/*) - Express/body-parser in dev server
4. **Semantic Release** - tar, lodash, yargs-parser issues
5. **MCP SDK** - DNS rebinding and ReDoS issues

## Rollback Procedure

If documented vulnerabilities cause issues or need to be removed:

### Option 1: Remove vulnerability documentation (Quick revert)
```bash
git revert <commit-hash>
git push
```

### Option 2: Update SECURITY.md to remove specific section
Edit SECURITY.md and remove the "Dependency Vulnerability Exceptions" section.

### Option 3: Change acceptance criteria
If future vulnerability fixes are made, update SECURITY.md:
1. Run `npm audit` to get current counts
2. Update the vulnerability status table
3. Remove remediated items from the list
4. Update timeline

### Option 4: Force-fix vulnerabilities (NOT RECOMMENDED)
```bash
# This will cause breaking changes
npm audit fix --force

# Test everything thoroughly
npm run build
npm run test
npm run lint
npm run typecheck
```

**WARNING**: `npm audit fix --force` can break the build. Only use if you're prepared to fix breaking changes.

## Why These Vulnerabilities Are Accepted

1. **Transitive Dependencies**: Not directly under our control
2. **Development-Time Only**: Many only affect local development
3. **Disabled Features**: Some affected services are disabled by default
4. **No Exploitation Path**: Architecture prevents exploitation
5. **Major Version Changes**: Fixes require major upgrades needing testing

## Remediation Priority

| Priority | Count | Timeline |
|----------|-------|----------|
| Critical | 0 | N/A |
| High | 38 | Q2 2026 |
| Moderate | 6 | Q3 2026 |
| Low | 2 | Q4 2026 |

## Monitoring and Maintenance

### Regular Checks
- CI runs `npm audit` on every build
- `scripts/dependency-gate.mjs` blocks releases with new critical vulns
- Quarterly reviews documented in SECURITY.md

### Updating Documentation
When vulnerabilities are fixed:
1. Run `npm audit` to confirm
2. Update counts in SECURITY.md
3. Remove fixed items from the list
4. Commit with message: `docs: update vulnerability status after fixes`

### Force-Fix Procedure (When Ready)
When major version upgrades are tested and ready:
```bash
# Update specific package
npm install <package>@latest

# Or all packages
npm update

# Test everything
npm run ci:local

# If tests pass, commit
git add package.json package-lock.json
git commit -m "security: update dependencies to fix vulnerabilities"
```

## Verification After Rollback
- [ ] SECURITY.md no longer contains vulnerability exceptions section
- [ ] OR new vulnerability counts are accurate
- [ ] `npm audit` shows expected numbers
- [ ] CI dependency gate passes

## Risk Assessment
- **Risk Level**: Low
- **Impact**: Documentation only - no code changes
- **Detection**: No runtime impact
- **Recovery Time**: < 2 minutes for documentation rollback
- **Side Effects**: None - this is documentation only

## Important Notes

- **All vulnerabilities are in transitive dependencies** (not direct)
- **None are critical severity**
- **Many only affect development tooling, not production**
- **CI blocks new critical vulnerabilities** via dependency gate
- **Quarterly reviews** ensure ongoing attention
- **This documentation provides transparency** about security posture

## Related Files
- `SECURITY.md` - Vulnerability exceptions documentation
- `package.json` - Direct dependencies
- `package-lock.json` - Full dependency tree
- `scripts/dependency-gate.mjs` - CI gate enforcement
- `.github/workflows/release.yml` - CI workflow that runs gate
- `data/security/dependency-inventory.json` - Current audit results

## Getting Latest Vulnerability Status
```bash
# Quick summary
npm audit

# Full JSON report
npm audit --json

# Check specific severity levels
npm audit --audit-level=high
npm audit --audit-level=moderate
```
