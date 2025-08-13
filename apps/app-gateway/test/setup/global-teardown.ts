export default async function globalTeardown() {
  console.log('🧹 Starting Integration Test Suite Global Teardown');
  
  const mongod = (global as any).__MONGOD__;
  
  if (mongod) {
    console.log('🔥 Stopping test MongoDB instance');
    await mongod.stop();
    console.log('✅ Test MongoDB stopped successfully');
  }
  
  // Clean up environment variables
  delete process.env.MONGODB_TEST_URL;
  delete process.env.JWT_SECRET;
  delete process.env.JWT_EXPIRATION;
  
  console.log('✅ Integration test environment cleanup completed');
}