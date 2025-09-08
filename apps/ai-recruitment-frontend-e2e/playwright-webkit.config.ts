import { defineConfig, devices } from '@playwright/test';

/**
 * WebKit-specific Playwright configuration
 *
 * Uses external server to avoid webServer configuration issues with WebKit
 * Server must be started manually on port 4203 before running tests
 */
export default defineConfig({
  testDir: './src',
  timeout: 45000, // Standard timeout for WebKit
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker for WebKit stability
  reporter: 'html',
  use: {
    // Use external server - no webServer configuration
    baseURL: 'http://localhost:4203',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000, // WebKit connects quickly
    actionTimeout: 15000,
    ignoreHTTPSErrors: true,
  },
  // No webServer configuration - use external server
  projects: [
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // Proven WebKit configuration from successful tests
        launchOptions: {
          timeout: 30000,
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-ipc-flooding-protection',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-field-trial-config',
            '--no-first-run',
          ],
          headless: !process.env.WEBKIT_HEADED,
        },
        contextOptions: {
          ignoreHTTPSErrors: true,
          bypassCSP: true,
        },
      },
    },
  ],
});
