#!/bin/bash

echo "===================================="
echo "AI Recruitment Clerk - Build Test"
echo "===================================="

echo "Step 1: Testing shared-dtos build..."
cd libs/shared-dtos || exit 1
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: shared-dtos build failed!"
    exit 1
fi
cd ../..

echo "Step 2: Testing app-gateway build..."
npx nx build app-gateway
if [ $? -ne 0 ]; then
    echo "ERROR: app-gateway build failed!"
    exit 1
fi

echo "Step 3: Testing frontend build..."
npx nx build ai-recruitment-frontend
if [ $? -ne 0 ]; then
    echo "ERROR: frontend build failed!"
    exit 1
fi

echo "===================================="
echo "All builds completed successfully! ✅"
echo "===================================="