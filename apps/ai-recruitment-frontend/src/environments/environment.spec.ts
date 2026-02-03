import { environment } from './environment.testing';

describe('environment', () => {
  it('should expose expected configuration values', () => {
    expect(environment.production).toBe(false);
    expect(environment.apiUrl).toContain('http');
    expect(environment.frontendUrl).toContain('http');
  });
});
