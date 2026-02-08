export default {
  displayName: 'jd-extractor-svc',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^\\./services/jd-extractor-nats.service$':
      '<rootDir>/src/services/jd-extractor-nats.service.stub.ts',
    '^\\.\\./services/jd-extractor-nats.service$':
      '<rootDir>/src/services/jd-extractor-nats.service.stub.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/jd-extractor-svc',
};
