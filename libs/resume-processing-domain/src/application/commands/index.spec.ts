describe('Application Commands Index', () => {
  it('should export commands module', () => {
    const commands = require('./index');
    expect(commands).toBeDefined();
  });
});
