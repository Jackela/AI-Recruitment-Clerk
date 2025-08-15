---
description: Quick test runner for development
allowed-tools: 
  - Bash(npm test:*)
  - Bash(npm run test*)
  - Bash(node *)
  - Bash(npx kill-port:*)
---

# Quick Test Runner

## Clean & Test
Quick test execution with minimal cleanup:
!`$CLAUDE_PROJECT_DIR/.claude/hooks/cleanup.sh && npm run test:unit`