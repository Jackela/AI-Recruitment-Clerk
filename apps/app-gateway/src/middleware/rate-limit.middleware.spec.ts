import { RateLimitMiddleware } from './rate-limit.middleware';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;

  beforeEach(() => {
    middleware = new RateLimitMiddleware({} as any);
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware.use({} as any, {} as any, () => {})).toBeDefined();
    });
  });
});
