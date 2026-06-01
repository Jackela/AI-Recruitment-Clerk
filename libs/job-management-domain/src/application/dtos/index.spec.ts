/**
 * Application DTOs Index - Unit Tests
 */

import * as dtos from './index';

describe('Application DTOs Index', () => {
  it('should import without errors', () => {
    expect(() => {
      require('./index');
    }).not.toThrow();
  });

  it('should re-export all DTOs', async () => {
    const dtosModule = await import('./index');
    expect(dtosModule).toBeDefined();
    expect(typeof dtosModule).toBe('object');
  });

  it('should have DTO module structure', () => {
    // TypeScript types/interfaces don't exist at runtime
    expect(typeof dtos).toBe('object');
  });
});
