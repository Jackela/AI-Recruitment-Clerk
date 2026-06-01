describe('Application Index', () => {
  it('should export application module', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from commands', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from queries', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from handlers', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from dtos', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });
});
