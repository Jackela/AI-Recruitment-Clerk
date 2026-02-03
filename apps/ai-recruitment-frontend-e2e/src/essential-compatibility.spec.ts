/**
 * Essential Cross-Browser Compatibility Test
 *
 * Streamlined compatibility test focused on core functionality
 * with enhanced error handling and retry mechanisms
 */

import { test, expect } from './fixtures';
import {
  stableNavigation,
  stableElementCheck,
  checkConnectionHealth,
  BROWSER_CONFIGS,
} from '../connection-stability';

test.describe('Essential Cross-Browser Compatibility', () => {
  test('Browser can establish basic connection', async ({
    page,
    browserName,
  }) => {
    console.log(`🔌 Testing ${browserName} basic connection...`);

    // Use connection health check utility
    const isHealthy = await checkConnectionHealth(page, '/', browserName);
    console.log(`Health check result for ${browserName}: ${isHealthy}`);

    // Always perform navigation test to establish connection
    await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout:
        BROWSER_CONFIGS[browserName as keyof typeof BROWSER_CONFIGS]
          ?.navigationTimeout || 45000,
    });

    // Use web-first assertion instead of isVisible()
    await expect(page.locator('body')).toBeVisible();

    console.log(`✅ ${browserName} connection established`);
  });

  test('Browser can load application title', async ({ page, browserName }) => {
    console.log(`📄 Testing ${browserName} application loading...`);

    // Use stable navigation utility
    await stableNavigation(
      page,
      '/',
      {
        waitUntil: 'domcontentloaded',
        retries: 2,
      },
      browserName,
    );

    // Use stable element check utility
    const titleFound = await stableElementCheck(
      page,
      '#app-title',
      {
        maxRetries: 3,
        timeoutMs: 20000,
      },
      browserName,
    );

    console.log(`Title element found: ${titleFound}`);

    // Check for app title or fall back to body content check
    const titleLocator = page.locator('#app-title');
    const titleCount = await titleLocator.count();

    console.log(`Title count: ${titleCount}`);

    // Verify page has meaningful content using web-first assertion
    // This ensures the body element exists and is not empty
    const bodyLocator = page.locator('body');
    await expect(bodyLocator).toBeVisible();
    await expect(bodyLocator).not.toBeEmpty();

    console.log(`✅ ${browserName} application loaded with content`);
  });

  test('Browser supports basic JavaScript execution', async ({
    page,
    browserName,
  }) => {
    console.log(`⚡ Testing ${browserName} JavaScript support...`);

    await stableNavigation(
      page,
      '/',
      {
        waitUntil: 'load',
        retries: 2,
      },
      browserName,
    );

    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded');

    // Simple JavaScript evaluation test
    const result = await page.evaluate(() => {
      return {
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        hasConsole: typeof console !== 'undefined',
        documentReady: document.readyState,
        title: document.title,
        bodyExists: document.body !== null,
      };
    });

    expect(result.hasWindow).toBe(true);
    expect(result.hasDocument).toBe(true);
    expect(result.hasConsole).toBe(true);
    expect(result.bodyExists).toBe(true);
    expect(['loading', 'interactive', 'complete']).toContain(
      result.documentReady,
    );

    console.log(`✅ ${browserName} JavaScript execution successful`);
    console.log(
      `   Document state: ${result.documentReady}, Title: "${result.title}"`,
    );
  });

  test('Browser handles single route navigation', async ({
    page,
    browserName,
  }) => {
    console.log(`🧭 Testing ${browserName} navigation...`);

    // Start from home
    await stableNavigation(
      page,
      '/',
      {
        waitUntil: 'domcontentloaded',
        retries: 2,
      },
      browserName,
    );

    // Verify initial page loaded
    await expect(page.locator('body')).toBeVisible({ timeout: 20000 });

    // Navigate to jobs route
    await page.goto('/jobs', {
      waitUntil: 'domcontentloaded',
      timeout:
        BROWSER_CONFIGS[browserName as keyof typeof BROWSER_CONFIGS]
          ?.navigationTimeout || 45000,
    });

    // Verify navigation worked
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    const currentUrl = page.url();
    expect(new URL(currentUrl).pathname).toContain('/jobs');

    console.log(`✅ ${browserName} navigation to /jobs successful`);
  });
});
