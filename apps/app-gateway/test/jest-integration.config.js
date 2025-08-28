const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../tsconfig.json');

module.exports = {
  displayName: 'Integration Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/test/integration/**/*.e2e.spec.ts',
    '<rootDir>/test/performance/**/*.e2e.spec.ts',
    '<rootDir>/test/api/**/*.spec.ts'
  ],
  
  // Module resolution
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/../../../'
  }),
  
  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/test/setup/test-setup.ts'],
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/setup/global-teardown.ts',
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e.spec.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  
  // Timeout for integration tests
  testTimeout: 60000, // 60 seconds
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'integration-test-results.xml',
        suiteName: 'Integration Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: 'integration-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'AI Recruitment Clerk - Integration Test Report'
      }
    ]
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // Root directory
  rootDir: '..',
  
  // Test sequence
  testSequencer: '<rootDir>/test/config/custom-sequencer.js',
  
  // Environment variables
  setupFiles: ['<rootDir>/test/config/env-setup.js'],
  
  // Performance monitoring
  maxWorkers: '50%',
  detectOpenHandles: true,
  forceExit: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};