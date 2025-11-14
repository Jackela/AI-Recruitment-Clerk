export default {
  displayName: 'report-generator-svc',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '<rootDir>/src/report-generator/report-generator\\.service\\.spec\\.ts$',
  ],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/report-generator-svc',
};
