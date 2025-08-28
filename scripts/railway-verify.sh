#!/bin/bash

# Railway Deployment Verification Script
# Comprehensive deployment health check

set -euo pipefail

echo "🔍 Railway Deployment Verification..."

# Function to check URL with timeout
check_url() {
    local url=$1
    local expected_status=${2:-200}
    local timeout=${3:-30}
    
    echo "Checking $url (expecting $expected_status)"
    
    if command -v curl >/dev/null 2>&1; then
        status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $timeout "$url" || echo "000")
        if [ "$status" = "$expected_status" ]; then
            echo "✅ $url - Status: $status"
            return 0
        else
            echo "❌ $url - Status: $status (expected $expected_status)"
            return 1
        fi
    else
        echo "⚠️ curl not available, skipping URL check"
        return 0
    fi
}

# Configuration check
echo "📋 Configuration Verification:"
echo "- RAILWAY_STATIC_URL: ${RAILWAY_STATIC_URL:-undefined}"
echo "- NODE_ENV: ${NODE_ENV:-undefined}"
echo "- PORT: ${PORT:-undefined}"

# Health check
if [ -n "${RAILWAY_STATIC_URL:-}" ]; then
    echo "🏥 Health Check:"
    check_url "${RAILWAY_STATIC_URL}/api/health" 200 30
    
    echo "📊 System Status:"
    check_url "${RAILWAY_STATIC_URL}/api/system/status" 200 30
else
    echo "⚠️ RAILWAY_STATIC_URL not set, skipping URL checks"
fi

# Memory check
echo "💾 Memory Usage:"
if command -v free >/dev/null 2>&1; then
    free -h
elif command -v vm_stat >/dev/null 2>&1; then
    vm_stat
else
    echo "Memory info not available"
fi

# Disk space check
echo "💿 Disk Usage:"
df -h / 2>/dev/null || echo "Disk info not available"

echo "✅ Verification completed!"