/**
 * Performs the global teardown operation.
 * @returns The result of the operation.
 */
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
  delete process.env.OPS_API_KEY;
  delete process.env.TEST_API_KEY;
  delete process.env.TEST_JWT_TOKEN;

  console.log('✅ Integration test environment cleanup completed');
}
