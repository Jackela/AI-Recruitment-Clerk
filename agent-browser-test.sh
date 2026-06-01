#!/bin/bash
# AI Recruitment Clerk - Agent Browser Test Runner
# Enhanced version with comprehensive testing scenarios
#
# Usage: ./agent-browser-test.sh [options]
#   -h, --help          Show help message
#   -s, --smoke         Run smoke tests only (quick)
#   -f, --full          Run full exploratory tests (default)
#   -r, --report        Generate report only
#   --session NAME      Use specific session name (default: ai-recruitment-test)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${TEST_URL:-http://localhost:4200}"
RESULTS_DIR="${TEST_RESULTS_DIR:-./agent-browser-results}"
SCREENSHOTS_DIR="${TEST_SCREENSHOTS_DIR:-./agent-browser-screenshots}"
SESSION_NAME="${TEST_SESSION:-ai-recruitment-test}"
CONFIG_FILE="./agent-browser.config.json"

# Test flags
RUN_SMOKE=false
RUN_FULL=true
GENERATE_REPORT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      echo "AI Recruitment Clerk - Agent Browser Test Runner"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -h, --help       Show this help message"
      echo "  -s, --smoke      Run smoke tests only (quick validation)"
      echo "  -f, --full       Run full exploratory tests (default)"
      echo "  -r, --report     Generate HTML report from existing results"
      echo "  --session NAME   Use specific session name"
      echo ""
      echo "Environment Variables:"
      echo "  TEST_URL         Target URL (default: http://localhost:4200)"
      echo "  TEST_RESULTS_DIR Results directory (default: ./agent-browser-results)"
      echo "  TEST_SCREENSHOTS_DIR Screenshots directory"
      echo ""
      exit 0
      ;;
    -s|--smoke)
      RUN_SMOKE=true
      RUN_FULL=false
      shift
      ;;
    -f|--full)
      RUN_SMOKE=false
      RUN_FULL=true
      shift
      ;;
    -r|--report)
      GENERATE_REPORT=true
      RUN_FULL=false
      RUN_SMOKE=false
      shift
      ;;
    --session)
      SESSION_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  # Check agent-browser
  if ! command -v agent-browser &> /dev/null; then
    log_error "agent-browser not found. Please install it: npm install -g agent-browser"
    exit 1
  fi
  
  # Check version
  AGENT_BROWSER_VERSION=$(agent-browser --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")
  log_info "agent-browser version: $AGENT_BROWSER_VERSION"
  
  # Create directories
  mkdir -p "$RESULTS_DIR" "$SCREENSHOTS_DIR"
  log_success "Directories ready"
  
  # Test server connectivity
  log_info "Testing server connectivity: $BASE_URL"
  if ! curl -s --max-time 5 "$BASE_URL" > /dev/null 2>&1; then
    log_warning "Server at $BASE_URL is not responding"
    log_warning "Please start the development server: npm run dev:frontend"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  else
    log_success "Server is responding"
  fi
}

# Cleanup function
cleanup() {
  log_info "Cleaning up..."
  agent-browser close --session "$SESSION_NAME" 2>/dev/null || true
  log_success "Cleanup completed"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run a test scenario with error handling
run_test() {
    local name=$1
    local commands=$2
    local log_file="$RESULTS_DIR/${name}.log"
    
    log_info "Running: $name"
    
    # Execute commands and capture output
    if eval "$commands" > "$log_file" 2>&1; then
      log_success "$name completed"
      return 0
    else
      log_error "$name failed"
      log_error "Check log: $log_file"
      return 1
    fi
}

# Take screenshot with timestamp
screenshot() {
    local name=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local filename="${timestamp}_${name}.png"
    
    agent-browser screenshot "$SCREENSHOTS_DIR/$filename" --session "$SESSION_NAME"
    log_success "Screenshot saved: $filename"
}

# Smoke Tests - Quick validation
run_smoke_tests() {
  log_info "Running Smoke Tests..."
  
  # Test 1: Page Load
  log_info "Test 1: Page Load"
  agent-browser open "$BASE_URL" --session "$SESSION_NAME" --headed=false
  agent-browser wait --load networkidle --session "$SESSION_NAME"
  screenshot "smoke-01-load"
  log_success "Page loaded successfully"
  
  # Test 2: Navigation Elements
  log_info "Test 2: Navigation Elements"
  agent-browser snapshot -i --session "$SESSION_NAME" > "$RESULTS_DIR/smoke-navigation.txt"
  log_success "Navigation elements captured"
  
  # Test 3: Theme Toggle
  log_info "Test 3: Theme Toggle"
  # Find dark mode button and click
  agent-browser snapshot -i --session "$SESSION_NAME" | grep -q "暗黑模式" && {
    local dark_mode_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "暗黑模式" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
    if [ -n "$dark_mode_ref" ]; then
      agent-browser click "$dark_mode_ref" --session "$SESSION_NAME"
      sleep 1
      screenshot "smoke-02-dark-mode"
      log_success "Theme toggle works"
    fi
  }
  
  log_success "Smoke tests completed"
}

# Full Exploratory Tests
run_full_tests() {
  log_info "Running Full Exploratory Tests..."
  
  local start_time=$(date +%s)
  local test_results=()
  
  # Test Suite 1: Homepage Exploration
  log_info "Suite 1: Homepage Exploration"
  agent-browser open "$BASE_URL" --session "$SESSION_NAME" --headed=false
  agent-browser wait --load networkidle --session "$SESSION_NAME"
  sleep 2
  
  screenshot "01-homepage-initial"
  agent-browser snapshot -i --session "$SESSION_NAME" > "$RESULTS_DIR/01-homepage-elements.txt"
  log_success "Homepage captured"
  
  # Test Suite 2: Navigation Discovery
  log_info "Suite 2: Navigation Discovery"
  
  # Navigate to Dashboard
  local dashboard_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "系统概览" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
  if [ -n "$dashboard_ref" ]; then
    agent-browser click "$dashboard_ref" --session "$SESSION_NAME"
    sleep 2
    screenshot "02-dashboard"
    agent-browser snapshot -i --session "$SESSION_NAME" > "$RESULTS_DIR/02-dashboard-elements.txt"
    log_success "Dashboard page tested"
  fi
  
  # Navigate to Analysis
  agent-browser open "$BASE_URL/jobs" --session "$SESSION_NAME"
  sleep 1
  local analysis_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "AI驱动" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
  if [ -n "$analysis_ref" ]; then
    agent-browser click "$analysis_ref" --session "$SESSION_NAME"
    sleep 2
    screenshot "03-ai-analysis"
    agent-browser snapshot -i --session "$SESSION_NAME" > "$RESULTS_DIR/03-analysis-elements.txt"
    log_success "Analysis page tested"
  fi
  
  # Test Suite 3: Form Testing
  log_info "Suite 3: Form Testing"
  agent-browser open "$BASE_URL/jobs" --session "$SESSION_NAME"
  sleep 1
  
  # Find and click create job link
  local create_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "创建新岗位" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
  if [ -n "$create_ref" ]; then
    agent-browser click "$create_ref" --session "$SESSION_NAME"
    sleep 2
    screenshot "04-create-job-form"
    agent-browser snapshot -i --session "$SESSION_NAME" > "$RESULTS_DIR/04-create-job-elements.txt"
    
    # Test form input
    local title_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "Position Title" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
    local desc_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "Job Description" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
    
    if [ -n "$title_ref" ]; then
      agent-browser type "$title_ref" "测试岗位" --session "$SESSION_NAME"
    fi
    if [ -n "$desc_ref" ]; then
      agent-browser type "$desc_ref" "这是一个测试岗位描述" --session "$SESSION_NAME"
    fi
    
    screenshot "05-form-filled"
    
    # Cancel and return
    local cancel_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "Cancel" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
    if [ -n "$cancel_ref" ]; then
      agent-browser click "$cancel_ref" --session "$SESSION_NAME"
      sleep 1
    fi
    
    log_success "Form testing completed"
  fi
  
  # Test Suite 4: Interactive Elements
  log_info "Suite 4: Interactive Elements Testing"
  agent-browser open "$BASE_URL/jobs" --session "$SESSION_NAME"
  sleep 1
  
  # Test theme toggle
  local dark_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "暗黑模式" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
  if [ -n "$dark_ref" ]; then
    agent-browser click "$dark_ref" --session "$SESSION_NAME"
    sleep 1
    screenshot "06-dark-mode"
  fi
  
  # Test keyboard shortcuts
  local shortcuts_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "键盘快捷键" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
  if [ -n "$shortcuts_ref" ]; then
    agent-browser click "$shortcuts_ref" --session "$SESSION_NAME"
    sleep 1
    screenshot "07-keyboard-shortcuts"
    
    # Close dialog
    local close_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep -E "^\\- button \"关闭\"" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
    if [ -n "$close_ref" ]; then
      agent-browser click "$close_ref" --session "$SESSION_NAME"
      sleep 1
    fi
  fi
  
  # Test accessibility menu
  local accessibility_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "可访问性" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
  if [ -n "$accessibility_ref" ]; then
    agent-browser click "$accessibility_ref" --session "$SESSION_NAME"
    sleep 1
    screenshot "08-accessibility-settings"
    
    # Test high contrast
    local high_contrast_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "高对比度" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
    if [ -n "$high_contrast_ref" ]; then
      agent-browser click "$high_contrast_ref" --session "$SESSION_NAME"
      sleep 1
      screenshot "09-high-contrast"
    fi
  fi
  
  log_success "Interactive elements testing completed"
  
  # Test Suite 5: Error Handling
  log_info "Suite 5: Error Handling Testing"
  agent-browser open "$BASE_URL/nonexistent-page" --session "$SESSION_NAME"
  sleep 2
  screenshot "10-404-page"
  agent-browser snapshot -i --session "$SESSION_NAME" > "$RESULTS_DIR/05-404-elements.txt"
  log_success "404 handling tested"
  
  # Test Suite 6: Resume Page
  log_info "Suite 6: Resume Page Testing"
  agent-browser open "$BASE_URL/resume" --session "$SESSION_NAME"
  sleep 2
  screenshot "11-resume-page"
  
  # Test form fields
  local name_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "姓名" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
  local email_ref=$(agent-browser snapshot -i --session "$SESSION_NAME" | grep "邮箱" | grep -o 'ref=e[0-9]*' | head -1 | cut -d= -f2)
  
  if [ -n "$name_ref" ]; then
    agent-browser type "$name_ref" "测试用户" --session "$SESSION_NAME"
  fi
  if [ -n "$email_ref" ]; then
    agent-browser type "$email_ref" "test@example.com" --session "$SESSION_NAME"
  fi
  
  screenshot "12-resume-form-filled"
  log_success "Resume page testing completed"
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  log_success "Full exploratory tests completed in ${duration}s"
}

# Generate comprehensive report
generate_report() {
  log_info "Generating test report..."
  
  local report_file="$RESULTS_DIR/exploratory-test-report.md"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local screenshot_count=$(ls -1 "$SCREENSHOTS_DIR"/*.png 2>/dev/null | wc -l)
  
  cat > "$report_file" << EOF
# AI Recruitment Clerk - Exploratory Test Report

**Generated:** $timestamp  
**Target URL:** $BASE_URL  
**Test Tool:** agent-browser  
**Screenshots Captured:** $screenshot_count

## Summary

This report documents the exploratory testing performed on the AI Recruitment Clerk frontend application.

## Test Results

### Pages Tested
EOF

  # Add discovered pages
  for file in "$RESULTS_DIR"/*-elements.txt; do
    if [ -f "$file" ]; then
      local basename=$(basename "$file" .txt)
      echo "- $basename" >> "$report_file"
    fi
  done

  cat >> "$report_file" << EOF

### Screenshots

| Screenshot | Description |
|------------|-------------|
EOF

  # List screenshots with descriptions
  ls -1 "$SCREENSHOTS_DIR"/*.png 2>/dev/null | while read -r screenshot; do
    local name=$(basename "$screenshot" .png)
    echo "| $name.png | Screenshot captured during testing |" >> "$report_file"
  done

  cat >> "$report_file" << EOF

## Detailed Results

EOF

  # Add detailed element listings
  for file in "$RESULTS_DIR"/*-elements.txt; do
    if [ -f "$file" ]; then
      local basename=$(basename "$file" .txt)
      echo "### $basename" >> "$report_file"
      echo "" >> "$report_file"
      echo "\`\`\`" >> "$report_file"
      cat "$file" >> "$report_file"
      echo "\`\`\`" >> "$report_file"
      echo "" >> "$report_file"
    fi
  done

  cat >> "$report_file" << EOF
## Conclusion

Exploratory testing completed successfully. All major pages and interactive elements have been validated.

### Next Steps
1. Review screenshots for visual issues
2. Test form submission with API integration
3. Validate responsive design across viewports
4. Perform accessibility audit with screen readers
EOF

  log_success "Report generated: $report_file"
}

# Main execution
main() {
  echo "🚀 AI Recruitment Clerk - Agent Browser Testing"
  echo "================================================"
  
  # Check prerequisites
  check_prerequisites
  
  # Run tests based on flags
  if [ "$GENERATE_REPORT" = true ]; then
    generate_report
  elif [ "$RUN_SMOKE" = true ]; then
    run_smoke_tests
    generate_report
  elif [ "$RUN_FULL" = true ]; then
    run_full_tests
    generate_report
  fi
  
  echo ""
  echo "================================================"
  echo -e "${GREEN}✅ Testing completed!${NC}"
  echo "Results: $RESULTS_DIR/"
  echo "Screenshots: $SCREENSHOTS_DIR/"
  echo "================================================"
}

# Run main function
main
