/**
 * Firefox Diagnostic Tool
 * 
 * Standalone script to test Firefox browser launch and basic connectivity
 * outside of the full Playwright test suite
 */

import { firefox } from '@playwright/test';

async function testFirefoxLaunch() {
  console.log('🦊 Starting Firefox diagnostic test...');
  
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    // Test 1: Firefox Browser Launch
    console.log('📝 Test 1: Firefox browser launch...');
    const startTime = Date.now();
    
    browser = await firefox.launch({
      headless: true,
      timeout: 30000,
      firefoxUserPrefs: {
        'network.http.connection-timeout': 60,
        'browser.safebrowsing.enabled': false,
        'extensions.autoDisableScopes': 14
      }
    });
    
    const launchTime = Date.now() - startTime;
    console.log(`✅ Firefox launched successfully in ${launchTime}ms`);
    
    // Test 2: Browser Context Creation
    console.log('📝 Test 2: Browser context creation...');
    const contextStartTime = Date.now();
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
    });
    
    const contextTime = Date.now() - contextStartTime;
    console.log(`✅ Context created successfully in ${contextTime}ms`);
    
    // Test 3: Page Creation
    console.log('📝 Test 3: Page creation...');
    const pageStartTime = Date.now();
    
    page = await context.newPage();
    
    const pageTime = Date.now() - pageStartTime;
    console.log(`✅ Page created successfully in ${pageTime}ms`);
    
    // Test 4: Basic Navigation
    console.log('📝 Test 4: Basic navigation test...');
    const navStartTime = Date.now();
    
    try {
      await page.goto('http://localhost:4202/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      const navTime = Date.now() - navStartTime;
      console.log(`✅ Navigation successful in ${navTime}ms`);
      
      // Test basic element detection
      const title = await page.title();
      console.log(`📄 Page title: "${title}"`);
      
      const appTitle = await page.locator('#app-title').count();
      if (appTitle > 0) {
        const appTitleText = await page.locator('#app-title').textContent();
        console.log(`🎯 App title found: "${appTitleText}"`);
      } else {
        console.log('⚠️ App title element not found');
      }
      
    } catch (navError) {
      console.error(`❌ Navigation failed: ${navError.message}`);
    }
    
    console.log('🦊 Firefox diagnostic completed successfully!');
    
  } catch (error) {
    console.error(`❌ Firefox diagnostic failed: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    return false;
  } finally {
    // Cleanup
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
testFirefoxLaunch()
  .then(success => {
    if (success) {
      console.log('✅ All Firefox diagnostic tests passed!');
      process.exit(0);
    } else {
      console.log('❌ Firefox diagnostic failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Diagnostic script crashed:', error);
    process.exit(1);
  });