const baseProjects = [
  '<rootDir>/apps/app-gateway/jest.config.ts',
  '<rootDir>/apps/resume-parser-svc/jest.config.ts',
  '<rootDir>/apps/ai-recruitment-frontend/jest.config.ts',
  '<rootDir>/apps/scoring-engine-svc/jest.config.ts',
  '<rootDir>/apps/report-generator-svc/jest.config.ts',
  '<rootDir>/apps/jd-extractor-svc/jest.config.ts',
  '<rootDir>/libs/shared-dtos/jest.config.js',
  '<rootDir>/libs/api-contracts/jest.config.cjs',
  '<rootDir>/libs/user-management-domain/jest.config.ts',
  '<rootDir>/libs/infrastructure-shared/jest.config.ts',
  '<rootDir>/libs/candidate-scoring-domain/jest.config.ts',
  '<rootDir>/libs/ai-services-shared/jest.config.ts',
  '<rootDir>/libs/incentive-system-domain/jest.config.ts',
  '<rootDir>/libs/marketing-domain/jest.config.ts',
  '<rootDir>/libs/usage-management-domain/jest.config.ts',
  '<rootDir>/libs/job-management-domain/jest.config.ts',
  '<rootDir>/libs/resume-processing-domain/jest.config.ts',
  '<rootDir>/libs/report-generation-domain/jest.config.ts',
  '<rootDir>/libs/shared-nats-client/jest.config.ts',
  '<rootDir>/libs/configuration/jest.config.ts',
  '<rootDir>/libs/resume-dto/jest.config.ts',
  '<rootDir>/libs/service-base/jest.config.ts',
  '<rootDir>/libs/types/jest.config.ts',
];

export default {
  projects: baseProjects,
  passWithNoTests: true,
  // Jest cache configuration for CI optimization
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  restoreMocks: true,
  // Coverage aggregation configuration
  coverageDirectory: '<rootDir>/coverage',
  collectCoverage: false, // Set to false by default, enable via --coverage flag
  coverageReporters: ['json-summary', 'json', 'lcov', 'text'],
  reporters: ['default'],
  // Global coverage patterns to ensure all source files are considered
  collectCoverageFrom: [
    'apps/*/src/**/*.{ts,js}',
    'libs/*/src/**/*.{ts,js}',
    '!**/*.spec.{ts,js}',
    '!**/*.test.{ts,js}',
    '!**/*.e2e-spec.{ts,js}',
    '!**/*.integration.spec.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/index.ts',
  ],
  // Worker configuration to prevent resource exhaustion and timeouts
  maxWorkers: process.env.CI ? 2 : '50%',
  workerIdleMemoryLimit: '512MB',
  // Fail fast on timeout to prevent hanging
  testTimeout: 30000,
  // Prevent hanging by limiting test suite time
  forceExit: false, // Keep false to detect open handles
  detectOpenHandles: false,
  // Skip e2e/integration tests in default coverage run
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.e2e\\.spec\\.(ts|js)$',
    '\\.integration\\.spec\\.(ts|js)$',
    '/test/integration/',
    '/test/security/',
    '/test/performance/',
    '/test/production/',
  ],
};
