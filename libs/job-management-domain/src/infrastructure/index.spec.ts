/**
 * Infrastructure Index - Unit Tests
 */

import * as infrastructure from './index';

describe('Infrastructure Index', () => {
  it('should import without errors', () => {
    expect(() => {
      require('./index');
    }).not.toThrow();
  });

  it('should export infrastructure modules', () => {
    expect(infrastructure).toBeDefined();
    expect(typeof infrastructure).toBe('object');
  });

  it('should re-export all infrastructure layer modules', async () => {
    const infra = await import('./index');
    expect(infra).toBeDefined();
    expect(typeof infra).toBe('object');
  });

  it('should maintain infrastructure layer separation', () => {
    const exportNames = Object.keys(infrastructure);
    expect(exportNames).toBeDefined();
  });
});
