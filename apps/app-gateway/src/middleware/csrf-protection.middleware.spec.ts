import { CsrfProtectionMiddleware } from './csrf-protection.middleware';

describe('CsrfProtectionMiddleware', () => {
  let middleware: CsrfProtectionMiddleware;

  beforeEach(() => {
    middleware = new CsrfProtectionMiddleware({} as any);
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware.use({} as any, {} as any, () => {
  // Intentionally empty
})).toBeDefined();
    });
  });
});
