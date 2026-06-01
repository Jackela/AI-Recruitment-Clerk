describe('Application Layer Exports', () => {
  describe('commands', () => {
    it('should export commands module', () => {
      const commands = require('./commands/index');
      expect(commands).toBeDefined();
    });
  });

  describe('queries', () => {
    it('should export queries module', () => {
      const queries = require('./queries/index');
      expect(queries).toBeDefined();
    });
  });

  describe('handlers', () => {
    it('should export handlers module', () => {
      const handlers = require('./handlers/index');
      expect(handlers).toBeDefined();
    });
  });

  describe('dtos', () => {
    it('should export dtos module', () => {
      const dtos = require('./dtos/index');
      expect(dtos).toBeDefined();
    });
  });
});
