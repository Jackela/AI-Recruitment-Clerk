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
  : 4200;

// Support both development (with dev server) and production (containerized) testing.
// Default to the external stack (Docker) when the dev server is skipped.
const fallbackBaseURL = skipWebServer
  ? process.env['E2E_EXTERNAL_BASE_URL'] || 'http://localhost:4200'
  : `http://localhost:${devServerPort}`;

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
        headless: !process.env['CHROME_HEADED'],
      },
    },
  },
];

if (process.env['E2E_ENABLE_FIREFOX'] === 'true') {
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
        headless: !process.env['FIREFOX_HEADED'],
      },
    },
  });
}

// WebKit / Safari support
if (process.env['E2E_ENABLE_WEBKIT'] === 'true') {
  projects.push({
    name: 'webkit',
    use: {
      ...devices['Desktop Safari'],
      navigationTimeout: 90000,
      actionTimeout: 30000,
      launchOptions: {
        timeout: 60000,
        args: [
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-ipc-flooding-protection',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--no-first-run',
        ],
        headless: !process.env['WEBKIT_HEADED'],
      },
      // @ts-expect-error contextOptions is not in base type but works for WebKit
      contextOptions: {
        ignoreHTTPSErrors: true,
        bypassCSP: true,
      },
    },
  });

  // Mobile Safari - iPhone
  projects.push({
    name: 'webkit-iphone',
    use: {
      ...devices['iPhone 14'],
      navigationTimeout: 90000,
      actionTimeout: 30000,
      launchOptions: {
        timeout: 60000,
        args: ['--no-first-run'],
        headless: !process.env['WEBKIT_HEADED'],
      },
      // @ts-expect-error contextOptions is not in base type but works for WebKit
      contextOptions: {
        ignoreHTTPSErrors: true,
        bypassCSP: true,
      },
    },
  });

  // Mobile Safari - iPad
  projects.push({
    name: 'webkit-ipad',
    use: {
      ...devices['iPad Pro 11'],
      navigationTimeout: 90000,
      actionTimeout: 30000,
      launchOptions: {
        timeout: 60000,
        args: ['--no-first-run'],
        headless: !process.env['WEBKIT_HEADED'],
      },
      // @ts-expect-error contextOptions is not in base type but works for WebKit
      contextOptions: {
        ignoreHTTPSErrors: true,
        bypassCSP: true,
      },
    },
  });
}

export default defineConfig({
  testDir: './src',
  // Exclude debug/diagnostic tests from regular runs
  testIgnore: ['**/debug/**', '**/*.debug.spec.ts', '**/browser-compatibility-test.spec.ts', '**/essential-compatibility.spec.ts', '**/core-user-flow.spec.ts', '**/comprehensive-validation.spec.ts', '**/detailed-job-creation.spec.ts', '**/ai-validation/**', '**/accessibility/**'],
  timeout: 60000,
  expect: {
    timeout: 30000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  // Parallel execution optimized for modern CI and local environments
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 1,
  workers: process.env['CI'] ? 4 : undefined, // CI: fixed 4 workers, Local: auto-detect (50% CPUs)
  // Extended global timeout for comprehensive setup/teardown
  globalTimeout: 900000, // 15 minutes global timeout for robust cleanup and port management
  reporter: 'html',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
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

    // Consistent viewport and device scale
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,

    // Screenshot settings
    screenshot: {
      mode: 'only-on-failure',
      fullPage: false,
    },

    // Context options for consistency
    contextOptions: {
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      colorScheme: 'light',
    },
  },
  // Only start Playwright webServer when skipWebServer is false
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          // Serve the pre-built frontend (build is done in CI before running tests)
          command: `npx serve dist/apps/ai-recruitment-frontend/browser -l ${devServerPort} -s --proxy /api=http://localhost:3000`,
          url: baseURL,
          reuseExistingServer: !process.env['CI'],
          timeout: 120000, // 2分钟启动等待 (production builds take longer)
          stdout: 'pipe',
          stderr: 'pipe',
        },
      }),
  projects,
});
