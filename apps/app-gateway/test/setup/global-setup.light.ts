import { getTestingEnvironment } from '@ai-recruitment-clerk/configuration';

/**
 * Performs the global setup operation.
 * @returns The result of the operation.
 */
export default async function globalSetup() {
  // Minimal global setup for performance/integration: no DB startup
  const testingEnv = getTestingEnvironment({
    skipDb: true,
    serviceName: 'app-gateway-light-suite',
  });
  process.env.NODE_ENV = 'test';
  process.env.SKIP_DB = testingEnv.skipDb ? 'true' : 'false';
  process.env.JWT_SECRET = testingEnv.jwtSecret;
  process.env.OPS_API_KEY = testingEnv.opsApiKey;
  process.env.TEST_API_KEY = testingEnv.testApiKey;
  process.env.TEST_JWT_TOKEN = testingEnv.testJwtToken;
}
