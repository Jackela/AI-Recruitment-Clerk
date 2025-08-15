---
description: Manual cleanup command for development environment
allowed-tools: 
  - Bash(npx kill-port:*)
  - Bash(ps:*)
  - Bash(pkill:*)
  - Bash(lsof:*)
  - Bash(netstat:*)
---

# Development Environment Cleanup

## Full Cleanup
Run comprehensive cleanup (preserves node processes):
!`$CLAUDE_PROJECT_DIR/.claude/hooks/cleanup.sh`

## Port Status Check
Check which ports are currently in use:
!`netstat -an | grep LISTEN | grep -E "(3000|3001|4200|5173|9229|27017|6379)" || echo "No development ports in use"`

## Process Status Check
Check for test-related processes:
!`ps aux | grep -E "(jest|playwright|vitest)" | grep -v grep || echo "No test processes running"`