// Environment setup for integration tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce logging during tests
process.env.MONGODB_URL = process.env.MONGODB_TEST_URL || 'mongodb://localhost:27017/ai-recruitment-test';

// Test-specific configuration
process.env.JWT_SECRET = 'integration-test-jwt-secret-key';
process.env.JWT_EXPIRATION = '24h';
process.env.BCRYPT_ROUNDS = '4'; // Faster hashing for tests

// Service URLs for integration testing
process.env.RESUME_PARSER_URL = 'http://localhost:3001';
process.env.JD_EXTRACTOR_URL = 'http://localhost:3002';
process.env.SCORING_ENGINE_URL = 'http://localhost:3003';
process.env.REPORT_GENERATOR_URL = 'http://localhost:3004';

// Rate limiting - more lenient for tests
process.env.RATE_LIMIT_REQUESTS = '1000';
process.env.RATE_LIMIT_WINDOW_MS = '60000';

// Cache configuration
process.env.CACHE_TTL = '300';
process.env.CACHE_MAX = '1000';

// Test data configuration
process.env.MAX_FILE_SIZE = '10485760'; // 10MB
process.env.ALLOWED_FILE_TYPES = 'pdf,doc,docx';

// Performance testing configuration
process.env.PERFORMANCE_TEST_TIMEOUT = '60000';
process.env.LOAD_TEST_CONCURRENCY = '10';

console.log('🔧 Test environment variables configured');
console.log(`📊 Test database: ${process.env.MONGODB_URL}`);
console.log(`🚀 Node environment: ${process.env.NODE_ENV}`);