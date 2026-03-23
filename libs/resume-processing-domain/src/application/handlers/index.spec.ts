describe('Application Handlers Index', () => {
  it('should export handlers module', () => {
    const handlers = require('./index');
    expect(handlers).toBeDefined();
  });
});
