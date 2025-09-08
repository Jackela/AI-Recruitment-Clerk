/**
 * Simple Firefox Test
 *
 * Minimal test to verify Firefox can launch and connect to dev server
 */

import { test, expect } from '@playwright/test';

test.describe('Simple Firefox Test', () => {
  test('Firefox basic connection test', async ({ page, browserName }) => {
    // Skip for non-Firefox browsers
    test.skip(browserName !== 'firefox', 'This test is Firefox-specific');

    console.log('🦊 Testing basic Firefox connection...');

    // Single navigation test with extended timeout
    await page.goto('http://localhost:4202/', {
      waitUntil: 'domcontentloaded', // Less strict than networkidle
      timeout: 60000,
    });

    // Basic visibility check
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // Try to find app title
    const appTitleExists = (await page.locator('#app-title').count()) > 0;
    if (appTitleExists) {
      await expect(page.locator('#app-title')).toBeVisible({ timeout: 10000 });
      console.log('✅ Firefox connected and loaded app successfully');
    } else {
      // Fallback check - any content loaded
      const hasContent = await page.locator('body').textContent();
      expect(hasContent).toBeTruthy();
      console.log(
        '✅ Firefox connected and loaded content (no app title found)',
      );
    }
  });

  test('Firefox can handle simple navigation', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'firefox', 'This test is Firefox-specific');

    console.log('🦊 Testing Firefox simple navigation...');

    // Navigate to home
    await page.goto('http://localhost:4202/', {
      waitUntil: 'load',
      timeout: 30000,
    });

    // Verify page loaded
    await expect(page.locator('body')).toBeVisible();

    // Try navigation to jobs
    await page.goto('http://localhost:4202/jobs', {
      waitUntil: 'load',
      timeout: 30000,
    });

    // Verify second page loaded
    await expect(page.locator('body')).toBeVisible();

    console.log('✅ Firefox navigation test passed');
  });
});
