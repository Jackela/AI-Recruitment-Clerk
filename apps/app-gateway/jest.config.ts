export default {
  displayName: 'app-gateway',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: [
    String.raw`<rootDir>/test/.*\.e2e\.spec\.ts$`,
    String.raw`<rootDir>/src/.*\.integration\.spec\.ts$`,
    '<rootDir>/node_modules/',
  ],
  transform: {
    [String.raw`^.+\.[tj]s$`]: [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.spec.json' },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/app-gateway',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
