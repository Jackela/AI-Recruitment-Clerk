import { MongoMemoryServer } from 'mongodb-memory-server';
import { getTestingEnvironment } from '@ai-recruitment-clerk/configuration';

/**
 * Performs the global setup operation.
 * @returns The result of the operation.
 */
export default async function globalSetup() {
  console.log('🚀 Starting Integration Test Suite Global Setup');
  const testingEnv = getTestingEnvironment({
    serviceName: 'app-gateway-integration',
  });

  // Start in-memory MongoDB for testing (skip if SKIP_DB=true)
  if (testingEnv.skipDb) {
    console.log('⏭️  SKIP_DB is true — skipping MongoMemoryServer startup');
    process.env.NODE_ENV = 'test';
    return;
  }
  const version = testingEnv.mongoVersion;
  const mongod = await MongoMemoryServer.create({
    binary: {
      version,
    },
    instance: {
      dbName: 'ai-recruitment-integration-test',
      storageEngine: 'ephemeralForTest',
    },
  });
  const uri = mongod.getUri();

  // Set environment variables for tests
  process.env.MONGODB_TEST_URL = uri;
  process.env.MONGO_URL = uri; // keep AppModule and helpers consistent
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = testingEnv.jwtSecret;
  process.env.JWT_EXPIRATION = '1h';
  process.env.OPS_API_KEY = testingEnv.opsApiKey;
  process.env.TEST_API_KEY = testingEnv.testApiKey;
  process.env.TEST_JWT_TOKEN = testingEnv.testJwtToken;

  // Store MongoDB instance for teardown
  (global as any).__MONGOD__ = mongod;

  console.log(`✅ Test MongoDB started at: ${uri}`);
  console.log('🔧 Integration test environment configured');
}
