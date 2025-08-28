#!/usr/bin/env node

/**
 * WebKit E2E Test Runner
 * 
 * Automates WebKit testing with static build to bypass dev server issues
 * This script handles the full workflow:
 * 1. Build production static files
 * 2. Start static server
 * 3. Run WebKit tests
 * 4. Clean up
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

let staticServer = null;
let testProcess = null;

const STATIC_PORT = 4204;
const BUILD_DIR = 'dist/apps/ai-recruitment-frontend/browser';
const TEST_CONFIG = 'apps/ai-recruitment-frontend-e2e/playwright-webkit-static.config.ts';

async function checkBuildExists() {
  try {
    await fs.access(BUILD_DIR);
    const stats = await fs.stat(BUILD_DIR);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function buildStaticFiles() {
  console.log('📦 Building static files for WebKit testing...');
  
  return new Promise((resolve, reject) => {
    const buildProcess = spawn('npx', ['nx', 'build', 'ai-recruitment-frontend', '--configuration=webkit-test'], {
      stdio: 'pipe',
      shell: true
    });

    let buildOutput = '';
    
    buildProcess.stdout.on('data', (data) => {
      const output = data.toString();
      buildOutput += output;
      
      if (output.includes('Application bundle generation complete')) {
        console.log('✅ Static build completed successfully');
      }
    });

    buildProcess.stderr.on('data', (data) => {
      console.error('Build error:', data.toString());
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });

    buildProcess.on('error', (error) => {
      reject(new Error(`Build process error: ${error.message}`));
    });
  });
}

async function startStaticServer() {
  console.log(`🚀 Starting static server on port ${STATIC_PORT}...`);
  
  return new Promise((resolve, reject) => {
    staticServer = spawn('npx', ['serve', '-s', BUILD_DIR, '-l', STATIC_PORT.toString()], {
      stdio: 'pipe',
      shell: true
    });

    let serverReady = false;

    staticServer.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('📝 Server:', output.trim());
      
      if (output.includes(`Accepting connections at http://localhost:${STATIC_PORT}`) || 
          output.includes('INFO') && output.includes(`${STATIC_PORT}`)) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Static server started successfully');
          setTimeout(resolve, 2000); // Give server time to fully initialize
        }
      }
    });

    staticServer.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    staticServer.on('close', (code) => {
      if (!serverReady) {
        reject(new Error(`Server exited with code ${code}`));
      } else {
        console.log(`ℹ️ Server process exited with code ${code}`);
      }
    });

    staticServer.on('error', (error) => {
      reject(new Error(`Server spawn error: ${error.message}`));
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}

async function runWebKitTests() {
  console.log('🧪 Running WebKit E2E tests...');
  
  return new Promise((resolve, reject) => {
    testProcess = spawn('npx', [
      'playwright', 'test', 
      '--config=' + TEST_CONFIG,
      'webkit-static-test.spec.ts',
      '--project=webkit-static'
    ], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ All WebKit tests passed!');
        resolve();
      } else {
        reject(new Error(`WebKit tests failed with code ${code}`));
      }
    });

    testProcess.on('error', (error) => {
      reject(new Error(`Test process error: ${error.message}`));
    });
  });
}

async function stopStaticServer() {
  if (staticServer) {
    console.log('🛑 Stopping static server...');
    staticServer.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise(resolve => {
      staticServer.on('close', resolve);
      setTimeout(() => {
        staticServer.kill('SIGKILL');
        resolve();
      }, 5000);
    });
    
    staticServer = null;
  }
}

async function cleanup() {
  if (testProcess) {
    testProcess.kill('SIGTERM');
    testProcess = null;
  }
  await stopStaticServer();
}

async function main() {
  console.log('🌐 Starting WebKit E2E Test Suite...');
  
  try {
    // Check if build exists, build if not
    const buildExists = await checkBuildExists();
    if (!buildExists) {
      await buildStaticFiles();
    } else {
      console.log('✅ Using existing static build');
    }

    // Start static server
    await startStaticServer();

    // Run WebKit tests
    await runWebKitTests();

    console.log('🎉 WebKit E2E test suite completed successfully!');
    console.log('📊 Result: All WebKit tests passed using static build approach');
    
  } catch (error) {
    console.error('❌ WebKit test suite failed:', error.message);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

// Handle process termination
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('exit', cleanup);

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}