#\!/bin/bash
# Test Cleanup Script - Implements PROCESS_CLEANUP_RULES.md
# Kills orphaned processes and frees ports before/after test runs

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🧹 AI Recruitment Clerk - Test Cleanup"
echo "======================================"

# Load ports from .claude/ports.txt if it exists
if [ -f .claude/ports.txt ]; then
  PORTS=$(cat .claude/ports.txt  < /dev/null |  tr '\n' ' ')
  echo "📋 Ports from .claude/ports.txt: $PORTS"
else
  # Default ports for this project
  PORTS="3000 3001 4222 5173 8000 8080 9229 9230 27017 27018"
  echo "📋 Using default ports: $PORTS"
fi

# Function: Kill processes on specified ports
kill_ports() {
  for port in $PORTS; do
    if command -v lsof >/dev/null 2>&1; then
      # Unix/Linux/Mac
      lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true
    elif command -v netstat >/dev/null 2>&1; then
      # Windows Git Bash
      netstat -ano | grep ":$port " | awk '{print $5}' | xargs -r taskkill //PID //F 2>/dev/null || true
    fi
  done
  echo "✅ Freed ports: $PORTS"
}

# Function: Kill Node.js processes in project directory
kill_project_node_processes() {
  if command -v pkill >/dev/null 2>&1; then
    # Unix/Linux/Mac
    pkill -f "node.*$(pwd)" 2>/dev/null || true
    echo "✅ Killed Node.js processes in project directory"
  elif command -v powershell.exe >/dev/null 2>&1; then
    # Windows Git Bash with PowerShell
    powershell.exe -NoProfile -Command "
      Get-CimInstance Win32_Process | Where-Object {
        \MAYBE_FIRST_START.Name -eq 'node.exe' -and \MAYBE_FIRST_START.CommandLine -match [regex]::Escape('$(pwd)')
      } | ForEach-Object { Stop-Process -Id \MAYBE_FIRST_START.ProcessId -Force -ErrorAction SilentlyContinue }
    " 2>/dev/null || true
    echo "✅ Killed Node.js processes in project directory (Windows)"
  fi
}

# Function: Clean Jest cache
clean_jest_cache() {
  if [ -d node_modules/.cache/jest ]; then
    rm -rf node_modules/.cache/jest
    echo "✅ Cleared Jest cache"
  fi
}

# Function: Kill orphaned MongoDB Memory Server instances
kill_mongodb_memory_server() {
  if command -v pkill >/dev/null 2>&1; then
    pkill -f "mongod.*--port.*2701" 2>/dev/null || true
    echo "✅ Killed MongoDB Memory Server instances"
  fi
}

# Main cleanup workflow
main() {
  echo ""
  echo "🔍 Step 1: Killing processes on ports..."
  kill_ports
  
  echo ""
  echo "🔍 Step 2: Killing project Node.js processes..."
  kill_project_node_processes
  
  echo ""
  echo "🔍 Step 3: Cleaning Jest cache..."
  clean_jest_cache
  
  echo ""
  echo "🔍 Step 4: Killing MongoDB Memory Server..."
  kill_mongodb_memory_server
  
  echo ""
  echo "✅ Cleanup complete\!"
}

main "$@"
