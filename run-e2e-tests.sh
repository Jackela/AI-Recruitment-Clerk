#!/bin/bash

echo "===================================="
echo "AI Recruitment Clerk - E2E Testing"
echo "===================================="

echo ""
echo "Step 1: Checking if system is running..."
if ! docker-compose ps | grep -q "Up"; then
    echo "ERROR: System is not running. Please start with ./start-system.sh first"
    exit 1
fi

echo ""
echo "Step 2: Waiting for services to be fully ready..."
echo "Checking frontend availability..."
sleep 5
if ! curl -s http://localhost:4200 > /dev/null; then
    echo "WARNING: Frontend not ready, waiting longer..."
    sleep 30
fi

echo "Checking API Gateway availability..."
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo "WARNING: API Gateway not ready, waiting longer..."
    sleep 30
fi

echo ""
echo "Step 3: Running E2E test suite..."
echo "This will run the complete Playwright test suite..."

# Set the base URL to point to our containerized frontend
export PLAYWRIGHT_BASE_URL=http://localhost:4200

echo "Running E2E tests against containerized system..."
npx nx run ai-recruitment-frontend-e2e:e2e --verbose

if [ $? -eq 0 ]; then
    echo ""
    echo "===================================="
    echo "ALL E2E TESTS PASSED! ✅"
    echo "===================================="
    echo "System is ready for UAT!"
else
    echo ""
    echo "===================================="
    echo "SOME E2E TESTS FAILED ❌"
    echo "===================================="
    echo "Check the output above for details"
    echo "System logs can be viewed with: docker-compose logs"
fi

echo ""
echo "Test Results Summary:"
echo "- Check test-results/ directory for detailed reports"
echo "- Check playwright-report/ directory for HTML report"
echo ""