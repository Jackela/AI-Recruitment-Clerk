import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Enhanced Playwright Configuration for AI Recruitment System E2E Tests
 * 
 * Features:
 * - Cross-browser testing matrix
 * - Mobile device testing
 * - Accessibility testing integration
 * - Performance monitoring
 * - Visual regression testing
 * - Real-time WebSocket testing
 */

export default defineConfig({
  testDir: './tests/playwright/enhanced',
  
  /* Global timeout for each test */
  timeout: 60 * 1000, // 60 seconds
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 10 * 1000,
  },
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for better WebSocket and real-time testing
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI for stability */
  workers: process.env.CI ? 1 : 2,
  
  /* Reporter configuration */
  reporter: [
    ['html', { 
      outputFolder: 'playwright-enhanced-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'playwright-enhanced-results.json' 
    }],
    ['junit', { 
      outputFile: 'playwright-enhanced-results.xml' 
    }],
    ['list'],
    // Custom accessibility reporter
    [path.resolve(__dirname, 'reporters/accessibility-reporter.js')]
  ],
  
  /* Shared settings for all projects */
  use: {
    /* Base URL */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4200',
    
    /* Collect trace on retry */
    trace: 'retain-on-failure',
    
    /* Record video for failed tests */
    video: 'retain-on-failure',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Action timeout */
    actionTimeout: 30 * 1000,
    navigationTimeout: 30 * 1000,
    
    /* Ignore HTTPS errors for testing */
    ignoreHTTPSErrors: true,
    
    /* Locale and timezone */
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./setup/global-setup-enhanced.ts'),
  globalTeardown: require.resolve('./setup/global-teardown-enhanced.ts'),

  /* Test configuration by browser and device */
  projects: [
    /* Desktop Browsers */
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Enable permissions for WebSocket and camera tests
        permissions: ['camera', 'microphone', 'notifications'],
        // Video recording settings
        video: {
          mode: 'retain-on-failure',
          size: { width: 1920, height: 1080 }
        }
      },
      testMatch: ['**/*.spec.ts'],
    },

    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        permissions: ['camera', 'microphone', 'notifications'],
      },
      testMatch: ['**/*.spec.ts'],
    },

    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: ['**/*.spec.ts'],
    },

    {
      name: 'edge-desktop',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge',
        viewport: { width: 1920, height: 1080 },
        permissions: ['camera', 'microphone', 'notifications'],
      },
      testMatch: ['**/*.spec.ts'],
    },

    /* Mobile Devices */
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // Mobile-specific settings
        hasTouch: true,
        isMobile: true,
        permissions: ['camera', 'microphone', 'geolocation'],
      },
      testMatch: ['**/mobile-responsive.spec.ts', '**/authentication-enhanced.spec.ts'],
    },

    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true,
      },
      testMatch: ['**/mobile-responsive.spec.ts', '**/authentication-enhanced.spec.ts'],
    },

    {
      name: 'mobile-samsung',
      use: {
        ...devices['Galaxy S21'],
        hasTouch: true,
        isMobile: true,
        permissions: ['camera', 'microphone'],
      },
      testMatch: ['**/mobile-responsive.spec.ts'],
    },

    /* Tablet Testing */
    {
      name: 'tablet-ipad',
      use: { 
        ...devices['iPad Pro'],
        hasTouch: true,
      },
      testMatch: ['**/mobile-responsive.spec.ts', '**/recruitment-workflow-complete.spec.ts'],
    },

    /* Accessibility Testing - Chrome with accessibility tools */
    {
      name: 'accessibility-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Enable accessibility features
        launchOptions: {
          args: [
            '--enable-accessibility-logging',
            '--enable-automation',
            '--disable-web-security', // For testing purposes
            '--allow-running-insecure-content',
          ]
        }
      },
      testMatch: ['**/accessibility-wcag.spec.ts'],
    },

    /* Performance Testing */
    {
      name: 'performance-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Performance monitoring settings
        launchOptions: {
          args: [
            '--enable-automation',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--enable-precise-memory-info',
          ]
        }
      },
      testMatch: ['**/recruitment-workflow-complete.spec.ts', '**/realtime-websocket.spec.ts'],
    },

    /* WebSocket and Real-time Testing */
    {
      name: 'realtime-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
        permissions: ['notifications'],
        // WebSocket specific settings
        launchOptions: {
          args: [
            '--enable-automation',
            '--enable-features=NetworkService',
          ]
        }
      },
      testMatch: ['**/realtime-websocket.spec.ts'],
    },

    /* Visual Regression Testing */
    {
      name: 'visual-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Consistent rendering for screenshots
        launchOptions: {
          args: [
            '--enable-automation',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
          ]
        }
      },
      testMatch: ['**/visual-regression.spec.ts'],
    },

    /* Cross-browser Compatibility Suite */
    {
      name: 'compatibility-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: ['**/authentication-enhanced.spec.ts', '**/recruitment-workflow-complete.spec.ts'],
    },

    {
      name: 'compatibility-webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: ['**/authentication-enhanced.spec.ts', '**/recruitment-workflow-complete.spec.ts'],
    },

    /* Slow network testing */
    {
      name: 'slow-network',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Simulate slow network
        launchOptions: {
          args: ['--enable-automation']
        },
        // This would be configured via page.route() in tests
      },
      testMatch: ['**/realtime-websocket.spec.ts'],
    },

    /* High DPI testing */
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2, // Simulate high DPI
      },
      testMatch: ['**/mobile-responsive.spec.ts'],
    }
  ],

  /* Configure web server for testing */
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run start:test-server',
      port: 4200,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    // Mock WebSocket server for testing
    {
      command: 'npm run start:mock-websocket',
      port: 3001,
      timeout: 30 * 1000,
      reuseExistingServer: !process.env.CI,
    }
  ],

  /* Test metadata and configuration */
  metadata: {
    project: 'AI Recruitment System',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'test',
    ci: !!process.env.CI,
    browser_versions: {
      chromium: '119.0.0.0',
      firefox: '118.0.0.0',
      webkit: '17.0.0.0'
    }
  },

  /* Output directories */
  outputDir: 'test-results-enhanced/',
  
  /* Test artifacts */
  artifactsDir: 'test-artifacts/',
  
  /* Custom test tags */
  grep: process.env.TEST_TAG ? new RegExp(process.env.TEST_TAG) : undefined,
  
  /* Global test setup */
  globalTestSetup: [
    './setup/test-data-setup.ts',
    './setup/accessibility-setup.ts'
  ],

  /* Test filtering based on environment */
  testIgnore: [
    // Skip visual tests in CI unless specifically requested
    process.env.CI && !process.env.RUN_VISUAL_TESTS ? '**/visual-regression.spec.ts' : '',
    // Skip performance tests on slower CI
    process.env.CI && process.env.CI_PERFORMANCE === 'false' ? '**/performance/*.spec.ts' : '',
  ].filter(Boolean),
});