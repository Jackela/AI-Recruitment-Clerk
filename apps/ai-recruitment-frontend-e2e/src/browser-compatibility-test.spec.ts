/**
 * Browser Compatibility Test Suite
 *
 * Comprehensive test to validate consistent behavior across all supported browsers
 */

import { test, expect } from './fixtures';

test.describe('Cross-Browser Compatibility', () => {
  test('All browsers can load the application', async ({
    page,
    browserName,
  }) => {
    console.log(`🌐 Testing ${browserName} browser compatibility...`);

    // Navigate to application
    await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Verify core elements load across all browsers
    await expect(page.locator('#app-title')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#app-title')).toContainText(
      'AI Recruitment Assistant',
    );

    // Verify navigation elements
    const navExists =
      (await page.locator('nav, [role="navigation"]').count()) > 0;
    expect(navExists).toBe(true);

    // Verify main content area
    await expect(page.locator('main, [role="main"]')).toBeVisible();

    console.log(`✅ ${browserName} compatibility test passed`);
  });

  test('All browsers can handle navigation', async ({ page, browserName }) => {
    console.log(`🧭 Testing ${browserName} navigation...`);

    // Start from home
    await page.goto('/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('#app-title')).toBeVisible();

    // Test navigation to different routes
    const routes = ['/jobs', '/reports', '/resume'];

    for (const route of routes) {
      await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      // Verify page loaded (body should be visible)
      await expect(page.locator('body')).toBeVisible();

      console.log(`✅ ${browserName} navigated to ${route}`);
    }

    console.log(`✅ ${browserName} navigation test completed`);
  });

  test('All browsers handle JavaScript correctly', async ({
    page,
    browserName,
  }) => {
    console.log(`⚡ Testing ${browserName} JavaScript execution...`);

    await page.goto('/', {
      waitUntil: 'domcontentloaded',
    });

    // Test JavaScript evaluation
    const result = await page.evaluate(() => {
      return {
        hasAngular:
          typeof (window as unknown as { ng?: unknown }).ng !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        hasConsole: typeof console !== 'undefined',
        title: document.title,
      };
    });

    expect(result.hasDocument).toBe(true);
    expect(result.hasConsole).toBe(true);
    expect(result.title).toContain('AI Recruitment');

    console.log(`✅ ${browserName} JavaScript execution test passed`);
  });

  test('All browsers respect accessibility features', async ({
    page,
    browserName,
  }) => {
    console.log(`♿ Testing ${browserName} accessibility...`);

    await page.goto('/', {
      waitUntil: 'domcontentloaded',
    });

    // Check for accessibility attributes
    const appTitle = page.locator('#app-title');
    await expect(appTitle).toBeVisible();

    // Check for aria-live region
    const ariaLiveExists = (await page.locator('[aria-live]').count()) > 0;
    expect(ariaLiveExists).toBe(true);

    // Check for skip navigation
    const skipNavExists =
      (await page.locator('.skip-navigation, [class*="skip"]').count()) > 0;
    expect(skipNavExists).toBe(true);

    console.log(`✅ ${browserName} accessibility test passed`);
  });
});
