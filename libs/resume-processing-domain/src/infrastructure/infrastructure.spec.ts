describe('Infrastructure Layer Exports', () => {
  describe('persistence', () => {
    it('should export persistence module', () => {
      const persistence = require('./persistence/index');
      expect(persistence).toBeDefined();
    });
  });

  describe('messaging', () => {
    it('should export messaging module', () => {
      const messaging = require('./messaging/index');
      expect(messaging).toBeDefined();
    });
  });

  describe('external-apis', () => {
    it('should export external-apis module', () => {
      const externalApis = require('./external-apis/index');
      expect(externalApis).toBeDefined();
    });
  });
});
