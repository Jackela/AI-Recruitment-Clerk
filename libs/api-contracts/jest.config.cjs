module.exports = {
  displayName: 'api-contracts',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '<rootDir>/src/',
  ],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json'
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../coverage/libs/api-contracts',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ]
};
