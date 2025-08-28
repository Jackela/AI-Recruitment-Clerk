module.exports = {
  displayName: 'E2E Tests',
  testEnvironment: 'node',
  
  // Test files configuration
  testMatch: [
    '<rootDir>/tests/**/*.e2e.spec.ts',
    '<rootDir>/tests/**/*.e2e.test.ts'
  ],
  
  // TypeScript configuration
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.e2e.json'
    }]
  },
  
  // Module resolution
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../libs/shared-dtos/src/$1',
    '^@e2e/(.*)$': '<rootDir>/$1'
  },
  
  // Setup and teardown
  globalSetup: '<rootDir>/setup/global-setup.ts',
  globalTeardown: '<rootDir>/setup/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/setup/test-setup.ts'],
  
  // Test execution configuration
  testTimeout: 60000, // 60 seconds for E2E tests
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  forceExit: true,
  detectOpenHandles: true,
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '../apps/**/*.ts',
    '../libs/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.d.ts'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Reporting configuration
  reporters: [
    'default'
  ],
  
  // Performance monitoring
  verbose: true,
  bail: false, // Continue running tests even if some fail
  
  // Custom environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};