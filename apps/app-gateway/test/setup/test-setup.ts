
import { getTestingEnvironment } from '@ai-recruitment-clerk/configuration';

const testingEnv = getTestingEnvironment();
const integrationTimeout = testingEnv.useDocker ? 120000 : 60000;
const suppressLogs = testingEnv.suppressTestLogs;

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
jest.setTimeout(integrationTimeout);

// Suppress console output during tests (optional)
if (suppressLogs) {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Custom matchers for API testing
expect.extend({
  toBeValidApiResponse(received) {
    const pass =
      received &&
      typeof received.success === 'boolean' &&
      received.data !== undefined;

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected ${received} to be a valid API response with success and data properties`,
        pass: false,
      };
    }
  },

  toHavePerformanceWithin(received, expectedMs) {
    const pass = received && received <= expectedMs;

    if (pass) {
      return {
        message: () =>
          `Expected ${received}ms to be greater than ${expectedMs}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be within ${expectedMs}ms`,
        pass: false,
      };
    }
  },
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
      duration: endTime - startTime,
    };
  },

  // Database utilities for testing
  cleanupTestData: async (collections: string[]) => {
    // Implementation would depend on your database setup
    // This is a placeholder for cleanup logic
    console.log('🧹 Cleaning up test data from collections:', collections);
  },
};

// Type declarations for custom matchers - using proper Jest types
import '@jest/types';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidApiResponse(): R;
      toHavePerformanceWithin(expectedMs: number): R;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

console.log('🔧 Integration test setup completed');
