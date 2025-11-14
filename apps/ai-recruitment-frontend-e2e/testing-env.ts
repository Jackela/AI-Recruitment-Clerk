import { createRequire } from 'node:module';
import type { TestingEnvironmentConfig } from '@ai-recruitment-clerk/configuration';

const require = createRequire(import.meta.url);
type ConfigurationApi = {
  getTestingEnvironment: (
    overrides?: Partial<TestingEnvironmentConfig>,
  ) => TestingEnvironmentConfig;
};

const configuration = require('@ai-recruitment-clerk/configuration') as ConfigurationApi;

export const { getTestingEnvironment } = configuration;
