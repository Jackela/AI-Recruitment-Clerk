#\!/usr/bin/env bash
# Pre-run cleanup script - Frees ports and kills stale processes
# Run before every test/build session

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1) Free common ports
if [ -f "$PROJECT_ROOT/.claude/ports.txt" ]; then
  ports=$(cat "$PROJECT_ROOT/.claude/ports.txt"  < /dev/null |  tr '\n' ' ')
else
  ports="3000 3001 4222 5173 8000 8080 9229 9230 27017 27018"
fi

npx --yes kill-port $ports 2>/dev/null || true

# 2) Kill Node within current repo path (Linux/macOS)
if command -v pkill >/dev/null 2>&1; then
  pkill -f "node .*$PROJECT_ROOT" 2>/dev/null || true
fi

# 3) Windows Git Bash: use PowerShell to match current path
if command -v powershell.exe >/dev/null 2>&1; then
  powershell.exe -NoProfile -Command "
    Get-CimInstance Win32_Process | Where-Object {
      \MAYBE_FIRST_START.Name -eq 'node.exe' -and \MAYBE_FIRST_START.CommandLine -match [regex]::Escape('$PROJECT_ROOT')
    } | ForEach-Object { Stop-Process -Id \MAYBE_FIRST_START.ProcessId -Force -ErrorAction SilentlyContinue }
  " 2>/dev/null || true
fi

echo "✅ Stale processes cleaned"
