import { CohortMiddleware } from './cohort.middleware';

describe('CohortMiddleware', () => {
  let middleware: CohortMiddleware;

  beforeEach(() => {
    middleware = new CohortMiddleware({} as any);
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware.use({} as any, {} as any, () => {})).toBeDefined();
    });
  });
});
