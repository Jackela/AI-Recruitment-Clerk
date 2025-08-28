@echo off
echo ====================================
echo AI Recruitment Clerk - Local Debug
echo ====================================

:: Check if .env file exists
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit .env file with your configuration!
    echo.
)

:: Clean up any existing containers
echo Cleaning up existing containers...
docker-compose down --remove-orphans
docker system prune -f --volumes

:: Build and start services
echo Starting services in debug mode...
docker-compose -f docker-compose.yml up --build

pause