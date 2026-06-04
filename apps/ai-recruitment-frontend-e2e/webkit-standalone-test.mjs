/**
 * WebKit Standalone Test Runner
 * 
 * Tests WebKit without Playwright's webServer to isolate the server interaction issue
 */

import { webkit } from '@playwright/test';
import { spawn } from 'child_process';
import { E2EMonitoring } from './monitoring-system.mjs';

let devServer = null;
const monitoring = new E2EMonitoring();
const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';
const baseUrlObject = new URL(baseUrl);
const devServerPort = baseUrlObject.port || '80';
const homeUrl = new URL('/', baseUrlObject).toString();
const jobsUrl = new URL('/jobs', baseUrlObject).toString();

async function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting development server manually...');
    
    devServer = spawn('npx', ['nx', 'run', 'ai-recruitment-frontend:serve', '--port', devServerPort], {
      stdio: 'pipe',
      shell: true,
      cwd: process.cwd()
    });
    
    let serverReady = false;
    
    devServer.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('📝 Server:', output.trim());
      
      if (output.includes('Local:') || output.includes(`localhost:${devServerPort}`)) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Development server started successfully');
          
          // Wait a moment for server to fully initialize
          setTimeout(() => resolve(), 3000);
        }
      }
    });
    
    devServer.stderr.on('data', (data) => {
      console.error('⚠️ Server error:', data.toString());
    });
    
    devServer.on('close', (code) => {
      if (!serverReady) {
        reject(new Error(`Server exited with code ${code}`));
      } else {
        console.log(`ℹ️ Server process exited with code ${code}`);
      }
    });
    
    devServer.on('error', (error) => {
      console.error('💥 Server spawn error:', error.message);
      reject(error);
    });
    
    // Timeout after 60 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Server startup timeout'));
      }
    }, 60000);
  });
}

async function stopDevServer() {
  if (devServer) {
    console.log('🛑 Stopping development server...');
    devServer.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise(resolve => {
      devServer.on('close', resolve);
      setTimeout(() => {
        devServer.kill('SIGKILL');
        resolve();
      }, 5000);
    });
    
    devServer = null;
  }
}

async function runWebKitTest() {
  console.log('🌐 Running standalone WebKit test...');
  
  let browser = null;
  let context = null;
  let page = null;
  
  const testResults = {
    browser: 'webkit',
    passed: 0,
    failed: 0,
    duration: 0,
    errors: []
  };
  
  const startTime = Date.now();
  
  try {
    // Launch WebKit browser
    browser = await webkit.launch({
      headless: true,
      timeout: 30000,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--no-first-run'
      ]
    });
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      bypassCSP: true
    });
    
    page = await context.newPage();
    
    // Test 1: Basic Connection
    console.log('📝 Test 1: Basic WebKit connection...');
    try {
        await page.goto(homeUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      const title = await page.title();
      if (title.includes('AI Recruitment')) {
        console.log('✅ Test 1 passed - Basic connection successful');
        testResults.passed++;
      } else {
        throw new Error(`Unexpected page title: ${title}`);
      }
    } catch (error) {
      console.log('❌ Test 1 failed:', error.message);
      testResults.failed++;
      testResults.errors.push(`Test 1: ${error.message}`);
    }
    
    // Test 2: JavaScript Execution
    console.log('📝 Test 2: JavaScript execution...');
    try {
      const jsResult = await page.evaluate(() => {
        return {
          hasDocument: typeof document !== 'undefined',
          hasWindow: typeof window !== 'undefined',
          title: document.title,
          readyState: document.readyState
        };
      });
      
      if (jsResult.hasDocument && jsResult.hasWindow && jsResult.title.includes('AI Recruitment')) {
        console.log('✅ Test 2 passed - JavaScript execution successful');
        testResults.passed++;
      } else {
        throw new Error('JavaScript execution validation failed');
      }
    } catch (error) {
      console.log('❌ Test 2 failed:', error.message);
      testResults.failed++;
      testResults.errors.push(`Test 2: ${error.message}`);
    }
    
    // Test 3: Navigation
    console.log('📝 Test 3: Navigation test...');
    try {
      await page.goto(jobsUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      const url = page.url();
      if (url.includes('/jobs')) {
        console.log('✅ Test 3 passed - Navigation successful');
        testResults.passed++;
      } else {
        throw new Error(`Navigation failed - URL: ${url}`);
      }
    } catch (error) {
      console.log('❌ Test 3 failed:', error.message);
      testResults.failed++;
      testResults.errors.push(`Test 3: ${error.message}`);
    }
    
    testResults.duration = Date.now() - startTime;
    console.log('\n🎯 WebKit Standalone Test Results:');
    console.log(`   ✅ Passed: ${testResults.passed}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   ⏱️ Duration: ${Math.round(testResults.duration / 1000)}s`);
    
  } catch (error) {
    console.error('💥 WebKit test failed:', error.message);
    testResults.failed++;
    testResults.errors.push(`General failure: ${error.message}`);
  } finally {
    // Cleanup
    if (page) {
      await page.close().catch((error) =>
        console.warn('Page cleanup failed:', error.message),
      );
    }
    if (context) {
      await context.close().catch((error) =>
        console.warn('Context cleanup failed:', error.message),
      );
    }
    if (browser) {
      await browser.close().catch((error) =>
        console.warn('Browser cleanup failed:', error.message),
      );
    }
  }
  
  return testResults;
}

async function main() {
  console.log('🚀 Starting WebKit standalone test suite...');
  
  try {
    // Start development server manually
    await startDevServer();
    
    // Run WebKit tests
    const results = await runWebKitTest();
    
    // Record results in monitoring system
    monitoring.recordTestExecution([results]);
    
    // Stop server
    await stopDevServer();
    
    // Exit with appropriate code
    process.exit(results.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Standalone test suite failed:', error.message);
    
    try {
      await stopDevServer();
    } catch (stopError) {
      console.error('💥 Server stop error:', stopError.message);
    }
    
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('⚡ Received SIGTERM, shutting down...');
  await stopDevServer();
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('⚡ Received SIGINT, shutting down...');
  await stopDevServer();
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
