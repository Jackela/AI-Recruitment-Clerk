// Jest配置 - Wave 4测试框架集成 (完整版)
module.exports = {
  testEnvironment: 'node',
  projects: [
    // 基础单元测试
    {
      displayName: 'Unit Tests',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests'],
      testMatch: [
        '**/tests/**/*.spec.js',
        '**/tests/**/*.test.js'
      ],
    },
    // Angular前端测试
    {
      displayName: 'Frontend Tests',
      preset: 'jest-preset-angular',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
      roots: ['<rootDir>/apps/ai-recruitment-frontend'],
      testMatch: [
        '**/src/**/*.spec.ts',
        '**/src/**/*.test.ts'
      ],
      transform: {
        '^.+\\.(ts|mjs|js|html)$': [
          'jest-preset-angular',
          {
            tsconfig: '<rootDir>/apps/ai-recruitment-frontend/tsconfig.spec.json',
            stringifyContentPathRegex: '\\.(html|svg)$',
          },
        ],
      },
      moduleNameMapper: {
        '@app/(.*)': '<rootDir>/apps/ai-recruitment-frontend/src/app/$1',
        '@env/(.*)': '<rootDir>/apps/ai-recruitment-frontend/src/environments/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      transformIgnorePatterns: [
        'node_modules/(?!.*\\.mjs$|@angular|@ngrx|rxjs)'
      ]
    },
    // 后端服务测试
    {
      displayName: 'Backend Tests',
      testEnvironment: 'node',
      roots: ['<rootDir>/apps/app-gateway'],
      testMatch: [
        '**/src/**/*.spec.ts',
        '**/test/**/*.spec.ts'
      ],
      transform: {
        '^.+\.(ts|js)$': ['ts-jest', {
          tsconfig: '<rootDir>/apps/app-gateway/tsconfig.spec.json'
        }]
      }
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