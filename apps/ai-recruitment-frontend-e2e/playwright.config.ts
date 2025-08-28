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
  // Fix: Reduce parallelism to prevent Firefox connection issues under load
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Add retry for local dev to handle connection issues
  workers: process.env.CI ? 1 : 1, // Use single worker for better Firefox stability
  // Global timeout for test setup and teardown
  globalTimeout: 300000, // 5 minutes global timeout
  reporter: 'html',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Fix: Add global connection stability settings
    navigationTimeout: 45000,
    actionTimeout: 15000,
    ignoreHTTPSErrors: true,
    // Add retry mechanism for failed connections
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  },
  // Only start webServer if not testing against containerized system
  ...(isContainerizedTesting ? {} : {
    webServer: {
      command: 'npx nx run ai-recruitment-frontend:serve --port 4202 --host 0.0.0.0',
      url: 'http://localhost:4202',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      // Fix: Increase startup timeout for better stability
      stderr: 'pipe',
      stdout: 'pipe'
    }
  }),
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Add connection retry for stability
        navigationTimeout: 45000,
        actionTimeout: 15000
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Fix: Firefox-specific configuration for connection stability
        navigationTimeout: 60000, // Longer timeout for Firefox
        actionTimeout: 20000,
        // Simplified Firefox launch options for better compatibility
        launchOptions: {
          timeout: 60000, // Increase browser launch timeout
          firefoxUserPrefs: {
            // Network optimizations
            'network.http.connection-retry-timeout': 30,
            'network.http.connection-timeout': 90,
            'network.http.response.timeout': 90,
            'dom.max_script_run_time': 0,
            // Disable problematic features that can cause hangs
            'browser.safebrowsing.enabled': false,
            'browser.safebrowsing.malware.enabled': false,
            'extensions.autoDisableScopes': 14,
            'datareporting.policy.dataSubmissionEnabled': false,
            'datareporting.healthreport.uploadEnabled': false,
            // Reduce memory usage
            'browser.cache.disk.enable': false,
            'browser.cache.memory.enable': true,
            'browser.cache.memory.capacity': 16384
          },
          // Use headless mode for better stability
          headless: !process.env.FIREFOX_HEADED
        }
      },
    },
    // WebKit: Uses separate configuration due to dev server incompatibility
    // WebKit tests pass 100% with static builds but fail with Playwright's webServer
    // Root cause: Angular dev server crashes when WebKit connects through Playwright
    // Solution: Use scripts/run-webkit-tests.mjs or playwright-webkit-static.config.ts
    // 
    // Uncomment below to test WebKit with dev server (will fail):
    // {
    //   name: 'webkit',
    //   use: { 
    //     ...devices['Desktop Safari'],
    //     navigationTimeout: 45000,
    //     actionTimeout: 15000,
    //     launchOptions: {
    //       timeout: 30000,
    //       args: [
    //         '--disable-web-security',
    //         '--disable-features=VizDisplayCompositor',
    //         '--disable-ipc-flooding-protection',
    //         '--disable-backgrounding-occluded-windows',
    //         '--disable-renderer-backgrounding',
    //         '--disable-field-trial-config',
    //         '--no-first-run'
    //       ],
    //       headless: !process.env.WEBKIT_HEADED
    //     },
    //     contextOptions: {
    //       ignoreHTTPSErrors: true,
    //       bypassCSP: true
    //     }
    //   },
    // }
  ],
});
