export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/api',
  frontendUrl: 'http://localhost:4202',
};

describe('environment configuration', () => {
  it('should expose non-production defaults', () => {
    expect(environment.production).toBe(false);
    expect(environment.apiUrl.length).toBeGreaterThan(0);
  });
});
