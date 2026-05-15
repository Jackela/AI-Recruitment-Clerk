describe('Report Generation Domain Root', () => {
  it('should export main module', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from domain', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from application', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should re-export from infrastructure', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });
});
