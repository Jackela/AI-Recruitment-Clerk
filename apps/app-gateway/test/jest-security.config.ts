import type { Config } from 'jest';
import * as path from 'path';

const config: Config = {
  displayName: 'app-gateway-security-tests',
  preset: '../../../jest.preset.cjs',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/security/**/*.spec.ts'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/app-gateway/security',

  // Setup files
  setupFiles: ['<rootDir>/test/security/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup/test-setup.ts'],

  // Module resolution
  moduleNameMapper: {
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@nestjs/cache-manager$': require.resolve('@nestjs/cache-manager'),
    '^cache-manager$': require.resolve('cache-manager'),
    '^cache-manager-redis-yet$': require.resolve('cache-manager-redis-yet'),
    '^@ai-recruitment-clerk/shared-nats-client$': path.join(
      __dirname,
      '../../../libs/shared-nats-client/src/index.ts',
    ),
    '^@ai-recruitment-clerk/shared-dtos$': path.join(
      __dirname,
      '../../../libs/shared-dtos/src/index.ts',
    ),
    '^@ai-recruitment-clerk/(.*)$': path.join(
      __dirname,
      '../../../libs/$1/src/index.ts',
    ),
  },

  // Test timeout - increased for security tests
  testTimeout: 60000,

  // Performance
  maxWorkers: 1, // Run sequentially to avoid port conflicts

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,
};

export default config;
