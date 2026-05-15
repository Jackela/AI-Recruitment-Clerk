import { SecurityHeadersMiddleware } from './security-headers.middleware';

describe('SecurityHeadersMiddleware', () => {
  let middleware: SecurityHeadersMiddleware;

  beforeEach(() => {
    middleware = new SecurityHeadersMiddleware();
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware.use({} as any, {} as any, () => {
  // Intentionally empty
})).toBeDefined();
    });
  });
});
