import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  console.log('🚀 Starting Integration Test Suite Global Setup');

  // Start in-memory MongoDB for testing (skip if SKIP_DB=true)
  if (process.env.SKIP_DB === 'true') {
    console.log('⏭️  SKIP_DB is true — skipping MongoMemoryServer startup');
    process.env.NODE_ENV = 'test';
    return;
  }
  const version = process.env.MONGOMS_VERSION || '7.0.5';
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
  process.env.JWT_SECRET = 'integration-test-jwt-secret';
  process.env.JWT_EXPIRATION = '1h';

  // Store MongoDB instance for teardown
  (global as any).__MONGOD__ = mongod;

  console.log(`✅ Test MongoDB started at: ${uri}`);
  console.log('🔧 Integration test environment configured');
}
