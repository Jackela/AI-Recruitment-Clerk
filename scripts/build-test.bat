@echo off
echo ====================================
echo AI Recruitment Clerk - Build Test
echo ====================================

echo Step 1: Testing shared-dtos build...
cd libs\shared-dtos
call npm run build
if errorlevel 1 (
    echo ERROR: shared-dtos build failed!
    pause
    exit /b 1
)
cd ..\..

echo Step 2: Testing app-gateway build...
call npx nx build app-gateway
if errorlevel 1 (
    echo ERROR: app-gateway build failed!
    pause
    exit /b 1
)

echo Step 3: Testing frontend build...
call npx nx build ai-recruitment-frontend
if errorlevel 1 (
    echo ERROR: frontend build failed!
    pause
    exit /b 1
)

echo ====================================
echo All builds completed successfully! ✅
echo ====================================
pause