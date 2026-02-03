@echo off
echo ====================================
echo AI Recruitment Clerk - E2E Testing
echo ====================================

echo.
echo Step 1: Checking if system is running...
docker-compose ps | findstr "Up"
if %ERRORLEVEL% neq 0 (
    echo ERROR: System is not running. Please start with scripts\start-system.bat first
    pause
    exit /b 1
)

echo.
echo Step 2: Waiting for services to be fully ready...
echo Checking frontend availability...
timeout /t 5 /nobreak >nul
curl -s http://localhost:4200 >nul
if %ERRORLEVEL% neq 0 (
    echo WARNING: Frontend not ready, waiting longer...
    timeout /t 30 /nobreak >nul
)

echo Checking API Gateway availability...
curl -s http://localhost:3000/api/health >nul
if %ERRORLEVEL% neq 0 (
    echo WARNING: API Gateway not ready, waiting longer...
    timeout /t 30 /nobreak >nul
)

echo.
echo Step 3: Running E2E test suite...
echo This will run the complete Playwright test suite...

REM Set the base URL to point to our containerized frontend
set PLAYWRIGHT_BASE_URL=http://localhost:4200

echo Running E2E tests against containerized system...
npx nx run ai-recruitment-frontend-e2e:e2e --verbose

if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================
    echo ALL E2E TESTS PASSED! ✅
    echo ====================================
    echo System is ready for UAT!
) else (
    echo.
    echo ====================================
    echo SOME E2E TESTS FAILED ❌
    echo ====================================
    echo Check the output above for details
    echo System logs can be viewed with: docker-compose logs
)

echo.
echo Test Results Summary:
echo - Check test-results/ directory for detailed reports
echo - Check playwright-report/ directory for HTML report
echo.
pause