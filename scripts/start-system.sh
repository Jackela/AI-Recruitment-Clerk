#!/bin/bash

echo "===================================="
echo "AI Recruitment Clerk - System Startup"
echo "===================================="

echo ""
echo "Step 1: Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    exit 1
fi
docker --version

echo ""
echo "Step 2: Checking Docker daemon..."
if ! docker info &> /dev/null; then
    echo "WARNING: Docker daemon is not running"
    echo "Please start Docker and wait for it to be ready"
    echo "Press Enter to continue..."
    read
    if ! docker info &> /dev/null; then
        echo "ERROR: Docker daemon is still not accessible"
        exit 1
    fi
fi

echo ""
echo "Step 3: Setting up environment variables..."
if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Please edit .env file and set your GEMINI_API_KEY"
    echo "Press Enter to continue after setting the API key..."
    read
fi

echo ""
echo "Step 4: Building Docker images..."
echo "This may take several minutes on first run..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build Docker images"
    exit 1
fi

echo ""
echo "Step 5: Starting all services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start services"
    exit 1
fi

echo ""
echo "Step 6: Waiting for services to be ready..."
sleep 30

echo ""
echo "Step 7: Checking service health..."
docker-compose ps

echo ""
echo "===================================="
echo "System started successfully!"
echo "===================================="
echo ""
echo "Frontend: http://localhost:4200"
echo "API Gateway: http://localhost:3000/api"
echo "MongoDB: mongodb://localhost:27017"
echo "NATS: nats://localhost:4222"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop system: docker-compose down"
echo ""