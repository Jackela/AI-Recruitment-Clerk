// Jest配置 - Wave 4测试框架集成 (完整版)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  projects: [
    // Keep fast unit smoke tests in CI; skip heavy app suites until stabilized
    {
      displayName: 'Unit Tests',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/apps', '<rootDir>/libs'],
      testMatch: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/tests/**/*.spec.js',
        '**/tests/**/*.test.js'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '\\.e2e-spec\\.ts$',
        '\\.e2e\\.spec\\.ts$',
        '/.*-e2e/',
        '/e2e/',
        '/test/.*\\.e2e\\.',
        'playwright'
      ],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: 'tsconfig.base.json'
        }],
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      moduleNameMapper: {
        '^@app/shared-dtos$': '<rootDir>/libs/shared-dtos/src/index.ts',
        '^@app/shared-nats-client$': '<rootDir>/libs/shared-nats-client/src/index.ts',
        '^@app/microservices-shared$': '<rootDir>/libs/shared-nats-client/src/index.ts',
        '^@ai-recruitment-clerk/infrastructure-shared$': '<rootDir>/libs/infrastructure-shared/src/index.ts',
        '^@ai-recruitment-clerk/ai-services-shared$': '<rootDir>/libs/ai-services-shared/src/index.ts',
        '^@ai-recruitment-clerk/api-contracts$': '<rootDir>/libs/api-contracts/src/index.ts',
        '^@ai-recruitment-clerk/candidate-scoring-domain$': '<rootDir>/libs/candidate-scoring-domain/src/index.ts',
        '^@ai-recruitment-clerk/user-management-domain$': '<rootDir>/libs/user-management-domain/src/index.ts',
        '^@ai-recruitment-clerk/shared-dtos$': '<rootDir>/libs/shared-dtos/src/index.ts'
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testEnvironment: 'node',
      extensionsToTreatAsEsm: ['.ts'],
    }
  ],
  collectCoverageFrom: [
    'apps/**/*.{ts,js}',
    '!apps/**/*.spec.ts',
    '!apps/**/*.test.ts',
    '!apps/**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'json-summary'
  ],
  testTimeout: 10000,
  maxWorkers: '50%',
  verbose: true,
  
  // CI模式优化
  passWithNoTests: true,
  bail: process.env.CI === 'true' ? 1 : 0,
  collectCoverage: process.env.CI === 'true',
  
  // 处理进程清理
  forceExit: false,
  detectOpenHandles: false,
  
  // 性能优化
  cache: true
};
