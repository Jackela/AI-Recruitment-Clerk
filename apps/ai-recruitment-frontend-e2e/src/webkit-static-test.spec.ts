/**
 * WebKit Static Build Test
 *
 * Tests WebKit against production static build to bypass dev server issues
 */

import { test, expect } from './fixtures';

test.describe('WebKit Static Build Tests', () => {
  test('WebKit works with static production build', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');

    console.log('🚀 Testing WebKit against production static build...');

    await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Basic page load verification
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    const title = await page.title();
    expect(title).toContain('AI Recruitment');

    console.log(`✅ WebKit static test passed - "${title}"`);
  });

  test('WebKit JavaScript execution works with static build', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');

    console.log('⚡ Testing WebKit JavaScript with static build...');

    await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const result = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        title: document.title,
        readyState: document.readyState,
        timestamp: new Date().toISOString(),
      };
    });

    // Validate JavaScript functionality
    expect(result.hasDocument).toBe(true);
    expect(result.hasWindow).toBe(true);
    expect(result.title).toContain('AI Recruitment');

    console.log(`✅ WebKit JavaScript static test passed`);
    console.log(`   Document State: ${result.readyState}`);
  });

  test('WebKit navigation works with static build', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');

    console.log('🧭 Testing WebKit navigation with static build...');

    // Navigate to home first
    await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // Test navigation to jobs page
    await page.goto('/jobs', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    const url = page.url();
    expect(url).toContain('/jobs');

    console.log(`✅ WebKit navigation static test passed - ${url}`);
  });

  test('WebKit handles multiple page loads with static build', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'This test is WebKit-specific');

    console.log('🔄 Testing WebKit stability with static build...');

    for (let i = 1; i <= 3; i++) {
      console.log(`🔄 WebKit static load test ${i}/3`);

      await page.goto('/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

      const title = await page.title();
      expect(title).toContain('AI Recruitment');

      console.log(`✅ WebKit static load test ${i}/3 passed`);

      if (i < 3) {
        await page.waitForTimeout(500);
      }
    }

    console.log('🎉 WebKit static stability test completed successfully');
  });
});
