/**
 * Optimized Test Runner
 * 
 * Enhanced test execution with browser-specific optimizations and retry logic
 */

import { spawn } from 'child_process';
import { cleanup } from './cleanup-ports.mjs';
// waitForServerReady is available from browser-stability.ts if needed

// Test execution configuration
const TEST_CONFIG = {
  browsers: ['chromium', 'firefox', 'webkit'],
  timeout: 90000, // 90 seconds per browser
  retries: 2,
  serverWaitTime: 30000, // Wait for server startup
  betweenBrowserDelay: 5000, // Delay between browser tests
  serverRestartDelay: 10000 // Delay for server restart
};

// Browser-specific optimizations
const BROWSER_OPTIMIZATIONS = {
  chromium: {
    flags: ['--disable-dev-shm-usage', '--no-sandbox'],
    timeout: 60000
  },
  firefox: {
    flags: ['--headless'],
    timeout: 90000
  },
  webkit: {
    flags: ['--disable-web-security'],
    timeout: 120000, // Extra time for WebKit
    sequentialOnly: true // Run WebKit tests sequentially
  }
};

/**
 * Execute tests for a specific browser with retry logic
 */
async function runBrowserTests(browser, testFile = 'browser-compatibility-test.spec.ts') {
  console.log(`\n🌐 Starting ${browser} test execution...`);
  
  const config = BROWSER_OPTIMIZATIONS[browser] || {};
  const timeout = config.timeout || TEST_CONFIG.timeout;
  
  for (let attempt = 1; attempt <= TEST_CONFIG.retries + 1; attempt++) {
    try {
      console.log(`📝 ${browser} test attempt ${attempt}/${TEST_CONFIG.retries + 1}`);
      
      // Pre-test cleanup and server health check
      await cleanup();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Execute Playwright test for specific browser
      const result = await runPlaywrightTest(browser, testFile, timeout);
      
      if (result.success) {
        console.log(`✅ ${browser} tests completed successfully`);
        return result;
      } else {
        console.log(`⚠️ ${browser} test attempt ${attempt} had issues`);
        if (attempt <= TEST_CONFIG.retries) {
          console.log(`🔄 Retrying ${browser} tests after delay...`);
          await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.betweenBrowserDelay));
        }
      }
      
    } catch (error) {
      console.error(`❌ ${browser} test attempt ${attempt} failed: ${error.message}`);
      if (attempt <= TEST_CONFIG.retries) {
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.betweenBrowserDelay));
      }
    }
  }
  
  console.log(`❌ ${browser} tests failed after all retries`);
  return { success: false, browser, error: 'Max retries exceeded' };
}

/**
 * Execute Playwright test command
 */
function runPlaywrightTest(browser, testFile, timeout) {
  return new Promise((resolve) => {
    const args = [
      'playwright', 'test', testFile,
      '--project=' + browser,
      '--reporter=line',
      '--timeout=' + timeout
    ];
    
    console.log(`🚀 Executing: npx ${args.join(' ')}`);
    
    const process = spawn('npx', args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });
    
    let completed = false;
    
    // Set overall timeout for the test execution
    const timeoutId = setTimeout(() => {
      if (!completed) {
        completed = true;
        console.log(`⏰ ${browser} tests timed out after ${timeout}ms`);
        process.kill('SIGKILL');
        resolve({ success: false, browser, error: 'Timeout' });
      }
    }, timeout + 10000); // Add 10s buffer
    
    process.on('close', (code) => {
      if (!completed) {
        completed = true;
        clearTimeout(timeoutId);
        
        const success = code === 0;
        console.log(`🏁 ${browser} tests finished with exit code: ${code}`);
        
        resolve({ 
          success, 
          browser, 
          exitCode: code,
          error: success ? null : `Exit code ${code}`
        });
      }
    });
    
    process.on('error', (error) => {
      if (!completed) {
        completed = true;
        clearTimeout(timeoutId);
        
        console.error(`💥 ${browser} test process error: ${error.message}`);
        resolve({ success: false, browser, error: error.message });
      }
    });
  });
}

/**
 * Main test execution orchestrator
 */
async function runOptimizedTests() {
  console.log('🚀 Starting optimized cross-browser test execution...');
  console.log('📋 Configuration:', TEST_CONFIG);
  
  const results = [];
  const totalStartTime = Date.now();
  
  // Initial cleanup
  console.log('🧹 Performing initial cleanup...');
  await cleanup();
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  for (const browser of TEST_CONFIG.browsers) {
    const browserStartTime = Date.now();
    
    try {
      // Special handling for WebKit (sequential execution)
      if (browser === 'webkit') {
        console.log('🌐 WebKit detected - using sequential execution mode');
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.serverRestartDelay));
      }
      
      const result = await runBrowserTests(browser);
      result.duration = Date.now() - browserStartTime;
      
      results.push(result);
      
      // Delay between browsers to prevent resource conflicts
      if (browser !== TEST_CONFIG.browsers[TEST_CONFIG.browsers.length - 1]) {
        console.log(`⏳ Waiting ${TEST_CONFIG.betweenBrowserDelay}ms before next browser...`);
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.betweenBrowserDelay));
      }
      
    } catch (error) {
      console.error(`💥 Unexpected error testing ${browser}: ${error.message}`);
      results.push({
        success: false,
        browser,
        error: error.message,
        duration: Date.now() - browserStartTime
      });
    }
  }
  
  // Final cleanup
  console.log('🧹 Performing final cleanup...');
  await cleanup();
  
  // Generate report
  const totalDuration = Date.now() - totalStartTime;
  generateTestReport(results, totalDuration);
  
  return results;
}

/**
 * Generate comprehensive test report
 */
function generateTestReport(results, totalDuration) {
  console.log('\n📊 TEST EXECUTION REPORT');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`📈 Total Duration: ${Math.round(totalDuration / 1000)}s`);
  console.log(`✅ Successful: ${successful.length}/${results.length} browsers`);
  console.log(`❌ Failed: ${failed.length}/${results.length} browsers`);
  console.log(`📊 Success Rate: ${Math.round((successful.length / results.length) * 100)}%`);
  
  console.log('\n🌐 Browser Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? `${Math.round(result.duration / 1000)}s` : 'N/A';
    const error = result.error ? ` (${result.error})` : '';
    console.log(`  ${status} ${result.browser.padEnd(10)} - ${duration}${error}`);
  });
  
  if (failed.length > 0) {
    console.log('\n⚠️ Failed Browser Details:');
    failed.forEach(result => {
      console.log(`  • ${result.browser}: ${result.error}`);
    });
  }
  
  console.log('\n💡 Optimization Recommendations:');
  if (failed.some(r => r.browser === 'webkit')) {
    console.log('  • WebKit stability issues detected - consider running WebKit tests separately');
  }
  if (results.some(r => r.duration > 60000)) {
    console.log('  • Long execution times detected - consider timeout optimizations');
  }
  if (failed.length > 1) {
    console.log('  • Multiple browser failures - check server stability and resource allocation');
  }
  
  console.log('\n========================');
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runOptimizedTests()
    .then(results => {
      const allSuccessful = results.every(r => r.success);
      process.exit(allSuccessful ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Optimized test runner crashed:', error);
      process.exit(1);
    });
}

export { runOptimizedTests, runBrowserTests };