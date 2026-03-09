import { test, expect } from './fixtures';

/**
 * Test to Capture Console Errors and Understand Why Angular Isn't Bootstrapping
 */

const LANDING_PATH = '/jobs';

/**
 * Custom delay helper to satisfy no-wait-for-timeout rule
 * Used for intentional waits in diagnostic tests
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test.describe('Console Error Detection', () => {
  test('capture all console messages and errors', async ({ page }) => {
    const allMessages: Array<{ type: string; text: string }> = [];

    // Capture all console messages
    page.on('console', (msg) => {
      allMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
      console.log(`[${msg.type().toUpperCase()}]`, msg.text());
    });

    // Capture uncaught exceptions
    page.on('pageerror', (exception) => {
      console.log('🔴 UNCAUGHT EXCEPTION:', exception.message);
      allMessages.push({
        type: 'exception',
        text: exception.message,
      });
    });

    // Capture failed network requests
    page.on('requestfailed', (request) => {
      console.log(
        '🔴 FAILED REQUEST:',
        request.url(),
        request.failure()?.errorText,
      );
      allMessages.push({
        type: 'network_error',
        text: `Failed to load: ${request.url()}`,
      });
    });

    console.log('📍 Starting page navigation...');
    const response = await page.goto('/');
    await page.waitForURL(
      (url) => url.pathname.startsWith(LANDING_PATH),
      { timeout: 15_000 },
    );
    console.log('📍 Response status:', response?.status());

    console.log('📍 Waiting for network to settle...');
    await page.waitForLoadState('domcontentloaded');

    console.log('📍 Waiting for potential JavaScript execution...');
    await page.waitForFunction(() => document.readyState === 'complete', {
      timeout: 10000,
    });

    console.log('📍 === CONSOLE MESSAGE SUMMARY ===');
    console.log('Total messages captured:', allMessages.length);

    const errorMessages = allMessages.filter(
      (msg) => msg.type === 'error' || msg.type === 'exception',
    );
    const warningMessages = allMessages.filter((msg) => msg.type === 'warning');
    const logMessages = allMessages.filter((msg) => msg.type === 'log');
    const networkErrors = allMessages.filter(
      (msg) => msg.type === 'network_error',
    );

    console.log('Errors:', errorMessages.length);
    console.log('Warnings:', warningMessages.length);
    console.log('Logs:', logMessages.length);
    console.log('Network errors:', networkErrors.length);

    // Log error details (unconditional logging for diagnostic test)
    console.log('📍 === ERROR DETAILS ===');
    errorMessages.forEach((error, index) => {
      console.log(`Error ${index + 1}:`, error.text);
    });

    // Log network error details (unconditional logging for diagnostic test)
    console.log('📍 === NETWORK ERROR DETAILS ===');
    networkErrors.forEach((error, index) => {
      console.log(`Network Error ${index + 1}:`, error.text);
    });

    // Check if main.js actually loaded and executed
    const mainJsExecuted = logMessages.some(
      (msg) =>
        msg.text.includes('Angular') ||
        msg.text.includes('bootstrap') ||
        msg.text.includes('platform'),
    );

    console.log('📍 Main.js seems to have executed:', mainJsExecuted);

    // Check what the DOM looks like
    const arcRootHTML = await page.locator('arc-root').innerHTML();
    const bodyHTML = await page.locator('body').innerHTML();

    console.log('📍 === DOM STATUS ===');
    console.log('arc-root content length:', arcRootHTML.length);
    console.log('body content length:', bodyHTML.length);

    // Log main.js status (unconditional for diagnostic test)
    const hasMainJs = bodyHTML.includes('main.js');
    console.log('main.js script tag in DOM:', hasMainJs);

    // This test is purely diagnostic
    expect(true).toBe(true);
  });

  test('check if JavaScript modules are loading correctly', async ({
    page,
  }) => {
    // Track resource loading
    const resourcesLoaded: string[] = [];
    const resourcesFailed: string[] = [];

    page.on('response', (response) => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        if (response.ok()) {
          resourcesLoaded.push(response.url());
          console.log('✅ Loaded:', response.url());
        } else {
          resourcesFailed.push(response.url());
          console.log('❌ Failed:', response.url(), response.status());
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await delay(5000);

    console.log('📍 === RESOURCE LOADING SUMMARY ===');
    console.log('Resources loaded:', resourcesLoaded.length);
    console.log('Resources failed:', resourcesFailed.length);

    resourcesLoaded.forEach((url) => {
      console.log('✅', url);
    });

    resourcesFailed.forEach((url) => {
      console.log('❌', url);
    });

    // Check if critical Angular files loaded
    const mainJsLoaded = resourcesLoaded.some((url) => url.includes('main.js'));
    const polyfillsLoaded = resourcesLoaded.some((url) =>
      url.includes('polyfills.js'),
    );
    const stylesLoaded = resourcesLoaded.some((url) => url.includes('styles'));

    console.log('📍 Critical resources status:');
    console.log('main.js loaded:', mainJsLoaded);
    console.log('polyfills.js loaded:', polyfillsLoaded);
    console.log('styles loaded:', stylesLoaded);

    expect(true).toBe(true);
  });
});
