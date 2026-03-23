import { AuditMiddleware } from './audit.middleware';

describe('AuditMiddleware', () => {
  let middleware: AuditMiddleware;

  beforeEach(() => {
    middleware = new AuditMiddleware({} as any);
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware.use({} as any, {} as any, () => {})).toBeDefined();
    });
  });
});
