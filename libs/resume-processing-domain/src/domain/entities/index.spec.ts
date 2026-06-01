describe('Domain Entities Index', () => {
  it('should export entities module', () => {
    const entities = require('./index');
    expect(entities).toBeDefined();
  });
});
