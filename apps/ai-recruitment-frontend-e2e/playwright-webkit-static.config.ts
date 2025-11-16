import { defineConfig, devices } from '@playwright/test';
import { getTestingEnvironment } from './testing-env';

const testingEnv = getTestingEnvironment();

/**
 * WebKit Static Build Configuration
 *
 * Uses static production build to test WebKit without dev server issues
 * Tests against serve-static on port 4204
 */
export default defineConfig({
  testDir: './src',
  testMatch: ['**/webkit-*.spec.ts', '**/webkit-*.test.js'],
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: testingEnv.isCi,
  retries: testingEnv.isCi ? 1 : 0,
  workers: 1, // Single worker for WebKit stability
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4204',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 15000,
    ignoreHTTPSErrors: true,
  },
  // No webServer - use external static server
  // Start with: npx serve -s dist/apps/ai-recruitment-frontend/browser -l 4204
  projects: [
    {
      name: 'webkit-static',
      use: {
        ...devices['Desktop Safari'],
        // Proven WebKit configuration
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
          headless: !testingEnv.webkitHeaded,
        },
        contextOptions: {
          ignoreHTTPSErrors: true,
          bypassCSP: true,
        },
      },
    },
  ],
});
