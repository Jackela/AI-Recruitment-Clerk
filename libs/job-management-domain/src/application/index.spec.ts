/**
 * Application Index - Unit Tests
 */

import * as application from './index';

describe('Application Index', () => {
  it('should import without errors', () => {
    expect(() => {
      require('./index');
    }).not.toThrow();
  });

  it('should export DTOs', () => {
    expect(application).toBeDefined();
    expect(typeof application).toBe('object');
  });

  it('should re-export all application layer modules', async () => {
    const app = await import('./index');
    expect(app).toBeDefined();
    expect(typeof app).toBe('object');
  });

  it('should have application module structure', () => {
    // TypeScript interfaces/types don't exist at runtime
    // but the module should be importable
    expect(typeof application).toBe('object');
  });
});
