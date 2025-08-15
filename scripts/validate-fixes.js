#!/usr/bin/env node

/**
 * AI Recruitment Clerk - Fixes Validation Script
 * 验证所有修复是否正确实施
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 AI Recruitment Clerk - Fixes Validation');
console.log('==========================================\n');

const tests = [];

// Test 1: Check if shared-dtos can be imported
tests.push({
  name: 'shared-dtos Import Test',
  test: () => {
    try {
      require('../libs/shared-dtos/dist/index.js');
      return { success: true, message: 'shared-dtos imported successfully' };
    } catch (error) {
      return { success: false, message: `Import failed: ${error.message}` };
    }
  }
});

// Test 2: Check TypeScript build artifacts
tests.push({
  name: 'TypeScript Build Artifacts',
  test: () => {
    const distPath = path.join(__dirname, '../libs/shared-dtos/dist');
    const indexExists = fs.existsSync(path.join(distPath, 'index.js'));
    const authDtoExists = fs.existsSync(path.join(distPath, 'auth/user.dto.js'));
    
    if (indexExists && authDtoExists) {
      return { success: true, message: 'Build artifacts exist' };
    } else {
      return { success: false, message: 'Missing build artifacts' };
    }
  }
});

// Test 3: Check Docker Compose configurations
tests.push({
  name: 'Docker Compose Configuration',
  test: () => {
    const dockerComposeContent = fs.readFileSync(
      path.join(__dirname, '../docker-compose.yml'), 
      'utf8'
    );
    
    const hasJwtSecret = dockerComposeContent.includes('JWT_SECRET:');
    const hasRedisDisable = dockerComposeContent.includes('DISABLE_REDIS');
    const hasMongoUrl = dockerComposeContent.includes('MONGO_URL:');
    
    if (hasJwtSecret && hasRedisDisable && hasMongoUrl) {
      return { success: true, message: 'Docker Compose configuration is correct' };
    } else {
      return { success: false, message: 'Missing configuration in docker-compose.yml' };
    }
  }
});

// Test 4: Check environment example file
tests.push({
  name: 'Environment Template',
  test: () => {
    const envExampleExists = fs.existsSync(path.join(__dirname, '../.env.example'));
    if (!envExampleExists) {
      return { success: false, message: '.env.example file missing' };
    }
    
    const envContent = fs.readFileSync(
      path.join(__dirname, '../.env.example'), 
      'utf8'
    );
    
    const hasRedisConfig = envContent.includes('DISABLE_REDIS');
    const hasJwtConfig = envContent.includes('JWT_SECRET');
    const hasMongoConfig = envContent.includes('MONGO_URL');
    
    if (hasRedisConfig && hasJwtConfig && hasMongoConfig) {
      return { success: true, message: 'Environment template is complete' };
    } else {
      return { success: false, message: 'Environment template missing configurations' };
    }
  }
});

// Test 5: Check API Service routes
tests.push({
  name: 'Frontend API Service Routes',
  test: () => {
    const apiServicePath = path.join(
      __dirname, 
      '../apps/ai-recruitment-frontend/src/app/services/api.service.ts'
    );
    
    if (!fs.existsSync(apiServicePath)) {
      return { success: false, message: 'API Service file not found' };
    }
    
    const apiContent = fs.readFileSync(apiServicePath, 'utf8');
    const usesCorrectBaseUrl = apiContent.includes("baseUrl = '/api'");
    const hasJobsEndpoint = apiContent.includes('${this.baseUrl}/jobs');
    
    if (usesCorrectBaseUrl && hasJobsEndpoint) {
      return { success: true, message: 'API Service routes are correct' };
    } else {
      return { success: false, message: 'API Service routes may be incorrect' };
    }
  }
});

// Test 6: Check if debugging scripts exist
tests.push({
  name: 'Debugging Scripts',
  test: () => {
    const debugScriptExists = fs.existsSync(path.join(__dirname, 'debug-local.bat'));
    const cleanupScriptExists = fs.existsSync(path.join(__dirname, 'cleanup-docker.bat'));
    
    if (debugScriptExists && cleanupScriptExists) {
      return { success: true, message: 'Debugging scripts are available' };
    } else {
      return { success: false, message: 'Some debugging scripts are missing' };
    }
  }
});

// Run all tests
let totalTests = tests.length;
let passedTests = 0;
let failedTests = 0;

console.log(`Running ${totalTests} validation tests...\n`);

tests.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  try {
    const result = test.test();
    if (result.success) {
      console.log(`   ✅ PASS - ${result.message}`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL - ${result.message}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`   💥 ERROR - ${error.message}`);
    failedTests++;
  }
  console.log('');
});

// Summary
console.log('==========================================');
console.log('📊 VALIDATION SUMMARY');
console.log('==========================================');
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 All fixes validated successfully!');
  console.log('   Ready for Docker build and deployment.');
} else {
  console.log('\n⚠️  Some issues detected.');
  console.log('   Please review failed tests and fix issues.');
}

console.log('\n📝 Next Steps:');
console.log('1. Run: npm run build:check');
console.log('2. Run: docker-compose -f docker-compose.debug.yml up --build');
console.log('3. Test: curl http://localhost:3000/api/health');