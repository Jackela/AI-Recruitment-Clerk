export default {
  displayName: 'scoring-engine-svc',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^\\./services/scoring-engine-nats\\.service$':
      '<rootDir>/src/services/scoring-engine-nats.service.stub.ts',
    '^\\.\\./services/scoring-engine-nats\\.service$':
      '<rootDir>/src/services/scoring-engine-nats.service.stub.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/scoring-engine-svc',
};
