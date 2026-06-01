describe('Domain Aggregates Index', () => {
  it('should export aggregates module', () => {
    const aggregates = require('./index');
    expect(aggregates).toBeDefined();
  });
});
