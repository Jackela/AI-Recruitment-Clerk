describe('Application Queries Index', () => {
  it('should export queries module', () => {
    const queries = require('./index');
    expect(queries).toBeDefined();
  });
});
