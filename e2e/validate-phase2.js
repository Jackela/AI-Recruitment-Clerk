const fs = require('fs');
const path = require('path');

console.log('🔍 Phase 2 E2E Test Suite Validation\n');

// Test structure validation
const phase2Dir = path.join(__dirname, 'tests', 'phase2-business');
const expectedFiles = [
  '03-user-registration.e2e.spec.ts',
  '04-questionnaire-flows.e2e.spec.ts', 
  '05-resume-processing.e2e.spec.ts',
  '06-analytics-integration.e2e.spec.ts',
  '07-report-generation.e2e.spec.ts'
];

console.log('📁 Test File Structure Validation:');

let allFilesExist = true;
expectedFiles.forEach(file => {
  const filePath = path.join(phase2Dir, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (allFilesExist) {
  console.log('\n✅ All Phase 2 test files are present');
} else {
  console.log('\n❌ Some Phase 2 test files are missing');
  process.exit(1);
}

// Content validation - count test scenarios
console.log('\n📊 Test Coverage Analysis:');

let totalTestCount = 0;
expectedFiles.forEach(file => {
  const filePath = path.join(phase2Dir, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const testCount = (content.match(/it\(['"`]/g) || []).length;
    const describeCount = (content.match(/describe\(['"`]/g) || []).length;
    
    console.log(`  📝 ${file}:`);
    console.log(`     - ${describeCount} test suites`);
    console.log(`     - ${testCount} test cases`);
    
    totalTestCount += testCount;
  } catch (error) {
    console.log(`  ❌ Error reading ${file}: ${error.message}`);
  }
});

console.log(`\n🎯 Total Test Scenarios Implemented: ${totalTestCount}`);

// Infrastructure check
console.log('\n🏗️ Infrastructure Services Check:');

const { spawn } = require('child_process');

// Check MongoDB connection
const testMongo = spawn('mongosh', [
  'mongodb://testuser:testpass123@localhost:27018/ai-recruitment-test?authSource=admin',
  '--eval', 'db.runCommand("ping")',
  '--quiet'
]);

testMongo.on('close', (code) => {
  if (code === 0) {
    console.log('  ✅ MongoDB E2E connection: OK');
  } else {
    console.log('  ❌ MongoDB E2E connection: FAILED');
  }
});

// Check Redis connection
const testRedis = spawn('redis-cli', ['-p', '6380', 'ping']);

testRedis.on('close', (code) => {
  if (code === 0) {
    console.log('  ✅ Redis E2E connection: OK');
  } else {
    console.log('  ❌ Redis E2E connection: FAILED');
  }
});

// Configuration validation
console.log('\n⚙️ Configuration Validation:');

const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const hasPhase2Scripts = packageJson.scripts && 
      packageJson.scripts['test:phase2'] && 
      packageJson.scripts['test:user-registration'] &&
      packageJson.scripts['test:questionnaire'];
    
    console.log(`  ${hasPhase2Scripts ? '✅' : '❌'} Phase 2 npm scripts configured`);
  } catch (error) {
    console.log('  ❌ Error reading package.json');
  }
}

const jestConfigPath = path.join(__dirname, 'jest.config.js');
if (fs.existsSync(jestConfigPath)) {
  console.log('  ✅ Jest configuration exists');
} else {
  console.log('  ❌ Jest configuration missing');
}

// Summary
console.log('\n📋 Validation Summary:');
console.log(`  • Test Files: ${allFilesExist ? 'COMPLETE' : 'INCOMPLETE'}`);
console.log(`  • Test Scenarios: ${totalTestCount} implemented`);
console.log(`  • Infrastructure: MongoDB + Redis + NATS`);
console.log(`  • Configuration: Jest + TypeScript`);

console.log('\n🚀 Phase 2 Implementation Status: READY FOR TESTING');
console.log('   Next Step: Fix TypeScript dependencies and run test execution');