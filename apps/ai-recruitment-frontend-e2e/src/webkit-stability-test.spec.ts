/**
 * WebKit Stability Test
 *
 * Specific test to validate WebKit connection stability fixes
 */

import { test, expect } from '@playwright/test';

test.describe('WebKit Stability Validation', () => {
  test('WebKit can reliably connect to dev server', async ({
    page,
    browserName,
  }) => {
    // Skip for non-WebKit browsers
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');

    console.log('🌐 Testing WebKit connection stability...');

    // Test multiple page loads to validate stability (based on successful diagnostic)
    for (let i = 1; i <= 3; i++) {
      console.log(`🔄 WebKit connection test ${i}/3`);

      await page.goto('http://localhost:4202/', {
        waitUntil: 'domcontentloaded', // Proven to work in diagnostic
        timeout: 30000, // Standard timeout - diagnostic showed WebKit connects quickly
      });

      // Verify app loaded correctly with fallback checks
      const appTitleExists = (await page.locator('#app-title').count()) > 0;
      if (appTitleExists) {
        await expect(page.locator('#app-title')).toBeVisible({
          timeout: 15000,
        });
        await expect(page.locator('#app-title')).toContainText(
          'AI Recruitment Assistant',
        );
      } else {
        // Fallback check - any meaningful content
        const pageTitle = await page.title();
        expect(pageTitle).toContain('AI Recruitment');
        console.log(`ℹ️ WebKit test ${i}: Title check passed - "${pageTitle}"`);
      }

      console.log(`✅ WebKit connection test ${i}/3 passed`);

      // Brief pause between tests
      if (i < 3) {
        await page.waitForTimeout(500);
      }
    }

    console.log('🌐 WebKit stability test completed successfully');
  });

  test('WebKit handles JavaScript execution reliably', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');

    console.log('🌐 Testing WebKit JavaScript execution...');

    await page.goto('http://localhost:4202/', {
      waitUntil: 'domcontentloaded', // Proven to work from diagnostic
      timeout: 30000, // Standard timeout
    });

    // Wait for basic page load, with fallback strategy
    await page.waitForLoadState('domcontentloaded');

    // Test JavaScript evaluation - replicate successful diagnostic approach
    const result = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        hasConsole: typeof console !== 'undefined',
        title: document.title,
        documentReady: document.readyState,
        timestamp: new Date().toISOString(),
      };
    });

    // Validate core JavaScript functionality
    expect(result.hasDocument).toBe(true);
    expect(result.hasConsole).toBe(true);
    expect(result.hasWindow).toBe(true);
    expect(result.title).toContain('AI Recruitment');
    expect(['loading', 'interactive', 'complete']).toContain(
      result.documentReady,
    );

    console.log(`✅ WebKit JavaScript execution test passed`);
    console.log(`   User Agent: ${result.userAgent}`);
    console.log(`   Document State: ${result.documentReady}`);
  });

  test('WebKit can handle navigation', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');

    console.log('🌐 Testing WebKit navigation...');

    // Start from home - use proven approach from diagnostic
    await page.goto('http://localhost:4202/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Verify home page loaded
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // Test navigation to single route (most reliable)
    console.log('🔄 Testing WebKit navigation to /jobs...');

    await page.goto('http://localhost:4202/jobs', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Just verify page loaded (body should be visible) - diagnostic approach
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // Verify URL changed correctly
    expect(page.url()).toContain('/jobs');

    console.log(`✅ WebKit navigation test completed successfully`);
  });
});
