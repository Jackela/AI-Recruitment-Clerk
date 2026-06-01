describe('Domain Layer Exports', () => {
  describe('aggregates', () => {
    it('should export aggregates module', () => {
      const aggregates = require('./aggregates/index');
      expect(aggregates).toBeDefined();
    });
  });

  describe('value-objects', () => {
    it('should export value-objects module', () => {
      const valueObjects = require('./value-objects/index');
      expect(valueObjects).toBeDefined();
    });
  });

  describe('domain-services', () => {
    it('should export domain-services module', () => {
      const domainServices = require('./domain-services/index');
      expect(domainServices).toBeDefined();
    });
  });

  describe('domain-events', () => {
    it('should export domain-events module', () => {
      const domainEvents = require('./domain-events/index');
      expect(domainEvents).toBeDefined();
    });
  });

  describe('entities', () => {
    it('should export entities module', () => {
      const entities = require('./entities/index');
      expect(entities).toBeDefined();
    });
  });
});
