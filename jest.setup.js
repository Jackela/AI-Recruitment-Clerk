// Jest global setup - Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Pin MongoDB binary version for mongodb-memory-server to avoid fassert issues on some platforms
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.5';
process.env.MONGOMS_DISABLE_MD5_CHECK = process.env.MONGOMS_DISABLE_MD5_CHECK || '1';

// Test environment configuration for microservices
process.env.NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
process.env.MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/ai-recruitment-test';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-api-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-32-characters';

// Mock external services in test mode
process.env.MOCK_EXTERNAL_SERVICES = 'true';
process.env.DISABLE_NATS = 'true';
process.env.USE_REDIS_CACHE = 'false';

// Global test configuration
global.beforeAll = global.beforeAll || (() => {});
global.afterAll = global.afterAll || (() => {});
