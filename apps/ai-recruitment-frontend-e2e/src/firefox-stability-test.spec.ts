/**
 * Firefox Stability Test
 *
 * Specific test to validate Firefox connection stability fixes
 */

import { test, expect } from './fixtures';

test.describe('Firefox Stability Validation', () => {
  test('Firefox can reliably connect to dev server', async ({
    page,
    browserName,
  }) => {
    // Skip for non-Firefox browsers
    test.skip(browserName !== 'firefox', 'This test is Firefox-specific');

    console.log('🦊 Testing Firefox connection stability...');

    // Test multiple page loads to validate stability
    for (let i = 1; i <= 3; i++) {
      console.log(`🔄 Firefox connection test ${i}/3`);

      await page.goto('http://localhost:4202/', {
        waitUntil: 'networkidle',
        timeout: 60000, // Extended timeout for Firefox
      });

      // Verify app loaded correctly
      await expect(page.locator('#app-title')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('#app-title')).toContainText(
        'AI Recruitment Assistant',
      );

      console.log(`✅ Firefox connection test ${i}/3 passed`);

      // Brief pause between tests
      if (i < 3) {
        await page.waitForTimeout(1000);
      }
    }

    console.log('🦊 Firefox stability test completed successfully');
  });

  test('Firefox handles network errors gracefully', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'firefox', 'This test is Firefox-specific');

    console.log('🦊 Testing Firefox error handling...');

    // Test navigation to non-existent route
    await page.goto('http://localhost:4202/nonexistent-route', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Should redirect to dashboard or show 404
    const url = page.url();
    const isRedirected = url.includes('/dashboard') || url.includes('/jobs');
    const hasNotFound = (await page.locator('text=404').count()) > 0;

    expect(isRedirected || hasNotFound).toBe(true);

    console.log('✅ Firefox error handling test passed');
  });

  test('Firefox can handle rapid navigation', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'This test is Firefox-specific');

    console.log('🦊 Testing Firefox rapid navigation...');

    // Start from home
    await page.goto('http://localhost:4202/', { waitUntil: 'networkidle' });
    await expect(page.locator('#app-title')).toBeVisible();

    // Rapid navigation test
    const routes = ['/jobs', '/reports', '/resume'];

    for (const route of routes) {
      await page.goto(`http://localhost:4202${route}`, {
        waitUntil: 'load', // Use 'load' instead of 'networkidle' for speed
        timeout: 30000,
      });

      // Just verify page loaded (body should be visible)
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

      console.log(`✅ Firefox navigated to ${route}`);
    }

    console.log('🦊 Firefox rapid navigation test completed');
  });
});
