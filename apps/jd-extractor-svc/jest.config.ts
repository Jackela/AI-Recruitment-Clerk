export default {
  displayName: 'jd-extractor-svc',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@ai-recruitment-clerk/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
    '^\\./services/jd-extractor-nats.service$':
      '<rootDir>/src/services/jd-extractor-nats.service.stub.ts',
    '^\\.\\./services/jd-extractor-nats.service$':
      '<rootDir>/src/services/jd-extractor-nats.service.stub.ts',
  },
  coverageDirectory: '../../coverage/apps/jd-extractor-svc',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/index.ts',
    '!src/testing/**',
    '!src/**/test-fixtures.ts',
    '!src/**/extraction.service.contracts.ts',
    '!src/services/jd-extractor-nats.service.stub.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
};
