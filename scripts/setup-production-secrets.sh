#!/bin/bash

# AI Recruitment Clerk - Production Secrets Setup Script
# This script sets up secure secrets management for production deployment

set -e  # Exit on any error

echo "🔐 AI Recruitment Clerk - Production Secrets Setup"
echo "=================================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory."
    exit 1
fi

# Create secrets directory if it doesn't exist
echo "📁 Creating secrets directory..."
mkdir -p secrets

# Generate secrets
echo "🔑 Generating production secrets..."
node scripts/generate-secrets.js

# Set proper permissions on secrets
echo "🔒 Setting secure permissions on secrets..."
chmod 600 secrets/.env.production
chmod 600 secrets/docker-secrets.json
chmod 600 secrets/k8s-secrets.yaml
chmod 600 secrets/mongo-init.js

# Add secrets to .gitignore if not already present
echo "🚫 Ensuring secrets are excluded from version control..."
if [ ! -f ".gitignore" ]; then
    touch .gitignore
fi

# Add secrets patterns to .gitignore
grep -qxF "secrets/" .gitignore || echo "secrets/" >> .gitignore
grep -qxF ".env.production" .gitignore || echo ".env.production" >> .gitignore
grep -qxF "*.env" .gitignore || echo "*.env" >> .gitignore

echo ""
echo "✅ Production secrets setup completed!"
echo ""
echo "🚨 CRITICAL SECURITY REMINDERS:"
echo "1. Never commit the secrets/ directory to version control"
echo "2. Store secrets in a secure vault for production use"
echo "3. Replace GEMINI_API_KEY with your actual API key"
echo "4. Update CORS_ORIGIN in .env.production to your domain"
echo "5. Implement regular secrets rotation"
echo ""
echo "📋 Next steps:"
echo "1. Review secrets/SECURITY_CHECKLIST.md"
echo "2. Configure your secrets management system"
echo "3. Deploy using the generated configuration files"
echo ""
echo "🔍 Generated files location: ./secrets/"
echo ""