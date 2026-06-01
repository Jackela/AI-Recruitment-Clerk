import { RolloutMiddleware } from './rollout.middleware';

describe('RolloutMiddleware', () => {
  let middleware: RolloutMiddleware;

  beforeEach(() => {
    middleware = new RolloutMiddleware({} as any);
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware.use({} as any, {} as any, () => {
  // Intentionally empty
})).toBeDefined();
    });
  });
});
