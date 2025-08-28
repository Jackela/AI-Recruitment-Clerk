import { MongoClient, Db } from 'mongodb';
import Redis from 'ioredis';

// Global test configuration
export const TEST_CONFIG = {
  MONGODB_URL: 'mongodb://testuser:testpass123@localhost:27018/ai-recruitment-test?authSource=admin',
  REDIS_URL: 'redis://localhost:6380',
  API_BASE_URL: 'http://localhost:3001',
  NATS_URL: 'nats://localhost:4223',
  
  // Test timeouts
  DEFAULT_TIMEOUT: 30000,
  LONG_TIMEOUT: 60000,
  
  // Test users
  TEST_USERS: {
    RECRUITER: {
      userId: 'test-user-1',
      email: 'testuser1@example.com',
      name: 'Test User One',
      role: 'recruiter',
      password: 'testpass123'
    },
    ADMIN: {
      userId: 'test-user-2',
      email: 'testuser2@example.com',
      name: 'Test User Two',
      role: 'admin',
      password: 'testpass123'
    }
  },
  
  // Test data
  TEST_JOBS: {
    SOFTWARE_ENGINEER: {
      jobId: 'test-job-1',
      title: 'Senior Software Engineer',
      company: 'Test Company Inc'
    },
    FRONTEND_DEVELOPER: {
      jobId: 'test-job-2',
      title: 'Frontend Developer',
      company: 'Test Startup LLC'
    }
  }
};

// Global database connections
let mongoClient: MongoClient | null = null;
let redisClient: Redis | null = null;

/**
 * Setup function run before each test file
 */
beforeAll(async () => {
  // Extend Jest timeout for E2E tests
  jest.setTimeout(TEST_CONFIG.DEFAULT_TIMEOUT);
  
  // Initialize database connections
  await initializeDatabaseConnections();
});

/**
 * Cleanup function run after each test file
 */
afterAll(async () => {
  await cleanupDatabaseConnections();
});

/**
 * Reset test data before each test
 */
beforeEach(async () => {
  await resetTestData();
});

/**
 * Initialize database connections for testing
 */
async function initializeDatabaseConnections(): Promise<void> {
  try {
    // Connect to MongoDB
    mongoClient = new MongoClient(TEST_CONFIG.MONGODB_URL);
    await mongoClient.connect();
    
    // Connect to Redis
    redisClient = new Redis(TEST_CONFIG.REDIS_URL);
    
    console.log('✅ Database connections initialized for testing');
  } catch (error) {
    console.error('❌ Failed to initialize database connections:', error);
    throw error;
  }
}

/**
 * Cleanup database connections
 */
async function cleanupDatabaseConnections(): Promise<void> {
  try {
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = null;
    }
    
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }
    
    console.log('✅ Database connections cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup database connections:', error);
  }
}

/**
 * Reset test data to initial state
 */
async function resetTestData(): Promise<void> {
  try {
    if (!mongoClient || !redisClient) {
      throw new Error('Database connections not initialized');
    }

    const db = mongoClient.db();
    
    // Clear dynamic collections but preserve initial test data
    await db.collection('resumes').deleteMany({});
    await db.collection('analytics_events').deleteMany({});
    await db.collection('reports').deleteMany({});
    
    // Clear Redis cache
    await redisClient.flushdb();
    
    console.log('✅ Test data reset completed');
  } catch (error) {
    console.error('❌ Failed to reset test data:', error);
    // Don't throw here to allow tests to continue
  }
}

/**
 * Get MongoDB database instance
 */
export function getDatabase(): Db {
  if (!mongoClient) {
    throw new Error('MongoDB connection not initialized');
  }
  return mongoClient.db();
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis connection not initialized');
  }
  return redisClient;
}

/**
 * Utility function to wait for a condition
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeout: number = 10000,
  interval: number = 500
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Utility function to generate unique test IDs
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Utility function to create test HTTP headers
 */
export function createTestHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}