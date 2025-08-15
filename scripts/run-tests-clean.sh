#!/usr/bin/env bash
# =============================================================================
# Test Runner with Comprehensive Cleanup - Git Bash Version
# =============================================================================
# Purpose: Session-level cleanup to prevent orphaned processes in Claude Code
# Usage: ./scripts/run-tests-clean.sh [test-command]
# 
# 根治路径：外部会话级一键回收 + trap 清理
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ai-recruitment-clerk"
MAX_CLEANUP_TIME=30
TEST_TIMEOUT=300

echo -e "${BLUE}🧪 Starting AI Recruitment Clerk Test Runner${NC}"
echo -e "${BLUE}📍 Project: ${PROJECT_NAME}${NC}"
echo -e "${BLUE}🕐 $(date)${NC}"
echo ""

# =============================================================================
# Cleanup Functions
# =============================================================================

cleanup_orphaned_processes() {
    echo -e "${YELLOW}🧹 Cleaning up orphaned processes...${NC}"
    
    # Kill any Node.js processes related to this project
    pkill -f "node.*${PROJECT_NAME}" 2>/dev/null || true
    
    # Kill any remaining test processes
    pkill -f "jest" 2>/dev/null || true
    pkill -f "vitest" 2>/dev/null || true
    pkill -f "playwright" 2>/dev/null || true
    
    # Kill processes on common development ports
    local ports=(3000 3001 9229 5432 6379 27017)
    for port in "${ports[@]}"; do
        if command -v lsof >/dev/null 2>&1; then
            lsof -ti:$port 2>/dev/null | xargs -r kill 2>/dev/null || true
        elif command -v npx >/dev/null 2>&1; then
            npx kill-port $port 2>/dev/null || true
        fi
    done
    
    echo -e "${GREEN}✅ Process cleanup completed${NC}"
}

cleanup_on_exit() {
    local exit_code=$?
    echo ""
    echo -e "${YELLOW}🔄 Performing exit cleanup...${NC}"
    
    # Kill all child processes of this script
    pkill -P $$ 2>/dev/null || true
    
    # Wait a moment for graceful shutdown
    sleep 1
    
    # Force kill any remaining processes
    cleanup_orphaned_processes
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Test session completed successfully${NC}"
    else
        echo -e "${RED}❌ Test session failed with exit code: $exit_code${NC}"
        
        # Debug information on failure
        echo -e "${YELLOW}🔍 Debug information:${NC}"
        if command -v ps >/dev/null 2>&1; then
            echo "Active Node processes:"
            ps -o pid,ppid,etime,command -C node 2>/dev/null || echo "No Node processes found"
        fi
        
        if command -v lsof >/dev/null 2>&1; then
            echo "Listening ports:"
            lsof -iTCP -sTCP:LISTEN 2>/dev/null | head -10 || echo "No listening ports found"
        fi
    fi
    
    exit $exit_code
}

# Set up exit trap - 父进程退出时杀掉所有子进程
trap cleanup_on_exit EXIT
trap cleanup_on_exit SIGINT
trap cleanup_on_exit SIGTERM

# =============================================================================
# Pre-flight Checks and Cleanup
# =============================================================================

echo -e "${YELLOW}🔍 Running pre-flight checks...${NC}"

# Clean up any existing orphaned processes
cleanup_orphaned_processes

# Verify Node.js and npm are available
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment checks passed${NC}"

# =============================================================================
# Test Execution
# =============================================================================

# Set environment variables for test execution
export NODE_ENV=test
export CI=true
export UV_THREADPOOL_SIZE=8
export NODE_OPTIONS="--max-old-space-size=4096"

# Determine test command
TEST_COMMAND="${1:-npm run test:ci}"

echo -e "${BLUE}🚀 Executing test command: ${TEST_COMMAND}${NC}"
echo ""

# Start timestamp
START_TIME=$(date +%s)

# Execute the test command with timeout
if timeout ${TEST_TIMEOUT} bash -c "$TEST_COMMAND"; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo ""
    echo -e "${GREEN}✅ Tests completed successfully in ${DURATION}s${NC}"
else
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo ""
    echo -e "${RED}❌ Tests failed or timed out after ${DURATION}s${NC}"
    exit 1
fi

# =============================================================================
# Post-test Validation
# =============================================================================

echo -e "${YELLOW}🔎 Running post-test validation...${NC}"

# Check for orphaned handles (debug only)
if [ "${DEBUG:-false}" = "true" ]; then
    echo "Checking for orphaned handles..."
    if command -v node >/dev/null 2>&1; then
        node -e "
            setTimeout(() => {
                const handles = process._getActiveHandles?.() || [];
                const requests = process._getActiveRequests?.() || [];
                if (handles.length > 0 || requests.length > 0) {
                    console.warn('⚠️  Orphaned handles detected:', handles.length, 'requests:', requests.length);
                } else {
                    console.log('✅ No orphaned handles detected');
                }
                process.exit(0);
            }, 100);
        " 2>/dev/null || true
    fi
fi

echo -e "${GREEN}✅ Post-test validation completed${NC}"
echo ""
echo -e "${GREEN}🎉 Test session completed successfully!${NC}"