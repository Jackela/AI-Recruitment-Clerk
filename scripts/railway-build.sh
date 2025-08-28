#!/bin/bash

# Railway Build Script for AI Recruitment Clerk
# Optimized build process for Railway deployment

set -euo pipefail

echo "🔨 Starting Railway Build Process..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/ node_modules/.cache/

# NPM configuration for Railway
echo "⚙️ Configuring npm for Railway..."
npm config set legacy-peer-deps true
npm config set progress false
npm config set loglevel warn
npm config set cache /tmp/.npm

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --production

# Build application
echo "🏗️ Building application..."
npm run build

# Verify build
echo "✅ Verifying build..."
if [ -f "dist/apps/app-gateway/main.js" ]; then
    echo "✅ Build successful - main.js found"
    ls -la dist/apps/app-gateway/
else
    echo "❌ Build failed - main.js not found"
    ls -la dist/ || echo "No dist directory"
    exit 1
fi

echo "🎉 Build completed successfully!"