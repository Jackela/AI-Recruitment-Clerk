const { pathsToModuleNameMapper } = require('ts-jest');

module.exports = {
  displayName: 'Integration Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: false,
      isolatedModules: true,
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
        module: 'commonjs',
        target: 'ES2020',
        skipLibCheck: true,
      },
    },
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/test/integration/**/*.e2e.spec.ts',
    '<rootDir>/test/performance/**/*.e2e.spec.ts',
    '<rootDir>/test/api/**/*.spec.ts'
  ],
  
  // Module resolution
  moduleNameMapper: (() => {
    const path = require('path');
    const root = path.resolve(__dirname, '../../..');
    const map = (p) => path.join(root, p).replace(/\\/g, '/');
    return {
      '^@app/shared-dtos$': map('libs/shared-dtos/src/index.ts'),
      '^@app/shared-nats-client$': map('libs/shared-nats-client/src/index.ts'),
      '^@app/microservices-shared$': map('libs/shared-nats-client/src/index.ts'),
      '^@ai-recruitment-clerk/infrastructure-shared$': map('libs/infrastructure-shared/src/index.ts'),
      '^@ai-recruitment-clerk/ai-services-shared$': map('libs/ai-services-shared/src/index.ts'),
      '^@ai-recruitment-clerk/api-contracts$': map('libs/api-contracts/src/index.ts'),
      '^@ai-recruitment-clerk/candidate-scoring-domain$': map('libs/candidate-scoring-domain/src/index.ts'),
      '^@ai-recruitment-clerk/incentive-system-domain$': map('libs/incentive-system-domain/src/index.ts'),
      '^@ai-recruitment-clerk/job-management-domain$': map('libs/job-management-domain/src/index.ts'),
      '^@ai-recruitment-clerk/marketing-domain$': map('libs/marketing-domain/src/index.ts'),
      '^@ai-recruitment-clerk/report-generation-domain$': map('libs/report-generation-domain/src/index.ts'),
      '^@ai-recruitment-clerk/resume-processing-domain$': map('libs/resume-processing-domain/src/index.ts'),
      '^@ai-recruitment-clerk/usage-management-domain$': map('libs/usage-management-domain/src/index.ts'),
      '^@ai-recruitment-clerk/user-management-domain$': map('libs/user-management-domain/src/index.ts'),
    };
  })(),
  
  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/test/setup/test-setup.ts'],
  globalSetup: '<rootDir>/test/setup/global-setup.light.ts',
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
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // Root directory
  rootDir: '..',
  
  // Test sequence
  testSequencer: '<rootDir>/test/config/custom-sequencer.cjs',
  
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
