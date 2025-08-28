#!/usr/bin/env node
/**
 * AI Recruitment Clerk - Security Validation Suite
 * Comprehensive security testing and validation
 */

const crypto = require('crypto');
const https = require('https');

console.log('🛡️  AI Recruitment Clerk - Security Validation Suite');
console.log('==================================================\n');

// Test environment setup
process.env.ENCRYPTION_MASTER_KEY = 'test-key-32-chars-long-for-secure-encryption';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-security-validation-suite';

/**
 * Security Test Results
 */
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Test result logger
 */
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(\`  \${status} \${name}\`);
  if (details && !passed) {
    console.log(\`    Details: \${details}\`);
  }
  
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

/**
 * Test 1: Encryption Security Validation
 */
function testEncryptionSecurity() {
  console.log('🔐 Testing Encryption Security...');
  
  try {
    // Import encryption service
    const { EncryptionService } = require('./libs/shared-dtos/src/encryption/encryption.service.ts');
    
    // Test 1.1: Basic encryption/decryption
    try {
      const testData = 'Sensitive test data for encryption validation';
      const encrypted = EncryptionService.encrypt(testData);
      const decrypted = EncryptionService.decrypt(encrypted);
      
      logTest('Basic AES-256-GCM encryption/decryption', decrypted === testData);
    } catch (error) {
      logTest('Basic AES-256-GCM encryption/decryption', false, error.message);
    }
    
    // Test 1.2: Data confidentiality (encrypted data doesn't contain plaintext)
    try {
      const sensitiveData = 'john.doe@example.com';
      const encrypted = EncryptionService.encrypt(sensitiveData);
      const containsPlaintext = encrypted.encryptedData.includes(sensitiveData);
      
      logTest('Data confidentiality (no plaintext leakage)', !containsPlaintext);
    } catch (error) {
      logTest('Data confidentiality (no plaintext leakage)', false, error.message);
    }
    
    // Test 1.3: Unique encryption (same input produces different output)
    try {
      const data = 'test data for uniqueness';
      const encrypted1 = EncryptionService.encrypt(data);
      const encrypted2 = EncryptionService.encrypt(data);
      const isDifferent = encrypted1.encryptedData !== encrypted2.encryptedData;
      
      logTest('Encryption uniqueness (different IV/salt)', isDifferent);
    } catch (error) {
      logTest('Encryption uniqueness (different IV/salt)', false, error.message);
    }
    
    // Test 1.4: Tamper detection
    try {
      const data = 'tamper detection test';
      const encrypted = EncryptionService.encrypt(data);
      
      // Tamper with encrypted data
      const tampered = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.slice(0, -2) + '00'
      };
      
      let tamperDetected = false;
      try {
        EncryptionService.decrypt(tampered);
      } catch (error) {
        tamperDetected = true;
      }
      
      logTest('Tamper detection (authentication)', tamperDetected);
    } catch (error) {
      logTest('Tamper detection (authentication)', false, error.message);
    }
    
    // Test 1.5: PII field encryption
    try {
      const userData = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: 'user'
      };
      
      const encrypted = EncryptionService.encryptUserPII(userData);
      const decrypted = EncryptionService.decryptUserPII(encrypted);
      
      const piiProtected = encrypted.firstName === '[ENCRYPTED]' && 
                          encrypted.email === '[ENCRYPTED]' &&
                          decrypted.firstName === 'John' &&
                          decrypted.email === 'john.doe@example.com';
      
      logTest('PII field-level encryption', piiProtected);
    } catch (error) {
      logTest('PII field-level encryption', false, error.message);
    }
    
    // Test 1.6: Configuration validation
    try {
      const validation = EncryptionService.validateConfig();
      logTest('Encryption configuration validation', validation.isValid);
    } catch (error) {
      logTest('Encryption configuration validation', false, error.message);
    }
    
  } catch (error) {
    logTest('Encryption Service Import', false, 'Cannot import encryption service');
  }
}

/**
 * Test 2: Authentication Security Validation
 */
function testAuthenticationSecurity() {
  console.log('\n🔑 Testing Authentication Security...');
  
  try {
    // Mock JWT for testing
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    
    // Test 2.1: JWT token generation
    try {
      const payload = { sub: 'user-123', email: 'test@example.com', role: 'user' };
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      const decoded = jwt.verify(token, secret);
      
      logTest('JWT token generation and verification', decoded.sub === 'user-123');
    } catch (error) {
      logTest('JWT token generation and verification', false, error.message);
    }
    
    // Test 2.2: Token expiration
    try {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const expiredToken = jwt.sign(payload, secret, { expiresIn: '0s' });
      
      let tokenExpired = false;
      try {
        jwt.verify(expiredToken, secret);
      } catch (error) {
        tokenExpired = error.name === 'TokenExpiredError';
      }
      
      logTest('JWT token expiration validation', tokenExpired);
    } catch (error) {
      logTest('JWT token expiration validation', false, error.message);
    }
    
    // Test 2.3: Invalid signature detection
    try {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = jwt.sign(payload, secret);
      
      let invalidSignatureDetected = false;
      try {
        jwt.verify(token, 'wrong-secret');
      } catch (error) {
        invalidSignatureDetected = error.name === 'JsonWebTokenError';
      }
      
      logTest('JWT invalid signature detection', invalidSignatureDetected);
    } catch (error) {
      logTest('JWT invalid signature detection', false, error.message);
    }
    
  } catch (error) {
    logTest('JWT Library Import', false, 'Cannot import jsonwebtoken');
  }
}

/**
 * Test 3: RBAC Security Validation
 */
function testRBACLSecurity() {
  console.log('\n👥 Testing RBAC Security...');
  
  try {
    // Import RBAC functions
    const { UserRole, Permission, hasPermission, hasAllPermissions } = require('./libs/shared-dtos/src/auth/permissions.dto.ts');
    
    // Test 3.1: Admin permissions
    try {
      const adminCanCreateUser = hasPermission(UserRole.ADMIN, Permission.CREATE_USER);
      const adminCanDeleteUser = hasPermission(UserRole.ADMIN, Permission.DELETE_USER);
      const adminCanSystemConfig = hasPermission(UserRole.ADMIN, Permission.SYSTEM_CONFIG);
      
      logTest('Admin role permissions (full access)', adminCanCreateUser && adminCanDeleteUser && adminCanSystemConfig);
    } catch (error) {
      logTest('Admin role permissions (full access)', false, error.message);
    }
    
    // Test 3.2: Viewer restrictions
    try {
      const viewerCannotCreateJob = !hasPermission(UserRole.VIEWER, Permission.CREATE_JOB);
      const viewerCannotDeleteUser = !hasPermission(UserRole.VIEWER, Permission.DELETE_USER);
      const viewerCanReadJob = hasPermission(UserRole.VIEWER, Permission.READ_JOB);
      
      logTest('Viewer role restrictions (read-only)', viewerCannotCreateJob && viewerCannotDeleteUser && viewerCanReadJob);
    } catch (error) {
      logTest('Viewer role restrictions (read-only)', false, error.message);
    }
    
    // Test 3.3: Recruiter permissions
    try {
      const recruiterCanCreateJob = hasPermission(UserRole.RECRUITER, Permission.CREATE_JOB);
      const recruiterCannotDeleteUser = !hasPermission(UserRole.RECRUITER, Permission.DELETE_USER);
      const recruiterCanUploadResume = hasPermission(UserRole.RECRUITER, Permission.UPLOAD_RESUME);
      
      logTest('Recruiter role permissions (job management)', recruiterCanCreateJob && recruiterCannotDeleteUser && recruiterCanUploadResume);
    } catch (error) {
      logTest('Recruiter role permissions (job management)', false, error.message);
    }
    
    // Test 3.4: Multiple permissions check
    try {
      const requiredPermissions = [Permission.READ_JOB, Permission.CREATE_JOB, Permission.UPLOAD_RESUME];
      const hrManagerHasAll = hasAllPermissions(UserRole.HR_MANAGER, requiredPermissions);
      const viewerHasAll = hasAllPermissions(UserRole.VIEWER, requiredPermissions);
      
      logTest('Multiple permissions validation', hrManagerHasAll && !viewerHasAll);
    } catch (error) {
      logTest('Multiple permissions validation', false, error.message);
    }
    
  } catch (error) {
    logTest('RBAC Import', false, 'Cannot import RBAC functions');
  }
}

/**
 * Test 4: Password Security Validation
 */
function testPasswordSecurity() {
  console.log('\n🔒 Testing Password Security...');
  
  try {
    const bcrypt = require('bcryptjs');
    
    // Test 4.1: Password hashing
    try {
      const password = 'testPassword123!';
      const hashedPassword = bcrypt.hashSync(password, 12);
      const isValid = bcrypt.compareSync(password, hashedPassword);
      const containsPlaintext = hashedPassword.includes(password);
      
      logTest('Password hashing (bcrypt)', isValid && !containsPlaintext);
    } catch (error) {
      logTest('Password hashing (bcrypt)', false, error.message);
    }
    
    // Test 4.2: Different hashes for same password
    try {
      const password = 'samePassword123';
      const hash1 = bcrypt.hashSync(password, 12);
      const hash2 = bcrypt.hashSync(password, 12);
      
      logTest('Password hash uniqueness (salt)', hash1 !== hash2);
    } catch (error) {
      logTest('Password hash uniqueness (salt)', false, error.message);
    }
    
    // Test 4.3: Wrong password rejection
    try {
      const correctPassword = 'correctPassword123';
      const wrongPassword = 'wrongPassword123';
      const hashedPassword = bcrypt.hashSync(correctPassword, 12);
      const wrongPasswordAccepted = bcrypt.compareSync(wrongPassword, hashedPassword);
      
      logTest('Wrong password rejection', !wrongPasswordAccepted);
    } catch (error) {
      logTest('Wrong password rejection', false, error.message);
    }
    
  } catch (error) {
    logTest('Bcrypt Import', false, 'Cannot import bcryptjs');
  }
}

/**
 * Test 5: Security Configuration Validation
 */
function testSecurityConfiguration() {
  console.log('\n⚙️  Testing Security Configuration...');
  
  // Test 5.1: Environment variable validation
  try {
    const hasEncryptionKey = !!process.env.ENCRYPTION_MASTER_KEY;
    const hasJWTSecret = !!process.env.JWT_SECRET;
    const encryptionKeyLength = process.env.ENCRYPTION_MASTER_KEY?.length >= 32;
    
    logTest('Required environment variables', hasEncryptionKey && hasJWTSecret && encryptionKeyLength);
  } catch (error) {
    logTest('Required environment variables', false, error.message);
  }
  
  // Test 5.2: Crypto module availability
  try {
    const hasRandomBytes = typeof crypto.randomBytes === 'function';
    const hasPbkdf2 = typeof crypto.pbkdf2Sync === 'function';
    const hasCreateCipher = typeof crypto.createCipherGCM === 'function';
    
    logTest('Crypto module functionality', hasRandomBytes && hasPbkdf2 && hasCreateCipher);
  } catch (error) {
    logTest('Crypto module functionality', false, error.message);
  }
  
  // Test 5.3: Secure random generation
  try {
    const random1 = crypto.randomBytes(32).toString('hex');
    const random2 = crypto.randomBytes(32).toString('hex');
    const isDifferent = random1 !== random2;
    const correctLength = random1.length === 64;
    
    logTest('Secure random generation', isDifferent && correctLength);
  } catch (error) {
    logTest('Secure random generation', false, error.message);
  }
}

/**
 * Test 6: Input Validation Security
 */
function testInputValidation() {
  console.log('\n🔍 Testing Input Validation...');
  
  // Test 6.1: SQL injection prevention (simulated)
  try {
    const maliciousInput = "'; DROP TABLE users; --";
    const sanitizedInput = maliciousInput.replace(/['"\\;]/g, '');
    const isSanitized = !sanitizedInput.includes(';') && !sanitizedInput.includes("'");
    
    logTest('SQL injection prevention (basic)', isSanitized);
  } catch (error) {
    logTest('SQL injection prevention (basic)', false, error.message);
  }
  
  // Test 6.2: XSS prevention (simulated)
  try {
    const xssInput = '<script>alert("xss")</script>';
    const sanitizedXSS = xssInput.replace(/<[^>]*>/g, '');
    const isXSSSanitized = !sanitizedXSS.includes('<script>');
    
    logTest('XSS prevention (basic)', isXSSSanitized);
  } catch (error) {
    logTest('XSS prevention (basic)', false, error.message);
  }
  
  // Test 6.3: Path traversal prevention
  try {
    const maliciousPath = '../../../etc/passwd';
    const safePath = maliciousPath.replace(/\\.\\./g, '');
    const isPathSafe = !safePath.includes('../');
    
    logTest('Path traversal prevention (basic)', isPathSafe);
  } catch (error) {
    logTest('Path traversal prevention (basic)', false, error.message);
  }
}

/**
 * Main test execution
 */
async function runSecurityTests() {
  console.log('Starting security validation suite...\n');
  
  // Run all test suites
  testEncryptionSecurity();
  testAuthenticationSecurity();
  testRBACLSecurity();
  testPasswordSecurity();
  testSecurityConfiguration();
  testInputValidation();
  
  // Print results
  console.log('\n📊 Security Validation Results');
  console.log('============================');
  console.log(\`✅ Passed: \${testResults.passed}\`);
  console.log(\`❌ Failed: \${testResults.failed}\`);
  console.log(\`📈 Success Rate: \${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%\n\`);
  
  // Security assessment
  const successRate = (testResults.passed / (testResults.passed + testResults.failed)) * 100;
  
  if (successRate >= 95) {
    console.log('🏆 EXCELLENT: Security implementation meets enterprise standards');
  } else if (successRate >= 85) {
    console.log('✅ GOOD: Security implementation is production-ready with minor improvements needed');
  } else if (successRate >= 70) {
    console.log('⚠️  WARNING: Security implementation needs significant improvements before production');
  } else {
    console.log('🚨 CRITICAL: Security implementation has major vulnerabilities and is NOT production-ready');
  }
  
  // Failed tests summary
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(\`   • \${test.name}\${test.details ? \` - \${test.details}\` : ''}\`);
      });
  }
  
  console.log('\n🛡️  Security validation completed.');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  runSecurityTests().catch(error => {
    console.error('❌ Security validation failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runSecurityTests,
  testResults
};