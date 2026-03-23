import { DatabaseOptimizationMiddleware } from './database-optimization.middleware';

describe('DatabaseOptimizationMiddleware', () => {
  let middleware: DatabaseOptimizationMiddleware;

  beforeEach(() => {
    middleware = new DatabaseOptimizationMiddleware({} as any);
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware.use({} as any, {} as any, () => {})).toBeDefined();
    });
  });
});
