/**
 * WebKit Diagnostic Tool
 * 
 * Standalone script to test WebKit browser launch and basic connectivity
 * with detailed connection analysis and server interaction logging
 */

import { webkit } from '@playwright/test';

async function testWebKitConnection() {
  console.log('🌐 Starting WebKit diagnostic test...');
  
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    // Test 1: WebKit Browser Launch
    console.log('📝 Test 1: WebKit browser launch...');
    const startTime = Date.now();
    
    browser = await webkit.launch({
      headless: true,
      timeout: 30000,
      // WebKit-specific launch options for better compatibility
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
    
    const launchTime = Date.now() - startTime;
    console.log(`✅ WebKit launched successfully in ${launchTime}ms`);
    
    // Test 2: Browser Context Creation
    console.log('📝 Test 2: Browser context creation...');
    const contextStartTime = Date.now();
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.1 Safari/537.36',
      // Additional WebKit context options
      ignoreHTTPSErrors: true,
      bypassCSP: true
    });
    
    const contextTime = Date.now() - contextStartTime;
    console.log(`✅ Context created successfully in ${contextTime}ms`);
    
    // Test 3: Page Creation
    console.log('📝 Test 3: Page creation...');
    const pageStartTime = Date.now();
    
    page = await context.newPage();
    
    // Add connection monitoring
    page.on('request', request => {
      console.log(`🌐 WebKit Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`📨 WebKit Response: ${response.status()} ${response.url()}`);
    });
    
    page.on('requestfailed', request => {
      console.log(`❌ WebKit Request Failed: ${request.failure()?.errorText} ${request.url()}`);
    });
    
    const pageTime = Date.now() - pageStartTime;
    console.log(`✅ Page created successfully in ${pageTime}ms`);
    
    // Test 4: Server Health Check (simple request first)
    console.log('📝 Test 4: Server health check...');
    try {
      const healthResponse = await page.goto('http://localhost:4202/health', { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      console.log(`✅ Health check response: ${healthResponse?.status() || 'unknown'}`);
    } catch (error) {
      console.log(`ℹ️ Health check endpoint not available: ${error.message}`);
    }
    
    // Test 5: Basic Navigation with detailed logging
    console.log('📝 Test 5: Basic navigation test...');
    const navStartTime = Date.now();
    
    try {
      console.log('🔄 Attempting navigation to http://localhost:4202/...');
      
      const response = await page.goto('http://localhost:4202/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      const navTime = Date.now() - navStartTime;
      console.log(`✅ Navigation successful in ${navTime}ms`);
      console.log(`📊 Response status: ${response?.status()}`);
      console.log(`📊 Response headers:`, response?.headers());
      
      // Test basic element detection
      const title = await page.title();
      console.log(`📄 Page title: "${title}"`);
      
      // Check for app content
      const bodyText = await page.locator('body').textContent();
      console.log(`📝 Body content length: ${bodyText?.length || 0} characters`);
      
      const appTitle = await page.locator('#app-title').count();
      if (appTitle > 0) {
        const appTitleText = await page.locator('#app-title').textContent();
        console.log(`🎯 App title found: "${appTitleText}"`);
      } else {
        console.log('⚠️ App title element not found');
        
        // Try to find any meaningful content
        const headings = await page.locator('h1, h2, h3').count();
        console.log(`📋 Found ${headings} heading elements`);
        
        if (headings > 0) {
          const firstHeading = await page.locator('h1, h2, h3').first().textContent();
          console.log(`📝 First heading: "${firstHeading}"`);
        }
      }
      
      // Test JavaScript execution
      console.log('📝 Test 6: JavaScript execution...');
      const jsResult = await page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          hasWindow: typeof window !== 'undefined',
          hasDocument: typeof document !== 'undefined',
          documentReady: document.readyState,
          timestamp: new Date().toISOString()
        };
      });
      
      console.log('✅ JavaScript execution successful:', jsResult);
      
    } catch (navError) {
      console.error(`❌ Navigation failed: ${navError.message}`);
      console.error(`   Error type: ${navError.name}`);
      console.error(`   Stack trace: ${navError.stack}`);
      
      // Try to get more information about the connection failure
      if (navError.message.includes('Could not connect')) {
        console.log('🔍 Investigating connection failure...');
        
        // Check if server is responsive at all
        try {
          const testResponse = await fetch('http://localhost:4202/', { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000) 
          });
          console.log(`📊 Direct fetch test: ${testResponse.status}`);
        } catch (fetchError) {
          console.log(`❌ Direct fetch also failed: ${fetchError.message}`);
        }
      }
      
      throw navError;
    }
    
    console.log('🌐 WebKit diagnostic completed successfully!');
    
  } catch (error) {
    console.error(`❌ WebKit diagnostic failed: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    return false;
  } finally {
    // Cleanup with proper error handling
    if (page) {
      try {
        await page.close();
        console.log('🧹 Page closed');
      } catch (e) {
        console.warn('⚠️ Page cleanup error:', e.message);
      }
    }
    
    if (context) {
      try {
        await context.close();
        console.log('🧹 Context closed');
      } catch (e) {
        console.warn('⚠️ Context cleanup error:', e.message);
      }
    }
    
    if (browser) {
      try {
        await browser.close();
        console.log('🧹 Browser closed');
      } catch (e) {
        console.warn('⚠️ Browser cleanup error:', e.message);
      }
    }
  }
  
  return true;
}

// Run diagnostic
testWebKitConnection()
  .then(success => {
    if (success) {
      console.log('✅ All WebKit diagnostic tests passed!');
      process.exit(0);
    } else {
      console.log('❌ WebKit diagnostic failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Diagnostic script crashed:', error);
    process.exit(1);
  });