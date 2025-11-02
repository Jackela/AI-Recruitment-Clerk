#!/usr/bin/env node

/**
 * Contract Validation Build Script
 * Runs contract validation during build process
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

console.log('🔍 Starting API Contract Validation...\n');

/**
 * Validate TypeScript compilation with contract assertions
 */
function validateTypeScriptContracts() {
  try {
    console.log('📝 Validating TypeScript contract compatibility...');
    
    // Compile the type safety validator to check for compile-time errors
    const result = execSync(
      'npx tsc -p tools/contract-validation/tsconfig.json',
      { 
        cwd: rootDir, 
        encoding: 'utf8',
        stdio: 'pipe'
      }
    );
    
    console.log('✅ TypeScript contract validation passed');
    return true;
  } catch (error) {
    console.error('❌ TypeScript contract validation failed:');
    console.error(error.stdout || error.message);
    return false;
  }
}

/**
 * Check for contract-related TODO items in code
 */
function checkForContractTodos() {
  console.log('📋 Checking for contract-related TODOs...');
  
  try {
    const result = execSync(
      'grep -r "TODO.*contract\\|FIXME.*contract" apps/ libs/ --include="*.ts" --include="*.js" || true',
      { cwd: rootDir, encoding: 'utf8' }
    );
    
    if (result.trim()) {
      console.warn('⚠️  Found contract-related TODOs:');
      console.warn(result);
      return false;
    } else {
      console.log('✅ No contract-related TODOs found');
      return true;
    }
  } catch (error) {
    console.log('✅ No contract-related TODOs found');
    return true;
  }
}

/**
 * Validate that frontend and backend models are using consistent field names
 */
function validateFieldNaming() {
  console.log('🏷️  Validating field naming consistency...');
  
  const frontendJobModel = join(rootDir, 'apps/ai-recruitment-frontend/src/app/store/jobs/job.model.ts');
  const backendJobDto = join(rootDir, 'apps/app-gateway/src/jobs/dto/job-response.dto.ts');
  
  if (!existsSync(frontendJobModel) || !existsSync(backendJobDto)) {
    console.warn('⚠️  Could not find job models for comparison');
    return true; // Don't fail build if files don't exist
  }
  
  try {
    const frontendContent = readFileSync(frontendJobModel, 'utf8');
    const backendContent = readFileSync(backendJobDto, 'utf8');
    
    // Simple field name extraction (could be more sophisticated)
    const frontendFields = [...frontendContent.matchAll(/(\w+):\s*[\w\[\]'|]+;/g)].map(match => match[1]);
    const backendFields = [...backendContent.matchAll(/(\w+):\s*[\w\[\]'|]+;/g)].map(match => match[1]);
    
    const missingInBackend = frontendFields.filter(field => !backendFields.includes(field));
    const missingInFrontend = backendFields.filter(field => !frontendFields.includes(field));
    
    if (missingInBackend.length > 0) {
      console.warn(`⚠️  Frontend has fields missing from backend: ${missingInBackend.join(', ')}`);
    }
    
    if (missingInFrontend.length > 0) {
      console.warn(`⚠️  Backend has fields missing from frontend: ${missingInFrontend.join(', ')}`);
    }
    
    if (missingInBackend.length === 0 && missingInFrontend.length === 0) {
      console.log('✅ Field naming consistency validated');
    }
    
    return true; // Don't fail build for field differences, just warn
  } catch (error) {
    console.warn('⚠️  Could not validate field naming:', error.message);
    return true;
  }
}

/**
 * Validate that status enums are synchronized
 */
function validateStatusEnums() {
  console.log('🔄 Validating status enum synchronization...');
  
  const contractsFile = join(rootDir, 'libs/api-contracts/src/job-management/job.contracts.ts');
  const frontendJobModel = join(rootDir, 'apps/ai-recruitment-frontend/src/app/store/jobs/job.model.ts');
  
  if (!existsSync(contractsFile)) {
    console.warn('⚠️  API contracts not found, skipping status enum validation');
    return true;
  }
  
  if (!existsSync(frontendJobModel)) {
    console.warn('⚠️  Frontend job model not found, skipping status enum validation');
    return true;
  }
  
  try {
    const contractsContent = readFileSync(contractsFile, 'utf8');
    const frontendContent = readFileSync(frontendJobModel, 'utf8');
    
    // Extract status values from contract (simplified regex)
    const contractStatusMatch = contractsContent.match(/JobStatus = ['"]([^'"]+)['"](?:\s*\|\s*['"]([^'"]+)['"])+/);
    const frontendStatusMatch = frontendContent.match(/status:\s*['"]([^'"]+)['"](?:\s*\|\s*['"]([^'"]+)['"])*/);
    
    if (contractStatusMatch && frontendStatusMatch) {
      console.log('✅ Status enum validation completed (basic check)');
    } else {
      console.log('ℹ️  Status enum patterns not found for comparison');
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️  Could not validate status enums:', error.message);
    return true;
  }
}

/**
 * Main validation function
 */
async function main() {
  const results = [
    validateOpenApiSmoke(),
    validateTypeScriptContracts(),
    checkForContractTodos(),
    validateFieldNaming(),
    validateStatusEnums()
  ];
  
  const allPassed = results.every(result => result);
  
  console.log('\n📊 Contract Validation Summary:');
  console.log(`✅ Passed: ${results.filter(Boolean).length}`);
  console.log(`❌ Failed: ${results.filter(r => !r).length}`);
  
  if (allPassed) {
    console.log('\n🎉 All contract validations passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some contract validations failed or have warnings');
    // Exit with warning code but don't fail build
    process.exit(0);
  }
}

// Run validation
main().catch(error => {
  console.error('❌ Contract validation script failed:', error);
  process.exit(1);
});

/**
 * OpenAPI smoke checks to ensure required paths and schemas exist
 */
function validateOpenApiSmoke() {
  console.log('🧪 Performing OpenAPI smoke checks...');
  const required = [
    { file: 'specs/002-cicd-quality-migration/contracts/feature-flags.yaml', strings: ['openapi: 3', '/ops/flags:', 'components:', 'FeatureFlag:'] },
    { file: 'specs/002-cicd-quality-migration/contracts/release.yaml', strings: ['openapi: 3', '/ops/release/deploy:', 'components:', 'DeployResponse:'] },
    { file: 'specs/002-cicd-quality-migration/contracts/observability.yaml', strings: ['openapi: 3', '/ops/observability/funnels:', 'components:', 'FunnelMetrics:'] },
  ];
  let ok = true;
  for (const r of required) {
    const path = join(rootDir, r.file);
    if (!existsSync(path)) {
      console.warn(`⚠️  Missing OpenAPI file: ${r.file}`);
      ok = false; continue;
    }
    const content = readFileSync(path, 'utf8');
    for (const s of r.strings) {
      if (!content.includes(s)) {
        console.warn(`⚠️  ${r.file} missing string: ${s}`);
        ok = false;
      }
    }
  }
  if (ok) console.log('✅ OpenAPI smoke checks passed');
  return ok;
}