# Ralph WSL Setup - Complete ✅

## Setup Date
2026-02-04

## Changes Made

### 1. Fixed Line Endings
**File**: `scripts/ralph/ralph.sh`
- **Before**: CRLF (Windows format)
- **After**: LF (Unix format)
- **Verified**: `file scripts/ralph/ralph.sh` reports "Bourne-Again shell script, ASCII text executable"

### 2. Refactored PRD
**File**: `scripts/ralph/prd.json`

#### Summary of Improvements
- **Total Stories**: 14 (was 13, split US-010 into two stories)
- **Completed**: 4 stories (US-001 to US-004)
- **Pending**: 10 stories (US-005 to US-014)

#### Key Refinements Made

1. **Specificity** - Each story now specifies exact files/services:
   - US-005: Specifies using `depcheck` tool
   - US-006: Targets `resume-parser-svc` and `jd-extractor-svc`
   - US-007: Targets eslint boundary rules for mobile-to-shared
   - US-008: Targets `mobile-dashboard.component.ts` (1208 lines)
   - US-009: Targets `usage-limit.service.ts`
   - US-010: Creates `docs/TESTING_PATTERN.md`
   - US-011: Applies pattern to `parsing.service.spec.ts`
   - US-012: Targets Resume DTOs in `libs/resume-dto`
   - US-013: Targets `scoring-engine-svc` for logging

2. **Verifiable Acceptance Criteria**:
   - Every story has "Typecheck passes" as final criterion
   - Most stories have specific test commands
   - Concrete file paths specified
   - Clear verification steps

3. **Right-sized Stories**:
   - Split US-010 into two focused stories (documentation + application)
   - Each story completable in one Ralph iteration

4. **Leveraged Codebase Knowledge**:
   - Used findings from `progress.txt` (mobile-dashboard size, etc.)
   - Based on actual codebase structure

## Environment Status

### ✅ Verified Working
- Claude CLI: `2.1.31` installed at `/home/k7407/.local/bin/claude`
- Ralph script: `scripts/ralph/ralph.sh` (executable, Unix format)
- Skills directory: `/home/k7407/.claude/skills/ralph` exists
- Current branch: `ralph/repo-hygiene-ci`

### How to Run Ralph

```bash
# Single iteration (for testing)
./scripts/ralph/ralph.sh --tool claude 1

# Full run (up to 10 iterations)
./scripts/ralph/ralph.sh --tool claude 10

# Custom iterations
./scripts/ralph/ralph.sh --tool claude 20
```

## Next Steps

1. **Test single iteration** first to ensure everything works:
   ```bash
   ./scripts/ralph/ralph.sh --tool claude 1
   ```

2. **Monitor progress** in real-time:
   ```bash
   tail -f scripts/ralph/progress.txt
   ```

3. **Check story status** anytime:
   ```bash
   jq '.userStories[] | select(.passes == false) | {id, title}' scripts/ralph/prd.json
   ```

## Stories Overview

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| US-001 | Create tech-debt register | 1 | ✅ Complete |
| US-002 | Eliminate jest open-handle warnings | 2 | ✅ Complete |
| US-003 | Reduce noisy test console errors | 3 | ✅ Complete |
| US-004 | Normalize Jest setup and matchers | 4 | ✅ Complete |
| US-005 | Audit and trim unused dependencies | 5 | ⏳ Pending |
| US-006 | Migrate services to env-validator | 6 | ⏳ Pending |
| US-007 | Remove mobile-to-shared boundary exceptions | 7 | ⏳ Pending |
| US-008 | Split mobile-dashboard.component.ts | 8 | ⏳ Pending |
| US-009 | Refactor usage-limit.service.ts | 9 | ⏳ Pending |
| US-010 | Document integration test pattern | 10 | ⏳ Pending |
| US-011 | Apply test pattern to parsing.service | 11 | ⏳ Pending |
| US-012 | Consolidate Resume DTOs | 12 | ⏳ Pending |
| US-013 | Standardize logging in scoring-engine-svc | 13 | ⏳ Pending |
| US-014 | Finalize full local verification | 14 | ⏳ Pending |

## Notes

- All stories follow Ralph best practices from `/home/k7407/.claude/skills/ralph`
- Stories are ordered by dependency (configuration changes before refactors)
- Each story has verifiable acceptance criteria
- WSL environment is fully configured and ready to run
