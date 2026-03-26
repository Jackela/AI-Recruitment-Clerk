import { DualRunMiddleware } from './dual-run.middleware';

describe('DualRunMiddleware', () => {
  let middleware: DualRunMiddleware;

  beforeEach(() => {
    middleware = new DualRunMiddleware({} as any);
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware.use({} as any, {} as any, () => {
  // Intentionally empty
})).toBeDefined();
    });
  });
});
