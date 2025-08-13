module.exports = {
  displayName: 'Marketing Features Test Suite',
  projects: [
    {
      displayName: 'Frontend Marketing Tests',
      testMatch: [
        '<rootDir>/apps/ai-recruitment-frontend/src/app/services/marketing/**/*.spec.ts',
        '<rootDir>/apps/ai-recruitment-frontend/src/app/pages/marketing/**/*.spec.ts'
      ],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/test/setup-tests.ts'],
      collectCoverageFrom: [
        'apps/ai-recruitment-frontend/src/app/services/marketing/**/*.ts',
        'apps/ai-recruitment-frontend/src/app/pages/marketing/**/*.ts',
        '!**/*.spec.ts',
        '!**/*.module.ts',
        '!**/index.ts'
      ]
    },
    {
      displayName: 'Backend Marketing Tests',
      testMatch: [
        '<rootDir>/apps/app-gateway/src/marketing/**/*.spec.ts'
      ],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/test/setup-backend-tests.ts'],
      collectCoverageFrom: [
        'apps/app-gateway/src/marketing/**/*.ts',
        '!**/*.spec.ts',
        '!**/*.module.ts',
        '!**/index.ts'
      ]
    },
    {
      displayName: 'Marketing Security Tests',
      testMatch: [
        '<rootDir>/test/security/**/*.spec.ts'
      ],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/test/setup-backend-tests.ts'],
      moduleNameMapper: {
        '^@app/shared-dtos$': '<rootDir>/libs/shared-dtos/src/index'
      },
      collectCoverageFrom: [
        'apps/app-gateway/src/marketing/**/*.ts',
        '!**/*.spec.ts',
        '!**/*.module.ts',
        '!**/index.ts'
      ]
    },
    {
      displayName: 'Marketing Integration Tests',
      testMatch: [
        '<rootDir>/test/integration/**/*.spec.ts'
      ],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/test/setup-backend-tests.ts'],
      moduleNameMapper: {
        '^@app/shared-dtos$': '<rootDir>/libs/shared-dtos/src/index'
      },
      collectCoverageFrom: [
        'apps/app-gateway/src/marketing/**/*.ts',
        '!**/*.spec.ts',
        '!**/*.module.ts',
        '!**/index.ts'
      ]
    }
  ],
  collectCoverageFrom: [
    'apps/ai-recruitment-frontend/src/app/services/marketing/**/*.ts',
    'apps/ai-recruitment-frontend/src/app/pages/marketing/**/*.ts',
    'apps/app-gateway/src/marketing/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000,
  maxWorkers: '50%',
  verbose: true,
  bail: false,
  passWithNoTests: false
};