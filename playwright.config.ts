import { defineConfig, devices } from '@playwright/test';

// Allow skipping Playwright-managed webServer for external/prod servers
const skipWebServer = process.env['E2E_SKIP_WEBSERVER'] === 'true';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
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
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
    },
  ],
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: 'npm start',
          url: 'http://localhost:4200',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }),
  expect: {
    timeout: 10 * 1000,
  },
  timeout: 30 * 1000,
});
