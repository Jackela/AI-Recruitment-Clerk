#!/bin/bash
# ==========================================
# AI Recruitment Clerk - Docker Secrets Management
# Production-ready secrets initialization and rotation
# ==========================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SECRETS_VERSION=${1:-v1}
FORCE_RECREATE=${2:-false}

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if Docker is available and supports secrets
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! docker swarm init 2>/dev/null && ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q active; then
        warn "Docker swarm not initialized. Initializing now..."
        docker swarm init
    fi
    
    log "Docker swarm is active and ready for secrets"
}

# Generate cryptographically secure secrets
generate_secret() {
    local length=$1
    openssl rand -hex $length | tr -d '\n'
}

# Create or update a Docker secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    # Check if secret already exists
    if docker secret ls --format '{{.Name}}' | grep -q "^${secret_name}$"; then
        if [ "$FORCE_RECREATE" = "true" ]; then
            warn "Removing existing secret: ${secret_name}"
            docker secret rm "${secret_name}" || true
        else
            warn "Secret ${secret_name} already exists. Use FORCE_RECREATE=true to replace"
            return 0
        fi
    fi
    
    # Create the secret
    echo "${secret_value}" | docker secret create "${secret_name}" - --label "description=${description}" --label "version=${SECRETS_VERSION}" --label "created=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    if [ $? -eq 0 ]; then
        log "Created secret: ${secret_name}"
    else
        error "Failed to create secret: ${secret_name}"
    fi
}

# Prompt for external API keys
prompt_for_api_keys() {
    echo ""
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}External API Keys Configuration${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    
    # Gemini API Key
    echo -e "${YELLOW}Please provide your Google Gemini API key:${NC}"
    echo -e "${YELLOW}(Required for resume parsing and job description extraction)${NC}"
    read -s -p "Gemini API Key: " GEMINI_API_KEY
    echo ""
    
    if [ -z "$GEMINI_API_KEY" ]; then
        warn "No Gemini API key provided. Using placeholder value."
        GEMINI_API_KEY="your_actual_google_gemini_api_key_here"
    fi
    
    echo ""
}

# Generate and create all production secrets
create_production_secrets() {
    log "Generating production-ready cryptographic secrets..."
    
    # Authentication and JWT secrets (256-bit minimum)
    local JWT_SECRET=$(generate_secret 32)  # 256-bit
    local JWT_REFRESH_SECRET=$(generate_secret 32)  # 256-bit
    local ENCRYPTION_KEY=$(generate_secret 64)  # 512-bit for AES-256-GCM
    local SESSION_SECRET=$(generate_secret 32)  # 256-bit
    local CSRF_SECRET=$(generate_secret 32)  # 256-bit
    
    # Database and infrastructure secrets
    local MONGODB_ROOT_USER="admin"
    local MONGODB_ROOT_PASSWORD=$(generate_secret 24)  # 192-bit
    local REDIS_PASSWORD=$(generate_secret 20)  # 160-bit
    local NATS_AUTH_TOKEN=$(generate_secret 16)  # 128-bit
    
    log "Creating Docker secrets with version: ${SECRETS_VERSION}"
    
    # Authentication secrets
    create_secret "ai-recruitment-jwt-secret-${SECRETS_VERSION}" "$JWT_SECRET" "JWT signing secret for access tokens"
    create_secret "ai-recruitment-jwt-refresh-secret-${SECRETS_VERSION}" "$JWT_REFRESH_SECRET" "JWT signing secret for refresh tokens"
    create_secret "ai-recruitment-encryption-key-${SECRETS_VERSION}" "$ENCRYPTION_KEY" "Master encryption key for data protection"
    create_secret "ai-recruitment-session-secret-${SECRETS_VERSION}" "$SESSION_SECRET" "Session management secret"
    create_secret "ai-recruitment-csrf-secret-${SECRETS_VERSION}" "$CSRF_SECRET" "CSRF protection secret"
    
    # Database and infrastructure secrets
    create_secret "ai-recruitment-mongodb-user-${SECRETS_VERSION}" "$MONGODB_ROOT_USER" "MongoDB root username"
    create_secret "ai-recruitment-mongodb-password-${SECRETS_VERSION}" "$MONGODB_ROOT_PASSWORD" "MongoDB root password"
    create_secret "ai-recruitment-redis-password-${SECRETS_VERSION}" "$REDIS_PASSWORD" "Redis authentication password"
    create_secret "ai-recruitment-nats-token-${SECRETS_VERSION}" "$NATS_AUTH_TOKEN" "NATS authentication token"
    
    # External API secrets
    create_secret "ai-recruitment-gemini-api-key-${SECRETS_VERSION}" "$GEMINI_API_KEY" "Google Gemini API key for AI processing"
    
    log "All secrets created successfully!"
}

# List current secrets
list_secrets() {
    echo ""
    echo -e "${BLUE}Current Docker Secrets:${NC}"
    echo "======================"
    docker secret ls --format "table {{.Name}}\t{{.Created}}\t{{.Updated}}" | grep ai-recruitment || echo "No AI Recruitment secrets found"
    echo ""
}

# Generate secrets verification file
generate_verification_file() {
    local verification_file="secrets-verification-${SECRETS_VERSION}.txt"
    
    cat > "$verification_file" << EOF
# AI Recruitment Clerk - Secrets Verification
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Version: ${SECRETS_VERSION}

# Security Notice:
# ================
# ✅ All secrets are cryptographically secure (128-bit minimum)
# ✅ JWT secrets use 256-bit entropy for enhanced security
# ✅ Encryption key uses 512-bit entropy for AES-256-GCM
# ✅ Database passwords use high-entropy random generation
# ✅ All secrets are stored securely in Docker Swarm

# Secrets Created:
# ================
$(docker secret ls --format "{{.Name}}\t{{.CreatedAt}}" | grep ai-recruitment | sed 's/^/# /')

# Next Steps:
# ===========
# 1. Update docker-compose.yml to use these secrets
# 2. Ensure proper file permissions on secrets volume mounts
# 3. Set up secret rotation schedule (recommended: quarterly)
# 4. Monitor secret access logs
# 5. Backup secret names and metadata (NOT the values)

# Important Security Reminders:
# ==============================
# 🚨 Never commit actual secret values to version control
# 🔒 Use Docker secrets or external secret management in production
# 📝 Implement secret rotation policies
# 🛡️ Monitor for unauthorized secret access
# ✅ Regular security audits of secret usage

EOF

    log "Verification file created: $verification_file"
}

# Rotate secrets (create new version)
rotate_secrets() {
    local new_version="v$(date +%Y%m%d%H%M%S)"
    warn "Rotating secrets to new version: $new_version"
    
    # Create new secrets with new version
    SECRETS_VERSION="$new_version"
    FORCE_RECREATE="false"  # Don't force recreate, create alongside existing
    
    create_production_secrets
    
    echo ""
    echo -e "${YELLOW}Secret rotation completed!${NC}"
    echo -e "${YELLOW}New version: ${new_version}${NC}"
    echo -e "${YELLOW}Update your docker-compose.yml to use the new version${NC}"
    echo -e "${YELLOW}After verification, remove old secrets with: docker secret rm <old-secret-name>${NC}"
}

# Cleanup old secrets
cleanup_old_secrets() {
    echo ""
    echo -e "${YELLOW}Available AI Recruitment secrets:${NC}"
    docker secret ls --format "{{.Name}}" | grep ai-recruitment | sort
    
    echo ""
    echo -e "${YELLOW}Enter the names of secrets to remove (space-separated), or press Enter to cancel:${NC}"
    read -r secrets_to_remove
    
    if [ -n "$secrets_to_remove" ]; then
        for secret in $secrets_to_remove; do
            docker secret rm "$secret" && log "Removed secret: $secret" || warn "Failed to remove: $secret"
        done
    else
        log "No secrets removed"
    fi
}

# Main function
main() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "AI Recruitment Clerk - Secrets Manager"
    echo "Production Security Implementation"
    echo "========================================"
    echo -e "${NC}"
    
    check_docker
    
    case "${1:-create}" in
        create)
            prompt_for_api_keys
            create_production_secrets
            generate_verification_file
            list_secrets
            echo ""
            echo -e "${GREEN}✅ Production secrets created successfully!${NC}"
            echo -e "${GREEN}✅ Use the docker-security-hardening.yml for deployment${NC}"
            ;;
        list)
            list_secrets
            ;;
        rotate)
            rotate_secrets
            generate_verification_file
            ;;
        cleanup)
            cleanup_old_secrets
            ;;
        *)
            echo "Usage: $0 {create|list|rotate|cleanup} [version] [force_recreate]"
            echo ""
            echo "Commands:"
            echo "  create   - Create new production secrets"
            echo "  list     - List existing secrets"
            echo "  rotate   - Create new version of all secrets"
            echo "  cleanup  - Remove old secret versions"
            echo ""
            echo "Examples:"
            echo "  $0 create v1"
            echo "  $0 rotate"
            echo "  $0 cleanup"
            echo "  $0 create v2 true  # Force recreate existing secrets"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"