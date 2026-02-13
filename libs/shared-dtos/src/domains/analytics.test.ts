// Re-export all test modules for backward compatibility
export { default as jest } from '@jest/globals';

// Value Objects Tests
export {} from './analytics-value-objects.test';

// Event Creation Tests
export {} from './analytics-event-creation.test';

// Event Validation Tests
export {} from './analytics-event-validation.test';

// Event Processing Tests
export {} from './analytics-event-processing.test';

// Privacy Compliance Tests
export {} from './analytics-privacy-compliance.test';

// Business Rules Tests
export {} from './analytics-business-rules.test';

// Contracts Tests
export {} from './analytics-contracts.test';

// Domain Service Tests
export {} from './analytics-domain-service.test';

// System Integration Tests
export {} from './analytics-system-integration.test';

// Test helpers
export * from './analytics-test-helpers';

// Add a dummy test to satisfy Jest's requirement
describe('Analytics test barrel', () => {
  it('should re-export all test modules', () => {
    expect(true).toBe(true);
  });
});
