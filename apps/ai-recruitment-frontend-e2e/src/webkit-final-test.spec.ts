/**
 * WebKit Final Test Suite
 * 
 * Complete WebKit test suite using external server configuration
 */

import { test, expect } from '@playwright/test';

test.describe('WebKit Complete Test Suite', () => {
  
  test('WebKit can establish basic connection', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');
    
    console.log('🔌 Testing WebKit basic connection...');
    
    await page.goto('/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Verify basic page load
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    // Check page title
    const title = await page.title();
    expect(title).toContain('AI Recruitment');
    
    console.log(`✅ WebKit basic connection successful - "${title}"`);
  });
  
  test('WebKit can load application elements', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');
    
    console.log('📄 Testing WebKit application loading...');
    
    await page.goto('/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Check for app title with fallback
    const appTitleExists = await page.locator('#app-title').count() > 0;
    if (appTitleExists) {
      await expect(page.locator('#app-title')).toBeVisible({ timeout: 15000 });
      const appTitleText = await page.locator('#app-title').textContent();
      expect(appTitleText).toContain('AI Recruitment');
      console.log(`✅ WebKit app title found: "${appTitleText}"`);
    } else {
      // Fallback: check for any meaningful content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
      expect(bodyText.length).toBeGreaterThan(100);
      console.log('✅ WebKit meaningful content detected (title fallback)');
    }
  });
  
  test('WebKit supports JavaScript execution', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');
    
    console.log('⚡ Testing WebKit JavaScript execution...');
    
    await page.goto('/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    
    // Execute JavaScript - proven working approach
    const result = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        hasConsole: typeof console !== 'undefined',
        title: document.title,
        documentReady: document.readyState,
        timestamp: new Date().toISOString()
      };
    });
    
    // Validate JavaScript functionality
    expect(result.hasDocument).toBe(true);
    expect(result.hasConsole).toBe(true);
    expect(result.hasWindow).toBe(true);
    expect(result.title).toContain('AI Recruitment');
    expect(['loading', 'interactive', 'complete']).toContain(result.documentReady);
    
    console.log(`✅ WebKit JavaScript execution successful`);
    console.log(`   Document State: ${result.documentReady}`);
    console.log(`   User Agent: ${result.userAgent}`);
  });
  
  test('WebKit handles navigation', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');
    
    console.log('🧭 Testing WebKit navigation...');
    
    // Start from home
    await page.goto('/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Verify initial page loaded
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    // Navigate to /jobs
    console.log('🔄 Testing WebKit navigation to /jobs...');
    
    await page.goto('/jobs', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Verify navigation worked
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    
    // Check URL
    const currentUrl = page.url();
    expect(currentUrl).toContain('/jobs');
    
    console.log(`✅ WebKit navigation successful to ${currentUrl}`);
  });
  
  test('WebKit can handle multiple page loads', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');
    
    console.log('🔄 Testing WebKit stability with multiple loads...');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`🔄 WebKit load test ${i}/3`);
      
      await page.goto('/', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Verify each load
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
      
      const title = await page.title();
      expect(title).toContain('AI Recruitment');
      
      console.log(`✅ WebKit load test ${i}/3 passed`);
      
      // Brief pause between loads
      if (i < 3) {
        await page.waitForTimeout(500);
      }
    }
    
    console.log('🎉 WebKit stability test completed successfully');
  });
});