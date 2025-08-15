const nxPreset = require('@nx/jest/preset').default;

module.exports = { 
  ...nxPreset,
  // Enhanced Jest configuration for process cleanup
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
  globalTeardown: '<rootDir>/../../test/global-teardown.ts',
  
  // Test environment configuration
  testEnvironment: 'node',
  testTimeout: 30000,
  
  // Force single-threaded execution to prevent handle conflicts
  maxWorkers: 1,
  
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
    '!**/dist/**'
  ],
  
  // Enhanced error reporting
  verbose: true,
  
  // Prevent hanging by detecting open handles
  detectOpenHandles: process.env.DETECT_HANDLES === 'true',
  forceExit: false, // Never use forceExit - fix root causes instead
  
  // Module resolution for cleanup utilities
  moduleNameMapping: {
    '^@test/(.*)$': '<rootDir>/test/$1'
  }
};
