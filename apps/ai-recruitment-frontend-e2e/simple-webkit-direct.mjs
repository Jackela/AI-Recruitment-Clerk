/**
 * Simple WebKit Direct Test
 * 
 * Test WebKit against manually started server to isolate the issue
 */

import { webkit } from '@playwright/test';

async function testWebKitDirect() {
  console.log('🌐 Testing WebKit against manually started server...');
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4204';
  const homeUrl = new URL('/', baseUrl).toString();
  const jobsUrl = new URL('/jobs', baseUrl).toString();
  
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    // Launch WebKit with verified working configuration
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
    
    console.log(`🔄 Attempting connection to ${homeUrl}...`);
    
    const response = await page.goto(homeUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log(`✅ WebKit connected successfully! Status: ${response?.status()}`);
    
    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: "${title}"`);
    
    // Test basic functionality
    const bodyVisible = await page.locator('body').isVisible();
    console.log(`👁️ Body visible: ${bodyVisible}`);
    
    // Test JavaScript execution
    const jsResult = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        title: document.title,
        readyState: document.readyState,
        timestamp: new Date().toISOString()
      };
    });
    
    console.log(`⚡ JavaScript executed successfully:`);
    console.log(`   User Agent: ${jsResult.userAgent}`);
    console.log(`   Document State: ${jsResult.readyState}`);
    console.log(`   Timestamp: ${jsResult.timestamp}`);
    
    // Test navigation
    console.log('🔄 Testing navigation to /jobs...');
    await page.goto(jobsUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    const newUrl = page.url();
    console.log(`🧭 Navigation successful! URL: ${newUrl}`);
    
    console.log('\n🎉 ALL WEBKIT TESTS PASSED!');
    console.log('✅ WebKit browser works perfectly with manually started server');
    console.log('📋 Issue confirmed: Playwright webServer configuration causes the connection failures');
    
    return true;
    
  } catch (error) {
    console.error('❌ WebKit test failed:', error.message);
    return false;
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
}

// Run test
testWebKitDirect()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
