/**
 * Domain Services Index - Unit Tests
 */

import * as domainServices from './index';

describe('Domain Services Index', () => {
  it('should import without errors', () => {
    expect(() => {
      require('./index');
    }).not.toThrow();
  });

  it('should have JobService as a constructor', () => {
    expect(typeof domainServices.JobService).toBe('function');
    // Check if it's a class constructor
    expect(domainServices.JobService.prototype).toBeDefined();
  });

  it('should re-export all service types', async () => {
    const services = await import('./index');
    expect(services).toBeDefined();
    expect(typeof services).toBe('object');
    expect(services.JobService).toBeDefined();
  });

  it('should maintain service exports structure', () => {
    // Only JobService exists at runtime, interfaces are TypeScript-only
    expect(domainServices).toHaveProperty('JobService');
    expect(typeof domainServices.JobService).toBe('function');
  });
});
