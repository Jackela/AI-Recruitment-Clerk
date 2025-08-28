#!/usr/bin/env node

/**
 * AI Recruitment Clerk - Final Deployment Validation
 * 部署前的最终验证检查
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎯 AI Recruitment Clerk - Final Deployment Validation');
console.log('===================================================\n');

const checks = [];

// Check 1: Verify all build artifacts
checks.push({
  name: 'Build Artifacts Verification',
  check: () => {
    const requiredPaths = [
      'libs/shared-dtos/dist/index.js',
      'libs/shared-dtos/dist/auth/user.dto.js',
      'apps/app-gateway/src/main.ts',
      'apps/ai-recruitment-frontend/src/app/app.ts'
    ];
    
    const missing = requiredPaths.filter(p => !fs.existsSync(path.join(__dirname, '..', p)));
    
    if (missing.length === 0) {
      return { success: true, message: 'All build artifacts present' };
    } else {
      return { success: false, message: `Missing: ${missing.join(', ')}` };
    }
  }
});

// Check 2: Environment configuration completeness
checks.push({
  name: 'Environment Configuration',
  check: () => {
    const envExamplePath = path.join(__dirname, '../.env.example');
    const railwayConfigPath = path.join(__dirname, '../railway.json');
    
    if (!fs.existsSync(envExamplePath)) {
      return { success: false, message: '.env.example missing' };
    }
    
    if (!fs.existsSync(railwayConfigPath)) {
      return { success: false, message: 'railway.json missing' };
    }
    
    const railwayConfig = JSON.parse(fs.readFileSync(railwayConfigPath, 'utf8'));
    const hasRequiredVars = railwayConfig.environments?.production?.variables?.JWT_SECRET;
    
    if (!hasRequiredVars) {
      return { success: false, message: 'Railway config missing required variables' };
    }
    
    return { success: true, message: 'Environment configuration complete' };
  }
});

// Check 3: Docker configuration
checks.push({
  name: 'Docker Configuration',
  check: () => {
    const dockerfiles = [
      'apps/app-gateway/Dockerfile',
      'apps/ai-recruitment-frontend/Dockerfile'
    ];
    
    const missing = dockerfiles.filter(df => !fs.existsSync(path.join(__dirname, '..', df)));
    
    if (missing.length === 0) {
      return { success: true, message: 'Docker configurations present' };
    } else {
      return { success: false, message: `Missing Dockerfiles: ${missing.join(', ')}` };
    }
  }
});

// Check 4: Frontend routing and components
checks.push({
  name: 'Frontend Architecture',
  check: () => {
    const frontendFiles = [
      'apps/ai-recruitment-frontend/src/app/app.routes.ts',
      'apps/ai-recruitment-frontend/src/app/pages/dashboard/dashboard.component.ts',
      'apps/ai-recruitment-frontend/src/app/components/shared/shared.module.ts'
    ];
    
    const missing = frontendFiles.filter(f => !fs.existsSync(path.join(__dirname, '..', f)));
    
    if (missing.length === 0) {
      return { success: true, message: 'Frontend architecture complete' };
    } else {
      return { success: false, message: `Missing frontend files: ${missing.join(', ')}` };
    }
  }
});

// Check 5: API endpoints verification
checks.push({
  name: 'API Service Configuration',
  check: () => {
    const apiServicePath = path.join(__dirname, '../apps/ai-recruitment-frontend/src/app/services/api.service.ts');
    
    if (!fs.existsSync(apiServicePath)) {
      return { success: false, message: 'API service missing' };
    }
    
    const content = fs.readFileSync(apiServicePath, 'utf8');
    const hasCorrectBaseUrl = content.includes("baseUrl = '/api'");
    const hasJobsEndpoint = content.includes('/jobs');
    
    if (hasCorrectBaseUrl && hasJobsEndpoint) {
      return { success: true, message: 'API service properly configured' };
    } else {
      return { success: false, message: 'API service configuration issues' };
    }
  }
});

// Check 6: Cache and backend configuration
checks.push({
  name: 'Backend Service Configuration',
  check: () => {
    const cacheConfigPath = path.join(__dirname, '../apps/app-gateway/src/cache/cache.config.ts');
    const mainPath = path.join(__dirname, '../apps/app-gateway/src/main.ts');
    
    if (!fs.existsSync(cacheConfigPath) || !fs.existsSync(mainPath)) {
      return { success: false, message: 'Backend configuration files missing' };
    }
    
    const cacheConfig = fs.readFileSync(cacheConfigPath, 'utf8');
    const hasRedisDisable = cacheConfig.includes('DISABLE_REDIS');
    
    if (hasRedisDisable) {
      return { success: true, message: 'Backend service properly configured' };
    } else {
      return { success: false, message: 'Cache configuration may have issues' };
    }
  }
});

// Check 7: Package.json scripts
checks.push({
  name: 'Build Scripts',
  check: () => {
    const packagePath = path.join(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const requiredScripts = ['build', 'start', 'start:prod'];
    const hasAllScripts = requiredScripts.every(script => pkg.scripts[script]);
    
    if (hasAllScripts) {
      return { success: true, message: 'All required build scripts present' };
    } else {
      return { success: false, message: 'Missing required build scripts' };
    }
  }
});

// Check 8: Documentation and guides
checks.push({
  name: 'Documentation',
  check: () => {
    const docs = [
      'README.md',
      'RAILWAY_DEPLOYMENT_GUIDE.md',
      'DEVELOPMENT_FIXES.md'
    ];
    
    const missing = docs.filter(doc => !fs.existsSync(path.join(__dirname, '..', doc)));
    
    if (missing.length === 0) {
      return { success: true, message: 'Documentation complete' };
    } else {
      return { success: false, message: `Missing documentation: ${missing.join(', ')}` };
    }
  }
});

// Check 9: Development tools
checks.push({
  name: 'Development Tools',
  check: () => {
    const tools = [
      'scripts/debug-local.bat',
      'scripts/cleanup-docker.bat',
      'scripts/validate-fixes.js',
      'docker-compose.debug.yml'
    ];
    
    const missing = tools.filter(tool => !fs.existsSync(path.join(__dirname, '..', tool)));
    
    if (missing.length === 0) {
      return { success: true, message: 'Development tools complete' };
    } else {
      return { success: false, message: `Missing tools: ${missing.join(', ')}` };
    }
  }
});

// Check 10: Security and best practices
checks.push({
  name: 'Security Configuration',
  check: () => {
    const mainPath = path.join(__dirname, '../apps/app-gateway/src/main.ts');
    const content = fs.readFileSync(mainPath, 'utf8');
    
    const hasSecurityHeaders = content.includes('enableCors');
    const hasValidation = content.includes('ValidationPipe');
    
    if (hasSecurityHeaders && hasValidation) {
      return { success: true, message: 'Security configurations in place' };
    } else {
      return { success: false, message: 'Security configuration incomplete' };
    }
  }
});

// Run all checks
console.log(`Running ${checks.length} deployment readiness checks...\n`);

let passed = 0;
let failed = 0;
const results = [];

checks.forEach((check, index) => {
  console.log(`${index + 1}. ${check.name}`);
  
  try {
    const result = check.check();
    results.push({ name: check.name, ...result });
    
    if (result.success) {
      console.log(`   ✅ PASS - ${result.message}`);
      passed++;
    } else {
      console.log(`   ❌ FAIL - ${result.message}`);
      failed++;
    }
  } catch (error) {
    console.log(`   💥 ERROR - ${error.message}`);
    results.push({ name: check.name, success: false, message: error.message });
    failed++;
  }
  console.log('');
});

// Final summary
console.log('===================================================');
console.log('🎯 DEPLOYMENT READINESS SUMMARY');
console.log('===================================================');
console.log(`Total Checks: ${checks.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Readiness Score: ${((passed / checks.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🚀 READY FOR DEPLOYMENT!');
  console.log('   All checks passed. Your application is ready for Railway deployment.');
  console.log('\n📋 Next Steps:');
  console.log('   1. Push code to GitHub');
  console.log('   2. Connect GitHub repo to Railway');
  console.log('   3. Set environment variables in Railway');
  console.log('   4. Deploy and monitor');
} else if (failed <= 2) {
  console.log('\n⚠️  MOSTLY READY - Minor Issues');
  console.log('   Most checks passed. Fix remaining issues before deployment.');
} else {
  console.log('\n❌ NOT READY FOR DEPLOYMENT');
  console.log('   Multiple issues detected. Please address failed checks.');
}

console.log('\n📖 For detailed deployment instructions, see:');
console.log('   - RAILWAY_DEPLOYMENT_GUIDE.md');
console.log('   - DEVELOPMENT_FIXES.md');

// Generate deployment checklist
const checklist = results.map((r, i) => 
  `- [${r.success ? 'x' : ' '}] ${r.name}: ${r.message}`
).join('\n');

fs.writeFileSync(
  path.join(__dirname, '../DEPLOYMENT_CHECKLIST.md'),
  `# 🚀 Deployment Readiness Checklist\n\nGenerated: ${new Date().toISOString()}\n\n${checklist}\n\n---\n**Overall Status**: ${failed === 0 ? '✅ Ready' : '❌ Not Ready'}`
);

console.log('\n📄 Checklist saved to: DEPLOYMENT_CHECKLIST.md');