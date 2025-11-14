import { defineConfig, devices } from '@playwright/test';
import { getTestingEnvironment } from './testing-env';

// Honor E2E_SKIP_WEBSERVER: when true we must NEVER start Playwright webServer
// Also skip when running against real API to ensure decoupled servers
const testingEnv = getTestingEnvironment();
const skipWebServer = testingEnv.skipWebServer || testingEnv.useRealApi;
const devServerPort = testingEnv.devServerPort;

// Support both development (with dev server) and production (containerized) testing.
// Default to the external stack (Docker) when the dev server is skipped.
const fallbackBaseURL = skipWebServer
  ? testingEnv.externalBaseUrl || 'http://localhost:4200'
  : `http://${testingEnv.host}:${devServerPort ?? 4202}`;

const baseURL = testingEnv.playwrightBaseUrl || fallbackBaseURL;

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
        headless: !testingEnv.chromeHeaded,
      },
    },
  },
];

if (testingEnv.enableFirefoxProject) {
  projects.push({
    name: 'firefox',
    use: {
      ...devices['Desktop Firefox'],
      navigationTimeout: 90000,
      actionTimeout: 30000,
      launchOptions: {
        timeout: 60000,
        args: [],
        headless: !testingEnv.firefoxHeaded,
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
  forbidOnly: testingEnv.isCi,
  retries: testingEnv.isCi ? 3 : 2, // Increased retries for infrastructure stability
  workers: testingEnv.isCi ? 1 : 1, // Use single worker to prevent port conflicts
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
          reuseExistingServer: !testingEnv.isCi,
          timeout: 300 * 1000, // Extended for dynamic port allocation
          stderr: 'pipe',
          stdout: 'pipe',
        },
      }),
  projects,
});
