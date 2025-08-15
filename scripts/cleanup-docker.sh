#!/bin/bash

echo "===================================="
echo "AI Recruitment Clerk - Docker Cleanup"
echo "===================================="

echo "Stopping all containers..."
docker-compose down --remove-orphans

echo "Removing all stopped containers..."
docker container prune -f

echo "Removing unused networks..."
docker network prune -f

echo "Removing unused volumes..."
docker volume prune -f

echo "Removing unused images (keep base images)..."
docker image prune -f

echo "Listing remaining AI recruitment resources..."
echo
echo "---- Containers ----"
docker ps -a --filter="name=ai-recruitment"

echo "---- Images ----"
docker images --filter="reference=*ai-recruitment*"

echo "---- Volumes ----"
docker volume ls --filter="name=ai-recruitment"

echo "---- Networks ----"
docker network ls --filter="name=ai-recruitment"

echo
echo "Cleanup completed! 🧹"