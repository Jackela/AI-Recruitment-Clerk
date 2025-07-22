export default {
  displayName: 'jd-extractor-svc',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/jd-extractor-svc',
<<<<<<< Updated upstream
};
=======
};
>>>>>>> Stashed changes
