module.exports = {
  displayName: 'shared-dtos',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js'],
  testMatch: [
    '<rootDir>/src/**/*.(test|spec).(ts|js)',
    '<rootDir>/src/**/__tests__/**/*.(ts|js)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.integration\\.spec\\.(ts|js)$',
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.(ts|js)',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/**/index.ts',
  ],
  coverageDirectory: '../../coverage/libs/shared-dtos',
};
