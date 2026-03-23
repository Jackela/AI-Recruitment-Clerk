describe('Domain Index', () => {
  it('should export domain module', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from aggregates', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from value-objects', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from domain-services', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from domain-events', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from entities', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });
});
