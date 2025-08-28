import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  console.log('🚀 Starting Integration Test Suite Global Setup');
  
  // Start in-memory MongoDB for testing
  const mongod = new MongoMemoryServer({
    binary: {
      version: '4.4.24', // Use older version that's faster to download/start
      skipMD5: true,
    },
    instance: {
      dbName: 'ai-recruitment-integration-test',
      port: 27018, // Use different port to avoid conflicts
      storageEngine: 'ephemeralForTest', // Faster for tests
    },
  });
  
  await mongod.start();
  const uri = mongod.getUri();
  
  // Set environment variables for tests
  process.env.MONGODB_TEST_URL = uri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'integration-test-jwt-secret';
  process.env.JWT_EXPIRATION = '1h';
  
  // Store MongoDB instance for teardown
  (global as any).__MONGOD__ = mongod;
  
  console.log(`✅ Test MongoDB started at: ${uri}`);
  console.log('🔧 Integration test environment configured');
}