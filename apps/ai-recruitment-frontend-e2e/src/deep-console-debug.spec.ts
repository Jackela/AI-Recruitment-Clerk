import { test, expect } from './fixtures';

test.describe('Deep Console Debug', () => {
  test('capture all console messages and errors', async ({ page }) => {
    const allMessages: string[] = [];
    const errors: string[] = [];

    // Capture ALL console messages, not just errors
    page.on('console', (msg) => {
      const message = `[${msg.type()}] ${msg.text()}`;
      allMessages.push(message);

      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Capture page errors (unhandled exceptions)
    page.on('pageerror', (error) => {
      const errorMsg = `PAGE ERROR: ${error.message}`;
      errors.push(errorMsg);
      allMessages.push(errorMsg);
      console.log('Unhandled page error:', error.message);
      console.log('Stack:', error.stack);
    });

    console.log('Starting page navigation...');
    await page.goto('http://localhost:4202/');

    console.log('Waiting for network to settle...');
    await page.waitForLoadState('networkidle');

    // Wait longer for any delayed bootstrap issues
    console.log('Waiting for potential Angular bootstrap...');
    await page.waitForTimeout(5000);

    console.log('=== ALL CONSOLE MESSAGES ===');
    allMessages.forEach((msg, index) => {
      console.log(`${index + 1}: ${msg}`);
    });

    console.log('=== ERROR SUMMARY ===');
    console.log(`Total messages: ${allMessages.length}`);
    console.log(`Error messages: ${errors.length}`);

    if (errors.length > 0) {
      console.log('ERRORS FOUND:');
      errors.forEach((error, index) => {
        console.log(`Error ${index + 1}: ${error}`);
      });
    }

    // Check if main.js is actually being loaded
    const response = await page.goto('http://localhost:4202/');
    const responseText = await response?.text();
    console.log(
      'Response includes main.js:',
      responseText?.includes('main.js') || false,
    );
    console.log(
      'Response includes polyfills.js:',
      responseText?.includes('polyfills.js') || false,
    );

    // Check for any network failures
    const failedRequests: string[] = [];
    page.on('requestfailed', (request) => {
      failedRequests.push(
        `${request.method()} ${request.url()} - ${request.failure()?.errorText}`,
      );
    });

    if (failedRequests.length > 0) {
      console.log('FAILED REQUESTS:');
      failedRequests.forEach((req) => console.log(req));
    }

    // This test always passes - just for debugging
    expect(true).toBe(true);
  });
});
