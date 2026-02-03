/**
 * Simple Firefox Test
 *
 * Minimal test to verify Firefox can launch and connect to dev server
 */

import { test, expect } from './fixtures';

test.describe('Simple Firefox Test', () => {
  // Skip all tests in this suite for non-Firefox browsers
  test.beforeEach(async ({ browserName }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(browserName !== 'firefox', 'This test suite is Firefox-specific');
  });

  test('Firefox basic connection test', async ({ page }) => {
    console.log('🦊 Testing basic Firefox connection...');

    // Single navigation test with extended timeout
    await page.goto('/', {
      waitUntil: 'domcontentloaded', // Less strict than networkidle
      timeout: 60000,
    });

    // Basic visibility check
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // Check app title visibility (may or may not exist)
    const appTitleCount = await page.locator('#app-title').count();
    console.log('App title found:', appTitleCount > 0);

    // Verify body has content (web-first assertion)
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });

    console.log('✅ Firefox connected and loaded content');
  });

  test('Firefox can handle simple navigation', async ({ page }) => {
    console.log('🦊 Testing Firefox simple navigation...');

    // Navigate to home
    await page.goto('/', {
      waitUntil: 'load',
      timeout: 30000,
    });

    // Verify page loaded
    await expect(page.locator('body')).toBeVisible();

    // Try navigation to jobs
    await page.goto('/jobs', {
      waitUntil: 'load',
      timeout: 30000,
    });

    // Verify second page loaded
    await expect(page.locator('body')).toBeVisible();

    console.log('✅ Firefox navigation test passed');
  });
});
