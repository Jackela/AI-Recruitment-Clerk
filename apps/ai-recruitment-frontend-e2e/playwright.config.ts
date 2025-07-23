import { defineConfig, devices } from '@playwright/test';

// Support both development (with dev server) and production (containerized) testing
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] || process.env['BASE_URL'] || 'http://localhost:4202';
const isContainerizedTesting = process.env['PLAYWRIGHT_BASE_URL'] === 'http://localhost:4200';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  // Only start webServer if not testing against containerized system
  ...(isContainerizedTesting ? {} : {
    webServer: {
      command: 'npx nx run ai-recruitment-frontend:serve --port 4202',
      url: 'http://localhost:4202',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    }
  }),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }
  ],
});
