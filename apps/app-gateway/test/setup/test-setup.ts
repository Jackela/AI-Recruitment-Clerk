import { Logger } from '@nestjs/common';

// Global test configuration and utilities
beforeEach(() => {
  // Reset any global state before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Configure test timeouts
jest.setTimeout(60000); // 60 seconds for integration tests

// Suppress console output during tests (optional)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Custom matchers for API testing
expect.extend({
  toBeValidApiResponse(received) {
    const pass = received && 
                 typeof received.success === 'boolean' &&
                 received.data !== undefined;
                 
    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid API response with success and data properties`,
        pass: false,
      };
    }
  },
  
  toHavePerformanceWithin(received, expectedMs) {
    const pass = received && received <= expectedMs;
    
    if (pass) {
      return {
        message: () => `Expected ${received}ms to be greater than ${expectedMs}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be within ${expectedMs}ms`,
        pass: false,
      };
    }
  }
});

// Global test utilities
(global as any).testUtils = {
  generateTestEmail: (prefix: string) => `${prefix}-${Date.now()}@test.com`,
  generateTestUserId: () => `test-user-${Date.now()}`,
  createMockFile: (size = 1024) => Buffer.alloc(size, 'test-file-content'),
  
  // Performance testing utilities
  measurePerformance: async (operation: () => Promise<any>) => {
    const startTime = Date.now();
    const result = await operation();
    const endTime = Date.now();
    
    return {
      result,
      duration: endTime - startTime
    };
  },
  
  // Database utilities for testing
  cleanupTestData: async (collections: string[]) => {
    // Implementation would depend on your database setup
    // This is a placeholder for cleanup logic
    console.log('🧹 Cleaning up test data from collections:', collections);
  }
};

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidApiResponse(): R;
      toHavePerformanceWithin(expectedMs: number): R;
    }
  }
}

console.log('🔧 Integration test setup completed');