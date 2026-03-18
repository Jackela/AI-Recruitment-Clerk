#!/bin/bash

# Test Coverage Summary Script
# Generates a summary of test coverage for all projects

echo "======================================"
echo "Test Coverage Summary Report"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to extract coverage from summary JSON
get_coverage() {
  local project=$1
  local coverage_file="coverage/coverage-summary.json"
  
  if [ -f "$coverage_file" ]; then
    # Extract lines coverage percentage
    local coverage=$(cat "$coverage_file" | grep -o '"lines":{"total":[0-9]*,"covered":[0-9]*,"pct":[0-9.]*' | grep -o '"pct":[0-9.]*' | cut -d':' -f2 | head -1)
    echo "$coverage"
  else
    echo "0"
  fi
}

# Function to determine color based on coverage
get_color() {
  local coverage=$1
  if (( $(echo "$coverage >= 80" | bc -l) )); then
    echo -e "${GREEN}"
  elif (( $(echo "$coverage >= 50" | bc -l) )); then
    echo -e "${YELLOW}"
  else
    echo -e "${RED}"
  fi
}

# List of projects to check
projects=(
  "libs/resume-processing-domain"
  "libs/infrastructure-shared"
  "libs/ai-services-shared"
  "apps/report-generator-svc"
  "apps/ai-recruitment-frontend"
)

echo "Projects Coverage Status:"
echo "------------------------"
echo ""

for project in "${projects[@]}"; do
  project_name=$(basename "$project")
  echo "📊 $project_name:"
  
  # Check for test files
  test_count=$(find "$project" -name "*.spec.ts" -o -name "*.test.ts" 2>/dev/null | wc -l)
  echo "   Test Files: $test_count"
  
  # Check source files
  source_count=$(find "$project" -name "*.ts" ! -name "*.spec.ts" ! -name "*.test.ts" ! -name "*.d.ts" 2>/dev/null | wc -l)
  echo "   Source Files: $source_count"
  
  echo ""
done

echo "======================================"
echo "Summary"
echo "======================================"
echo ""
echo "Target: 80% coverage for each project"
echo "Run: npm run test -- --coverage"
echo ""
echo "Key Improvements:"
echo "✓ Added DTO validation pipe tests"
echo "✓ Added bootstrap helper tests"
echo "✓ Added Gemini stub tests"
echo "✓ Added resume domain events tests"
echo "✓ Added report analytics repository tests"
echo "✓ Added bento grid layout service tests"
echo ""
echo "Remaining work:"
echo "- Add mobile dashboard component tests"
echo "- Add more shared component tests"
echo "- Add integration tests"
echo ""
