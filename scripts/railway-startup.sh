#!/bin/bash

# Railway Startup Script for AI Recruitment Clerk
# Optimized for production deployment

set -euo pipefail

echo "🚀 Starting AI Recruitment Clerk Railway Deployment..."

# Environment validation
echo "📋 Environment Check:"
echo "- Node.js version: $(node --version)"
echo "- npm version: $(npm --version)"
echo "- NODE_ENV: ${NODE_ENV:-undefined}"
echo "- PORT: ${PORT:-undefined}"

# Memory optimization
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=2048"
echo "- Node options: $NODE_OPTIONS"

# Health check endpoint verification
echo "🔍 Verifying health endpoint availability..."
if [ -f "dist/apps/app-gateway/main.js" ]; then
    echo "✅ Main application found"
else
    echo "❌ Main application not found, checking build..."
    ls -la dist/ || echo "No dist directory found"
    exit 1
fi

# Start application with error handling
echo "🎯 Starting application..."
exec node dist/apps/app-gateway/main.js