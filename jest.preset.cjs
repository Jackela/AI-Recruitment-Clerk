const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  // Enhanced Jest configuration for process cleanup
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
  globalTeardown: '<rootDir>/../../test/global-teardown.ts',

  // Test environment configuration
  testEnvironment: 'node',
  testTimeout: 30000,

  // Worker limits to prevent resource exhaustion and timeouts
  // In CI, limit to 2 workers to prevent memory issues
  // In local dev, use 50% of CPUs to leave resources for other processes
  maxWorkers: process.env.CI ? 2 : process.env.JEST_MAX_WORKERS || '50%',
  workerIdleMemoryLimit: process.env.CI ? '256MB' : '512MB',

  // Clean up between tests
  clearMocks: true,
  restoreMocks: true,

  // Collect coverage but don't fail on low coverage during cleanup testing
  collectCoverageFrom: [
    'apps/**/*.{ts,js}',
    'libs/**/*.{ts,js}',
    '!**/*.spec.{ts,js}',
    '!**/*.e2e-spec.{ts,js}',
    '!**/node_modules/**',
    '!**/dist/**',
  ],

  // Enhanced error reporting
  verbose: true,

  // Prevent hanging by detecting open handles
  detectOpenHandles: process.env.DETECT_HANDLES === 'true',
  forceExit: false, // Never use forceExit - fix root causes instead

  // Module resolution for cleanup utilities
  moduleNameMapper: {
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@nestjs/cache-manager$': require.resolve('@nestjs/cache-manager'),
    '^cache-manager$': require.resolve('cache-manager'),
    '^cache-manager-redis-yet$': require.resolve('cache-manager-redis-yet'),
  },
};
