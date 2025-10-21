export default {
  displayName: 'resume-parser-svc',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/resume-parser-svc',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '\\.(?:worker\\.min\\.mjs\\?url)$': '<rootDir>/test/pdf-worker.stub.js',
    '^pdf-parse$': '<rootDir>/../../__mocks__/pdf-parse.js',
    '^@app/(.*)$': '<rootDir>/../../libs/$1/src',
    '^@ai-recruitment-clerk/(.*)$': '<rootDir>/../../libs/$1/src',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(pdfjs-dist|pdf-parse)/)',
  ],
  maxWorkers: 1, // Run tests sequentially for MongoDB memory server
};
