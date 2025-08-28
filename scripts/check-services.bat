@echo off
echo ====================================
echo AI Recruitment Clerk - Service Check
echo ====================================

echo Checking MongoDB...
curl -f http://localhost:27017 || echo MongoDB not running on localhost:27017

echo.
echo Checking NATS...
curl -f http://localhost:8222 || echo NATS monitoring not running on localhost:8222

echo.
echo Checking if any AI recruitment containers are running...
docker ps --filter="name=ai-recruitment"

echo.
echo Checking if ports are in use...
netstat -an | findstr ":3000\|:27017\|:4222"

pause