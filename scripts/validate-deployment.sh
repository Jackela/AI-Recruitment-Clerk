#!/bin/bash
# AI Recruitment Clerk - Deployment Validation Script
# Validates environment configuration and deployment readiness

set -euo pipefail

echo "🔍 AI Recruitment Clerk - Deployment Validation"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation functions
validate_node_version() {
    echo -e "${BLUE}Checking Node.js version...${NC}"
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        echo "✅ Node.js version: $NODE_VERSION"
        
        # Extract major version number
        MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
        if [ "$MAJOR_VERSION" -ge 20 ]; then
            echo "✅ Node.js version requirement met (>=20.0.0)"
        else
            echo -e "${RED}❌ Node.js version must be >=20.0.0${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
}

validate_npm_version() {
    echo -e "${BLUE}Checking npm version...${NC}"
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        echo "✅ npm version: $NPM_VERSION"
        
        # Extract major version number
        MAJOR_VERSION=$(echo "$NPM_VERSION" | sed 's/\([0-9]*\).*/\1/')
        if [ "$MAJOR_VERSION" -ge 9 ]; then
            echo "✅ npm version requirement met (>=9.0.0)"
        else
            echo -e "${YELLOW}⚠️  npm version should be >=9.0.0 for optimal performance${NC}"
        fi
    else
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi
}

validate_docker_files() {
    echo -e "${BLUE}Validating Docker configurations...${NC}"
    
    # Check main Dockerfiles
    DOCKER_FILES=(
        "apps/app-gateway/Dockerfile"
        "apps/ai-recruitment-frontend/Dockerfile"
        "apps/jd-extractor-svc/Dockerfile"
        "apps/resume-parser-svc/Dockerfile"
        "apps/scoring-engine-svc/Dockerfile"
        "apps/report-generator-svc/Dockerfile"
    )
    
    for dockerfile in "${DOCKER_FILES[@]}"; do
        if [ -f "$dockerfile" ]; then
            # Check Node.js version in Dockerfile
            if grep -q "FROM node:20-alpine" "$dockerfile"; then
                echo "✅ $dockerfile uses Node.js 20"
            else
                echo -e "${RED}❌ $dockerfile does not use Node.js 20${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Missing $dockerfile${NC}"
            exit 1
        fi
    done
    
    # Check .dockerignore
    if [ -f ".dockerignore" ]; then
        echo "✅ .dockerignore exists"
    else
        echo -e "${YELLOW}⚠️  .dockerignore not found (recommended for build optimization)${NC}"
    fi
}

validate_railway_config() {
    echo -e "${BLUE}Validating Railway configuration...${NC}"
    
    # Check railway.json
    if [ -f "railway.json" ]; then
        echo "✅ railway.json exists"
        
        # Validate JSON structure
        if jq empty railway.json 2>/dev/null; then
            echo "✅ railway.json is valid JSON"
            
            # Check required fields
            if jq -e '.deploy.healthcheckPath' railway.json >/dev/null; then
                echo "✅ Health check path configured"
            else
                echo -e "${YELLOW}⚠️  Health check path not configured${NC}"
            fi
            
            if jq -e '.environments.production' railway.json >/dev/null; then
                echo "✅ Production environment configured"
            else
                echo -e "${RED}❌ Production environment not configured${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ railway.json is invalid JSON${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ railway.json not found${NC}"
        exit 1
    fi
    
    # Check nixpacks.toml
    if [ -f "nixpacks.toml" ]; then
        echo "✅ nixpacks.toml exists"
        
        # Check Node.js version
        if grep -q "nodejs_20" nixpacks.toml; then
            echo "✅ nixpacks.toml uses Node.js 20"
        else
            echo -e "${RED}❌ nixpacks.toml does not use Node.js 20${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ nixpacks.toml not found${NC}"
        exit 1
    fi
}

validate_environment_template() {
    echo -e "${BLUE}Validating environment templates...${NC}"
    
    if [ -f ".railway.env.example" ]; then
        echo "✅ Railway environment template exists"
    else
        echo -e "${YELLOW}⚠️  Railway environment template not found${NC}"
    fi
}

validate_package_json() {
    echo -e "${BLUE}Validating package.json...${NC}"
    
    if [ -f "package.json" ]; then
        echo "✅ package.json exists"
        
        # Check Node.js engine requirement
        if jq -e '.engines.node' package.json >/dev/null; then
            NODE_REQUIREMENT=$(jq -r '.engines.node' package.json)
            echo "✅ Node.js engine requirement: $NODE_REQUIREMENT"
        else
            echo -e "${YELLOW}⚠️  Node.js engine requirement not specified${NC}"
        fi
        
        # Check build script
        if jq -e '.scripts.build' package.json >/dev/null; then
            echo "✅ Build script configured"
        else
            echo -e "${RED}❌ Build script not configured${NC}"
            exit 1
        fi
        
        # Check start script
        if jq -e '.scripts.start' package.json >/dev/null; then
            echo "✅ Start script configured"
        else
            echo -e "${RED}❌ Start script not configured${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ package.json not found${NC}"
        exit 1
    fi
}

validate_security() {
    echo -e "${BLUE}Validating security configuration...${NC}"
    
    # Check for sensitive files
    SENSITIVE_FILES=(".env" ".env.local" ".env.production")
    
    for file in "${SENSITIVE_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${YELLOW}⚠️  Sensitive file found: $file (ensure it's not committed)${NC}"
        fi
    done
    
    # Check gitignore
    if [ -f ".gitignore" ]; then
        if grep -q ".env" .gitignore; then
            echo "✅ Environment files ignored in git"
        else
            echo -e "${YELLOW}⚠️  .env files may not be properly ignored${NC}"
        fi
    fi
}

# Main validation
echo -e "${GREEN}Starting deployment validation...${NC}"
echo

validate_node_version
validate_npm_version
validate_docker_files
validate_railway_config
validate_environment_template
validate_package_json
validate_security

echo
echo -e "${GREEN}✅ Deployment validation completed successfully!${NC}"
echo -e "${BLUE}📋 Ready for Railway deployment${NC}"
echo
echo "Next steps:"
echo "1. Set up environment variables in Railway dashboard"
echo "2. Connect Railway to your repository"
echo "3. Deploy using: railway up"
echo "4. Monitor deployment logs and health checks"