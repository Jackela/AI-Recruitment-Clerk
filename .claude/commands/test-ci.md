---
description: Run tests with comprehensive cleanup (preserves node processes)
allowed-tools: 
  - Bash(npm test:*)
  - Bash(npm run test*)
  - Bash(node *)
  - Bash(npx kill-port:*)
  - Bash(ps:*)
  - Bash(pkill:*)
  - Bash(lsof:*)
  - Bash(netstat:*)
  - Bash(chmod:*)
---

# AI Recruitment Clerk Test Runner

## Preflight Cleanup
Clean up ports and test processes before running tests:
!`$CLAUDE_PROJECT_DIR/.claude/hooks/cleanup.sh`

## Main Test Execution
Run comprehensive test suite in CI mode:
!`npm run test:ci:clean`

## Alternative Test Commands
- Unit tests only: `npm run test:unit`
- Integration tests: `npm run test:integration:all`
- E2E tests: `npm run test:e2e`
- With debug info: `npm run test:debug`

## Postflight Cleanup
Ensure clean environment after tests:
!`$CLAUDE_PROJECT_DIR/.claude/hooks/cleanup.sh`

## Health Check
Verify no hanging test processes:
!`ps aux | grep -E "(jest|playwright|vitest)" | grep -v grep || echo "No test processes found"`