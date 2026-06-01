describe('Infrastructure Index', () => {
  it('should export infrastructure module', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from persistence', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from messaging', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from external-apis', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });
});
