#!/usr/bin/env node
/**
 * @file Generate Production Secrets
 * @description Generates secure random secrets for production deployment
 * Following our security best practices from ProductionSecurityValidator
 */

const crypto = require('crypto');

console.log('🔐 Generating secure production secrets...\n');

// Generate secure random secrets
const secrets = {
  JWT_SECRET: crypto.randomBytes(64).toString('hex'),
  JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('hex'),
  ENCRYPTION_MASTER_KEY: crypto.randomBytes(32).toString('hex'),
  DATABASE_PASSWORD: crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, ''),
  GEMINI_API_KEY: 'your_google_gemini_api_key_here', // Must be set manually
};

console.log('# ===========================================');
console.log('# SECURE PRODUCTION SECRETS');
console.log('# Generated:', new Date().toISOString());
console.log('# ===========================================\n');

console.log('# JWT Configuration (128-character hex keys)');
console.log(`JWT_SECRET=${secrets.JWT_SECRET}`);
console.log(`JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}\n`);

console.log('# Data Encryption (64-character hex key for AES-256)');
console.log(`ENCRYPTION_MASTER_KEY=${secrets.ENCRYPTION_MASTER_KEY}\n`);

console.log('# Database Password (secure random)');
console.log(`MONGODB_ROOT_PASSWORD=${secrets.DATABASE_PASSWORD}\n`);

console.log('# External API Keys (must be set manually)');
console.log(`GEMINI_API_KEY=${secrets.GEMINI_API_KEY}\n`);

console.log('# ===========================================');
console.log('# SECURITY VALIDATION');
console.log('# ===========================================\n');

// Validate generated secrets
console.log('✅ JWT_SECRET length:', secrets.JWT_SECRET.length, 'characters (minimum 32 required)');
console.log('✅ JWT_REFRESH_SECRET length:', secrets.JWT_REFRESH_SECRET.length, 'characters (minimum 32 required)');
console.log('✅ ENCRYPTION_MASTER_KEY length:', secrets.ENCRYPTION_MASTER_KEY.length, 'characters (exactly 64 required for AES-256)');
console.log('✅ DATABASE_PASSWORD length:', secrets.DATABASE_PASSWORD.length, 'characters');

// Enhanced entropy check matching ProductionSecurityValidator
const checkEntropy = (value) => {
  const length = value.length;
  const lowerValue = value.toLowerCase();
  
  // Check for obvious patterns first
  const badPatterns = [
    /(.)\1{4,}/, // 5+ repeated characters (aaaaa)
    /123456|abcdef|qwerty/i, // Common sequences
    /000000|111111|aaaaaa/i, // Obvious repetition
    /password|secret|default|change/i // Common words
  ];

  if (badPatterns.some(pattern => pattern.test(value))) {
    return false;
  }
  
  // For hex strings (encryption keys), use different entropy logic
  if (/^[a-f0-9]+$/i.test(value)) {
    // Hex strings should have good distribution of hex characters
    const charCounts = {};
    
    for (const char of lowerValue) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }
    
    // Check if any character appears too frequently (more than 25% of length)
    const maxFrequency = length * 0.25;
    return !Object.values(charCounts).some(count => count > maxFrequency);
  }
  
  // For non-hex strings, use character diversity check
  const uniqueChars = new Set(lowerValue).size;
  return uniqueChars >= length * 0.3; // Lowered threshold for realistic randomness
};

console.log('✅ JWT_SECRET entropy check:', checkEntropy(secrets.JWT_SECRET) ? 'PASS' : 'FAIL');
console.log('✅ JWT_REFRESH_SECRET entropy check:', checkEntropy(secrets.JWT_REFRESH_SECRET) ? 'PASS' : 'FAIL');
console.log('✅ ENCRYPTION_MASTER_KEY entropy check:', checkEntropy(secrets.ENCRYPTION_MASTER_KEY) ? 'PASS' : 'FAIL');

console.log('\n# ===========================================');
console.log('# USAGE INSTRUCTIONS');
console.log('# ===========================================\n');

console.log('1. Copy the generated secrets to your production .env file');
console.log('2. Set GEMINI_API_KEY to your actual Google Gemini API key');
console.log('3. Update MongoDB connection string with new password');
console.log('4. Test the application startup to verify security validation passes');
console.log('5. Store secrets securely in your deployment platform (Railway, AWS, etc.)');

console.log('\n# Example MongoDB connection string:');
console.log(`# mongodb://admin:${secrets.DATABASE_PASSWORD}@your-mongodb-host:27017/ai-recruitment?authSource=admin`);

console.log('\n🔒 SECURITY REMINDER: Never commit these secrets to version control!');
console.log('📝 Store them in your deployment platform\'s environment variables.');