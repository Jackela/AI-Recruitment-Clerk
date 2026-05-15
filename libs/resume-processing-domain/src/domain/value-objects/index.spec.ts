describe('Domain Value Objects Index', () => {
  it('should export value-objects module', () => {
    const valueObjects = require('./index');
    expect(valueObjects).toBeDefined();
  });
});
