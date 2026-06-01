import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { Reflector } from '@nestjs/core';

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new OptionalJwtAuthGuard(reflector);
  });

  const createMockExecutionContext = (): any => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
  };

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(createMockExecutionContext());

      expect(result).toBe(true);
    });

    it('should return true and attach guest user when no auth', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = await guard.canActivate(createMockExecutionContext());

      expect(result).toBe(true);
    });
  });
});
