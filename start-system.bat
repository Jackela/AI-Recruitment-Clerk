@echo off
echo ====================================
echo AI Recruitment Clerk - System Startup
echo ====================================

echo.
echo Step 1: Checking Docker installation...
docker --version
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Step 2: Checking Docker daemon...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo WARNING: Docker daemon is not running
    echo Please start Docker Desktop and wait for it to be ready
    echo Then press any key to continue...
    pause
    echo Checking Docker daemon again...
    docker info >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo ERROR: Docker daemon is still not accessible
        pause
        exit /b 1
    )
)

echo.
echo Step 3: Setting up environment variables...
if not exist .env (
    echo Creating .env from template...
    copy docker-compose.env .env
    echo.
    echo IMPORTANT: Please edit .env file and set your GEMINI_API_KEY
    echo Press any key to continue after setting the API key...
    pause
)

echo.
echo Step 4: Building Docker images...
echo This may take several minutes on first run...
docker-compose build --no-cache

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to build Docker images
    pause
    exit /b 1
)

echo.
echo Step 5: Starting all services...
docker-compose up -d

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)

echo.
echo Step 6: Waiting for services to be ready...
timeout /t 30 /nobreak >nul

echo.
echo Step 7: Checking service health...
docker-compose ps

echo.
echo ====================================
echo System started successfully!
echo ====================================
echo.
echo Frontend: http://localhost:4200
echo API Gateway: http://localhost:3000/api
echo MongoDB: mongodb://localhost:27017
echo NATS: nats://localhost:4222
echo.
echo To view logs: docker-compose logs -f
echo To stop system: docker-compose down
echo.
pause