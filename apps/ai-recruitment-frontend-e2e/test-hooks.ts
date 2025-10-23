/**
 * Test Hooks for Browser Stability
 *
 * Custom test hooks to handle browser-specific issues and improve test reliability
 */

import { test as base } from '@playwright/test';
import {
  addBrowserLaunchDelay,
  withFirefoxConnectionRetry,
} from './browser-stability';

// Extend the base test with stability enhancements
export const test = base.extend<{
  stablePage: any;
}>({
  // Custom page fixture with Firefox stability enhancements
  stablePage: async ({ page, browserName }: { page: any; browserName: string }, use: (page: any) => Promise<void>) => {
    // Add browser-specific launch delays
    await addBrowserLaunchDelay(browserName);

    // Wrap Firefox operations with retry logic
    if (browserName === 'firefox') {
      const originalGoto = page.goto.bind(page);
      page.goto = async (url: string, options?: any) => {
        return withFirefoxConnectionRetry(
          () => originalGoto(url, options),
          3, // Max 3 retries for Firefox navigation
        );
      };

      // Add Firefox-specific error handling for common issues
      page.on('pageerror', (error: Error) => {
        if (error.message.includes('NS_ERROR_CONNECTION_REFUSED')) {
          console.warn(
            `🦊 Firefox connection error detected: ${error.message}`,
          );
        }
      });

      // Set more lenient timeouts for Firefox
      page.setDefaultTimeout(60000); // 60 seconds for Firefox
      page.setDefaultNavigationTimeout(60000);
    } else {
      // Standard timeouts for other browsers
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
