#!/bin/bash

echo "======================================="
echo "AI Recruitment Clerk - System Validation"
echo "======================================="

echo ""
echo "Step 1: Checking Docker services status..."
docker-compose ps

echo ""
echo "Step 2: Checking service health endpoints..."
echo ""
echo "Checking Frontend (expecting HTTP 200)..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:4200

echo ""
echo "Checking API Gateway Health (expecting HTTP 200)..."
curl -s -w "HTTP Status: %{http_code}\n" http://localhost:3000/api/health

echo ""
echo "Checking API Gateway Main (expecting HTTP 200)..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/api

echo ""
echo "Step 3: Checking infrastructure services..."
echo ""
echo "Checking MongoDB connection..."
docker exec ai-recruitment-mongodb mongosh --eval "db.adminCommand('ping')" --quiet

echo ""
echo "Checking NATS connection..."
curl -s -o /dev/null -w "NATS Monitor HTTP Status: %{http_code}\n" http://localhost:8222/healthz

echo ""
echo "Step 4: Checking microservices (process health)..."
echo ""
echo -n "JD Extractor Service: "
if docker exec ai-recruitment-jd-extractor pgrep node > /dev/null; then
    echo "✅ Running"
else
    echo "❌ Not Running"
fi

echo -n "Resume Parser Service: "
if docker exec ai-recruitment-resume-parser pgrep node > /dev/null; then
    echo "✅ Running"
else
    echo "❌ Not Running"
fi

echo -n "Scoring Engine Service: "
if docker exec ai-recruitment-scoring-engine pgrep node > /dev/null; then
    echo "✅ Running"
else
    echo "❌ Not Running"
fi

echo -n "Report Generator Service: "
if docker exec ai-recruitment-report-generator pgrep node > /dev/null; then
    echo "✅ Running"
else
    echo "❌ Not Running"
fi

echo ""
echo "Step 5: Checking Docker resource usage..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "Step 6: Checking logs for errors..."
echo "Recent error logs (if any):"
docker-compose logs --tail=10 | grep -i -E "error|exception|failed" || echo "No recent errors found"

echo ""
echo "======================================="
echo "System Validation Complete"
echo "======================================="
echo ""
echo "If all services show ✅ and HTTP 200 responses,"
echo "the system is ready for E2E testing!"
echo ""
echo "Next step: Run ./scripts/run-e2e-tests.sh"
echo ""