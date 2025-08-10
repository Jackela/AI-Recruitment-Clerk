#!/usr/bin/env node
/**
 * Production Secrets Generator
 * Generates secure secrets for production deployment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 AI Recruitment Clerk - Production Secrets Generator');
console.log('=====================================================\n');

/**
 * Generates a cryptographically secure random string
 */
function generateSecureSecret(length = 64, encoding = 'hex') {
  return crypto.randomBytes(length / 2).toString(encoding);
}

/**
 * Generates a JWT secret with proper entropy
 */
function generateJWTSecret() {
  // 256 bits = 32 bytes = 64 hex chars
  return generateSecureSecret(64, 'hex');
}

/**
 * Generates an encryption key for AES-256-GCM
 */
function generateEncryptionKey() {
  // 256 bits = 32 bytes = 64 hex chars
  return generateSecureSecret(64, 'hex');
}

/**
 * Generates a secure database password
 */
function generateDatabasePassword() {
  // Mix of characters for better compatibility
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 32;
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generates all production secrets
 */
function generateAllSecrets() {
  const secrets = {
    // Authentication
    JWT_SECRET: generateJWTSecret(),
    JWT_REFRESH_SECRET: generateJWTSecret(),
    
    // Data Encryption
    ENCRYPTION_MASTER_KEY: generateEncryptionKey(),
    
    // Database
    MONGODB_ROOT_PASSWORD: generateDatabasePassword(),
    MONGODB_APP_PASSWORD: generateDatabasePassword(),
    
    // API Keys (placeholders)
    GEMINI_API_KEY: 'your_google_gemini_api_key_here',
    
    // Session/Cache
    SESSION_SECRET: generateSecureSecret(64, 'base64'),
    
    // CSRF Protection
    CSRF_SECRET: generateSecureSecret(32, 'hex'),
    
    // API Rate Limiting
    RATE_LIMIT_SECRET: generateSecureSecret(32, 'hex')
  };

  return secrets;
}

/**
 * Generates production environment file
 */
function generateProductionEnv(secrets) {
  const template = `# AI Recruitment Clerk - Production Environment
# Generated on: ${new Date().toISOString()}
# CRITICAL: Keep these secrets secure and never commit to version control

# ===========================================
# AUTHENTICATION & SECURITY
# ===========================================

# JWT Configuration
JWT_SECRET=${secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
JWT_EXPIRES_IN_SECONDS=3600

# Data Encryption (AES-256-GCM)
ENCRYPTION_MASTER_KEY=${secrets.ENCRYPTION_MASTER_KEY}

# Session Management
SESSION_SECRET=${secrets.SESSION_SECRET}

# CSRF Protection
CSRF_SECRET=${secrets.CSRF_SECRET}

# ===========================================
# DATABASE CONFIGURATION
# ===========================================

# MongoDB Configuration
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=${secrets.MONGODB_ROOT_PASSWORD}
MONGODB_APP_USERNAME=ai-recruitment-app
MONGODB_APP_PASSWORD=${secrets.MONGODB_APP_PASSWORD}
MONGODB_URL=mongodb://ai-recruitment-app:${secrets.MONGODB_APP_PASSWORD}@mongodb:27017/ai-recruitment?authSource=ai-recruitment
MONGODB_DATABASE=ai-recruitment

# ===========================================
# EXTERNAL API SERVICES
# ===========================================

# Google Gemini API (REQUIRED: Replace with your actual API key)
GEMINI_API_KEY=${secrets.GEMINI_API_KEY}

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================

# Environment
NODE_ENV=production

# Server Configuration
PORT=3000
API_PREFIX=api

# CORS Configuration
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true

# ===========================================
# SECURITY SETTINGS
# ===========================================

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SECRET=${secrets.RATE_LIMIT_SECRET}

# Security Headers
ENABLE_HELMET=true
ENABLE_CSRF=true

# ===========================================
# LOGGING & MONITORING
# ===========================================

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Disable development features
ENABLE_SWAGGER=false
ENABLE_DEBUG_ROUTES=false
`;

  return template;
}

/**
 * Generates Docker secrets
 */
function generateDockerSecrets(secrets) {
  const dockerSecrets = {};
  
  Object.entries(secrets).forEach(([key, value]) => {
    dockerSecrets[key.toLowerCase()] = value;
  });

  return dockerSecrets;
}

/**
 * Generates Kubernetes secrets
 */
function generateKubernetesSecrets(secrets) {
  const k8sSecrets = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'ai-recruitment-secrets',
      namespace: 'ai-recruitment'
    },
    type: 'Opaque',
    data: {}
  };

  Object.entries(secrets).forEach(([key, value]) => {
    k8sSecrets.data[key] = Buffer.from(value).toString('base64');
  });

  return k8sSecrets;
}

/**
 * Main execution
 */
function main() {
  try {
    // Generate secrets
    console.log('🔑 Generating production secrets...');
    const secrets = generateAllSecrets();
    
    // Create output directory
    const outputDir = path.join(__dirname, '../secrets');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate production environment file
    console.log('📄 Creating production environment file...');
    const prodEnv = generateProductionEnv(secrets);
    fs.writeFileSync(path.join(outputDir, '.env.production'), prodEnv);

    // Generate Docker secrets
    console.log('🐳 Creating Docker secrets file...');
    const dockerSecrets = generateDockerSecrets(secrets);
    fs.writeFileSync(
      path.join(outputDir, 'docker-secrets.json'),
      JSON.stringify(dockerSecrets, null, 2)
    );

    // Generate Kubernetes secrets
    console.log('☸️  Creating Kubernetes secrets manifest...');
    const k8sSecrets = generateKubernetesSecrets(secrets);
    fs.writeFileSync(
      path.join(outputDir, 'k8s-secrets.yaml'),
      \`# Apply with: kubectl apply -f k8s-secrets.yaml
\${require('js-yaml').dump(k8sSecrets)}\`
    );

    // Generate MongoDB init script
    console.log('🗄️  Creating MongoDB initialization script...');
    const mongoInit = \`// MongoDB Initialization Script
// Create application user with limited privileges

use admin;

// Create application database
use ai-recruitment;

// Create application user
db.createUser({
  user: "ai-recruitment-app",
  pwd: "\${secrets.MONGODB_APP_PASSWORD}",
  roles: [
    {
      role: "readWrite",
      db: "ai-recruitment"
    }
  ]
});

// Create indexes for performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.jobs.createIndex({ "organizationId": 1 });
db.resumes.createIndex({ "jobId": 1 });
db.reports.createIndex({ "jobId": 1, "resumeId": 1 });

print("AI Recruitment database initialized successfully");
\`;

    fs.writeFileSync(path.join(outputDir, 'mongo-init.js'), mongoInit);

    // Generate security checklist
    console.log('📋 Creating security deployment checklist...');
    const securityChecklist = \`# Production Security Deployment Checklist

## Environment Setup
- [ ] All secrets generated and stored securely
- [ ] GEMINI_API_KEY replaced with actual API key
- [ ] CORS_ORIGIN updated to production domain
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules configured

## Database Security
- [ ] MongoDB admin password changed
- [ ] Application user created with limited privileges
- [ ] Database access restricted to application network
- [ ] Regular backup schedule configured

## Application Security
- [ ] All default passwords changed
- [ ] Authentication enabled on all services
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] Audit logging enabled

## Secrets Management
- [ ] Secrets stored in secure vault (not version control)
- [ ] Access to secrets restricted to authorized personnel
- [ ] Secrets rotation schedule established
- [ ] Emergency access procedures documented

## Monitoring & Alerting
- [ ] Security monitoring enabled
- [ ] Failed authentication alerts configured
- [ ] Performance monitoring setup
- [ ] Log aggregation configured

## Backup & Recovery
- [ ] Database backup automated
- [ ] Disaster recovery plan tested
- [ ] Data encryption verified
- [ ] Recovery procedures documented

Generated on: \${new Date().toISOString()}
\`;

    fs.writeFileSync(path.join(outputDir, 'SECURITY_CHECKLIST.md'), securityChecklist);

    // Success message
    console.log('\n✅ Production secrets generated successfully!');
    console.log(\`📁 Secrets saved to: \${outputDir}\`);
    console.log('\n🚨 IMPORTANT SECURITY NOTES:');
    console.log('1. Keep all generated secrets secure and never commit to version control');
    console.log('2. Replace GEMINI_API_KEY with your actual Google Gemini API key');
    console.log('3. Update CORS_ORIGIN to your production domain');
    console.log('4. Store secrets in a secure vault (HashiCorp Vault, AWS Secrets Manager, etc.)');
    console.log('5. Implement secrets rotation schedule');
    console.log('6. Review and complete the security checklist before deployment');
    
    console.log('\n📋 Files generated:');
    console.log('   - .env.production (Production environment variables)');
    console.log('   - docker-secrets.json (Docker Compose secrets)');
    console.log('   - k8s-secrets.yaml (Kubernetes secrets manifest)');
    console.log('   - mongo-init.js (MongoDB initialization script)');
    console.log('   - SECURITY_CHECKLIST.md (Deployment security checklist)');

  } catch (error) {
    console.error('❌ Error generating secrets:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateSecureSecret,
  generateJWTSecret,
  generateEncryptionKey,
  generateAllSecrets,
  generateProductionEnv
};