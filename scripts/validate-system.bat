@echo off
echo =======================================
echo AI Recruitment Clerk - System Validation
echo =======================================

echo.
echo Step 1: Checking Docker services status...
docker-compose ps

echo.
echo Step 2: Checking service health endpoints...
echo.
echo Checking Frontend (expecting HTTP 200)...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:4200

echo.
echo Checking API Gateway Health (expecting HTTP 200)...
curl -s -w "HTTP Status: %%{http_code}\n" http://localhost:3000/api/health

echo.
echo Checking API Gateway Main (expecting HTTP 200)...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:3000/api

echo.
echo Step 3: Checking infrastructure services...
echo.
echo Checking MongoDB connection...
docker exec ai-recruitment-mongodb mongosh --eval "db.adminCommand('ping')" --quiet

echo.
echo Checking NATS connection...
curl -s -o nul -w "NATS Monitor HTTP Status: %%{http_code}\n" http://localhost:8222/healthz

echo.
echo Step 4: Checking microservices (process health)...
echo.
echo JD Extractor Service:
docker exec ai-recruitment-jd-extractor pgrep node >nul && echo "✅ Running" || echo "❌ Not Running"

echo.
echo Resume Parser Service:
docker exec ai-recruitment-resume-parser pgrep node >nul && echo "✅ Running" || echo "❌ Not Running"

echo.
echo Scoring Engine Service:
docker exec ai-recruitment-scoring-engine pgrep node >nul && echo "✅ Running" || echo "❌ Not Running"

echo.
echo Report Generator Service:
docker exec ai-recruitment-report-generator pgrep node >nul && echo "✅ Running" || echo "❌ Not Running"

echo.
echo Step 5: Checking Docker resource usage...
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo.
echo Step 6: Checking logs for errors...
echo Recent error logs (if any):
docker-compose logs --tail=10 | findstr -i "error\|exception\|failed"

echo.
echo =======================================
echo System Validation Complete
echo =======================================
echo.
echo If all services show ✅ and HTTP 200 responses,
echo the system is ready for E2E testing!
echo.
echo Next step: Run scripts\run-e2e-tests.bat
echo.
pause