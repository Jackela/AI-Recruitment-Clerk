import type { Config } from 'jest';

const config: Config = {
  displayName: 'configuration',
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  passWithNoTests: true,
};

export default config;
