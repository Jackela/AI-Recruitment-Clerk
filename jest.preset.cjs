const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  // Enhanced Jest configuration for process cleanup
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
  globalTeardown: '<rootDir>/../../test/global-teardown.ts',

  // Test environment configuration
  testEnvironment: 'node',
  testTimeout: 30000,

  // Allow configurable parallelism (default to full core usage unless overridden)
  maxWorkers: process.env.JEST_MAX_WORKERS || '100%',

  // Clean up between tests
  clearMocks: true,
  restoreMocks: true,

  // Collect coverage but don't fail on low coverage during cleanup testing
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,js}',
    '!<rootDir>/src/**/*.spec.{ts,js}',
    '!<rootDir>/src/**/*.test.{ts,js}',
    '!<rootDir>/src/**/*.e2e-spec.{ts,js}',
    '!<rootDir>/src/**/__tests__/**',
    '!<rootDir>/src/**/__mocks__/**',
  ],
  coverageReporters: ['json', 'json-summary', 'lcov', 'text', 'text-summary'],

  // Enhanced error reporting
  verbose: true,

  // Prevent hanging by detecting open handles
  detectOpenHandles: process.env.DETECT_HANDLES === 'true',
  forceExit: false, // Never use forceExit - fix root causes instead

  // Module resolution for cleanup utilities
  moduleNameMapping: {
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
};
