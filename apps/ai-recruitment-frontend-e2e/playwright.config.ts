import { defineConfig, devices } from '@playwright/test';

// Honor E2E_SKIP_WEBSERVER: when true we must NEVER start Playwright webServer
// Also skip when running against real API to ensure decoupled servers
const skipWebServer =
  process.env['E2E_SKIP_WEBSERVER'] === 'true' ||
  process.env['E2E_USE_REAL_API'] === 'true';

const parsedDevServerPort = process.env['DEV_SERVER_PORT']
  ? Number.parseInt(process.env['DEV_SERVER_PORT'], 10)
  : undefined;
const devServerPort = Number.isFinite(parsedDevServerPort ?? NaN)
  ? parsedDevServerPort
  : undefined;

// Support both development (with dev server) and production (containerized) testing.
// Default to the external stack (Docker) when the dev server is skipped.
const fallbackBaseURL = skipWebServer
  ? process.env['E2E_EXTERNAL_BASE_URL'] || 'http://localhost:4200'
  : `http://localhost:${devServerPort ?? 4202}`;

const baseURL =
  process.env['PLAYWRIGHT_BASE_URL'] ||
  process.env['BASE_URL'] ||
  fallbackBaseURL;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const projects = [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      // Enhanced connection retry for dynamic port environment
      navigationTimeout: 90000, // Extended for port allocation
      actionTimeout: 30000, // Extended for infrastructure stability
      launchOptions: {
        timeout: 60000, // Increase browser launch timeout
        args: [
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--no-sandbox', // For CI stability
          '--disable-dev-shm-usage', // For CI stability
        ],
        headless: !process.env.CHROME_HEADED,
      },
    },
  },
];

if (process.env.E2E_ENABLE_FIREFOX === 'true') {
  projects.push({
    name: 'firefox',
    use: {
      ...devices['Desktop Firefox'],
      navigationTimeout: 90000,
      actionTimeout: 30000,
      launchOptions: {
        timeout: 60000,
        // Firefox-specific preferences for CI stability
        // @ts-expect-error firefoxUserPrefs is valid for Firefox but not in base type
        firefoxUserPrefs: {
          'network.http.connection-retry-timeout': 30,
          'network.http.connection-timeout': 90,
          'network.http.response.timeout': 90,
          'dom.max_script_run_time': 0,
          'browser.safebrowsing.enabled': false,
          'browser.safebrowsing.malware.enabled': false,
          'extensions.autoDisableScopes': 14,
          'datareporting.policy.dataSubmissionEnabled': false,
          'datareporting.healthreport.uploadEnabled': false,
          'browser.cache.disk.enable': false,
          'browser.cache.memory.enable': true,
          'browser.cache.memory.capacity': 16384,
        },
        headless: !process.env.FIREFOX_HEADED,
      },
    },
  });
}

export default defineConfig({
  testDir: './src',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  // Enhanced stability configuration for port management
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 2, // Increased retries for infrastructure stability
  workers: process.env.CI ? 1 : 1, // Use single worker to prevent port conflicts
  // Extended global timeout for comprehensive setup/teardown
  globalTimeout: 900000, // 15 minutes global timeout for robust cleanup and port management
  reporter: 'html',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Enhanced connection stability settings for dynamic port environment
    navigationTimeout: 90000, // Extended for port allocation delays
    actionTimeout: 30000, // Extended for infrastructure stability
    ignoreHTTPSErrors: true,
    // Enhanced retry mechanism for dynamic port infrastructure
    extraHTTPHeaders: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache', // Prevent caching during port transitions
      Connection: 'keep-alive', // Maintain connections for stability
    },
    // Enhanced test isolation
    contextOptions: {
      ignoreHTTPSErrors: true,
      bypassCSP: true,
    },
  },
  // Only start Playwright webServer when skipWebServer is false
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: devServerPort
            ? `npx nx run ai-recruitment-frontend:serve:test --port ${devServerPort} --host 0.0.0.0`
            : 'npx nx run ai-recruitment-frontend:serve:test --port 4202 --host 0.0.0.0',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 300 * 1000, // Extended for dynamic port allocation
          stderr: 'pipe',
          stdout: 'pipe',
        },
      }),
  projects,
});
