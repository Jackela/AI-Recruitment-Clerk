#!/bin/bash
# AI Recruitment Clerk - Railway Setup Script
# Automates Railway deployment configuration

set -euo pipefail

echo "🚄 AI Recruitment Clerk - Railway Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
check_railway_cli() {
    echo -e "${BLUE}Checking Railway CLI...${NC}"
    if command -v railway >/dev/null 2>&1; then
        RAILWAY_VERSION=$(railway --version)
        echo "✅ Railway CLI found: $RAILWAY_VERSION"
    else
        echo -e "${RED}❌ Railway CLI not found${NC}"
        echo "Install Railway CLI: npm install -g @railway/cli"
        exit 1
    fi
}

# Setup Railway project
setup_railway_project() {
    echo -e "${BLUE}Setting up Railway project...${NC}"
    
    # Login to Railway (if not already logged in)
    if ! railway auth >/dev/null 2>&1; then
        echo "🔐 Please login to Railway..."
        railway login
    fi
    
    # Initialize project if not exists
    if [ ! -f "railway.json" ]; then
        echo "📁 Initializing Railway project..."
        railway init
    else
        echo "✅ Railway project already configured"
    fi
}

# Deploy environment variables
setup_environment_variables() {
    echo -e "${BLUE}Setting up environment variables...${NC}"
    
    # Required environment variables
    REQUIRED_VARS=(
        "NODE_ENV=production"
        "JWT_SECRET=$(openssl rand -hex 32)"
        "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
        "ENCRYPTION_KEY=$(openssl rand -hex 32)"
        "NATS_AUTH_TOKEN=$(openssl rand -hex 16)"
        "SESSION_SECRET=$(openssl rand -hex 32)"
        "CSRF_SECRET=$(openssl rand -hex 32)"
    )
    
    echo "🔑 Setting up security variables..."
    for var in "${REQUIRED_VARS[@]}"; do
        VAR_NAME=$(echo "$var" | cut -d'=' -f1)
        VAR_VALUE=$(echo "$var" | cut -d'=' -f2)
        
        # Set environment variable in Railway
        railway variables set "$VAR_NAME=$VAR_VALUE"
        echo "✅ Set $VAR_NAME"
    done
    
    # Optional variables with defaults
    OPTIONAL_VARS=(
        "FREE_USAGE_LIMIT=5"
        "FEEDBACK_CODE_EXPIRY_DAYS=30"
        "MIN_REWARD_AMOUNT=1"
        "MAX_REWARD_AMOUNT=8"
        "CACHE_TTL=300"
        "CACHE_MAX_ITEMS=1000"
        "ENABLE_COMPRESSION=true"
        "REDIS_FALLBACK_TO_MEMORY=true"
        "LOG_LEVEL=warn"
        "ENABLE_REQUEST_LOGGING=false"
    )
    
    echo "⚙️  Setting up configuration variables..."
    for var in "${OPTIONAL_VARS[@]}"; do
        VAR_NAME=$(echo "$var" | cut -d'=' -f1)
        VAR_VALUE=$(echo "$var" | cut -d'=' -f2)
        
        railway variables set "$VAR_NAME=$VAR_VALUE"
        echo "✅ Set $VAR_NAME"
    done
}

# Setup database services
setup_databases() {
    echo -e "${BLUE}Setting up database services...${NC}"
    
    # Add MongoDB plugin
    echo "🍃 Adding MongoDB service..."
    railway add mongodb
    
    # Add Redis plugin
    echo "📦 Adding Redis service..."
    railway add redis
    
    echo "✅ Database services configured"
}

# Deploy application
deploy_application() {
    echo -e "${BLUE}Deploying application...${NC}"
    
    # Run deployment validation first
    if [ -f "scripts/validate-deployment.sh" ]; then
        echo "🔍 Running deployment validation..."
        bash scripts/validate-deployment.sh
    fi
    
    # Deploy to Railway
    echo "🚀 Starting deployment..."
    railway up
    
    echo "✅ Deployment started"
}

# Monitor deployment
monitor_deployment() {
    echo -e "${BLUE}Monitoring deployment...${NC}"
    
    # Show deployment logs
    echo "📊 Deployment logs:"
    railway logs --tail 20
    
    # Get deployment URL
    DEPLOY_URL=$(railway status --json | jq -r '.deployments[0].url' 2>/dev/null || echo "")
    
    if [ ! -z "$DEPLOY_URL" ]; then
        echo -e "${GREEN}🌐 Deployment URL: $DEPLOY_URL${NC}"
        echo -e "${GREEN}🏥 Health Check: $DEPLOY_URL/api/health${NC}"
    fi
}

# Main setup process
main() {
    echo -e "${GREEN}Starting Railway setup...${NC}"
    echo
    
    check_railway_cli
    setup_railway_project
    setup_environment_variables
    setup_databases
    
    # Ask user if they want to deploy now
    echo
    read -p "Do you want to deploy now? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_application
        monitor_deployment
    else
        echo -e "${YELLOW}⏸️  Deployment skipped. Run 'railway up' when ready.${NC}"
    fi
    
    echo
    echo -e "${GREEN}✅ Railway setup completed!${NC}"
    echo
    echo "📋 Next steps:"
    echo "1. Configure external API keys (GEMINI_API_KEY) in Railway dashboard"
    echo "2. Set up custom domain (optional)"
    echo "3. Configure monitoring and alerts"
    echo "4. Test the deployment: railway open"
}

# Run main setup
main "$@"