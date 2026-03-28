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
  // 根据测试类型动态调整
  maxWorkers: process.env.CI
    ? 1
    : '50%',
    ? process.env.TEST_TYPE === 'unit'
      ? 3
      : 1
    : '50%',
  workerIdleMemoryLimit: '512MB', // 增加内存限制
  // 分层超时
  testTimeout: process.env.CI
    ? process.env.TEST_TYPE === 'integration'
      ? 120000
      : 30000
    : 30000,
  // Prevent hanging by limiting test suite time
  forceExit: true, // Force exit to prevent CI hanging
  detectOpenHandles: false,
  // Skip e2e/integration tests in default coverage run
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.e2e\\.spec\\.(ts|js)$',
    '\\.e2e-spec\\.(ts|js)$',
    '\\.integration\\.spec\\.(ts|js)$',
    '\\.integration\\.test\\.(ts|js)$',
    '-integration\\.',
    'integration\\.nats\\.spec\\.(ts|js)$',
    'service-integration',
    '/test/integration/',
    '/test/security/',
    '/test/performance/',
    '/test/production/',
    '/src/.*/.*\\.integration\\.spec\\.(ts|js)$',
    '\\.slow\\.spec\\.ts$', // 排除标记为slow的测试
  ],
};
