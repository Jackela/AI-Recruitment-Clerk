#!/bin/bash
# AI Recruitment Clerk - Production Secrets Generator
# This script generates secure secrets for production deployment

set -e

echo "🔐 Generating production secrets for AI Recruitment Clerk..."

# Check if .env.production already exists
if [ -f .env.production ]; then
    echo "⚠️  .env.production already exists."
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. Existing .env.production file preserved."
        exit 1
    fi
    cp .env.production .env.production.backup
    echo "📋 Existing .env.production backed up to .env.production.backup"
fi

# Function to generate secure random string
generate_secret() {
    local length=$1
    openssl rand -base64 $((length * 3 / 4)) | tr -d "=+/" | cut -c1-$length
}

# Function to generate secure hex string
generate_hex_secret() {
    local length=$1
    openssl rand -hex $((length / 2))
}

echo "🎲 Generating secure random secrets..."

# Generate all required secrets
MONGODB_ROOT_PASSWORD=$(generate_secret 32)
REDIS_PASSWORD=$(generate_secret 32)
NATS_AUTH_TOKEN=$(generate_secret 32)
JWT_SECRET=$(generate_secret 64)
JWT_REFRESH_SECRET=$(generate_secret 64)
ENCRYPTION_KEY=$(generate_secret 32)
SESSION_SECRET=$(generate_secret 64)
CSRF_SECRET=$(generate_secret 32)

# Create .env.production file
cat > .env.production << EOF
# AI Recruitment Clerk - Production Environment Configuration
# Generated on $(date)
# SECURITY WARNING: Keep this file secure and never commit to version control

# Database Configuration
MONGODB_ROOT_USER=admin
MONGODB_ROOT_PASSWORD=${MONGODB_ROOT_PASSWORD}
MONGODB_DATABASE=ai-recruitment

# Redis Configuration
REDIS_PASSWORD=${REDIS_PASSWORD}

# Message Queue Configuration
NATS_AUTH_TOKEN=${NATS_AUTH_TOKEN}

# JWT Security Configuration
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Encryption Configuration
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Session Security Configuration
SESSION_SECRET=${SESSION_SECRET}
CSRF_SECRET=${CSRF_SECRET}

# Password Security Configuration
BCRYPT_SALT_ROUNDS=12

# External API Configuration
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # requests per window

# Port Configuration
GATEWAY_PORT=3000
FRONTEND_PORT=4200

# Logging Configuration
LOG_LEVEL=warn
ENABLE_REQUEST_LOGGING=false

# Multi-Factor Authentication Configuration
MFA_ISSUER_NAME=AI-Recruitment-Clerk
MFA_SECRET_LENGTH=32
MFA_BACKUP_CODES_COUNT=10

# Email Configuration (for MFA) - UPDATE THESE VALUES
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@your-domain.com

# SMS Configuration (for MFA) - UPDATE THESE VALUES
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_PHONE=your_twilio_phone_number

# Security Monitoring Configuration
SECURITY_WEBHOOK_URL=your_security_monitoring_webhook_url
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000  # 15 minutes
SUSPICIOUS_ACTIVITY_THRESHOLD=10

# Application Security Configuration
CORS_ORIGIN=https://your-frontend-domain.com
CORS_CREDENTIALS=true
HELMET_ENABLED=true
TRUST_PROXY=true

# File Upload Security
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=pdf,doc,docx,txt
UPLOAD_SCAN_ENABLED=true

# Database Security
MONGODB_TLS_ENABLED=false
MONGODB_TLS_CA_FILE=
MONGODB_TLS_CERT_FILE=
MONGODB_TLS_KEY_FILE=
EOF

# Set secure permissions
chmod 600 .env.production

echo "✅ Production secrets generated successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Review .env.production and update the following placeholder values:"
echo "   - GEMINI_API_KEY"
echo "   - SMTP_* (email configuration)"
echo "   - TWILIO_* (SMS configuration)"
echo "   - CORS_ORIGIN (your frontend domain)"
echo "   - SECURITY_WEBHOOK_URL (monitoring webhook)"
echo ""
echo "2. Ensure .env.production is never committed to version control"
echo "3. Deploy using: docker-compose -f docker-compose.production.yml --env-file .env.production up -d"
echo ""
echo "🔒 Security Notes:"
echo "- All secrets are cryptographically secure (32-64 characters)"
echo "- File permissions set to 600 (owner read/write only)"
echo "- Backup created if overwriting existing file"
echo ""
echo "⚠️  Remember to update your DNS, firewall, and SSL certificate configuration!"