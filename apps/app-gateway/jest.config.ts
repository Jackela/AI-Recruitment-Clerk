export default {
  displayName: 'app-gateway',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '<rootDir>/test/',
    '<rootDir>/src/',
  ],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/app-gateway',
};
