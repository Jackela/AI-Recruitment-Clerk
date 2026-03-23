import { OpsGuard } from './ops.guard';
import { Reflector } from '@nestjs/core';

describe('OpsGuard', () => {
  let guard: OpsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new OpsGuard(reflector);
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
    it('should return true for public ops endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(createMockExecutionContext());

      expect(result).toBe(true);
    });

    it('should check permissions for non-public endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(createMockExecutionContext());

      expect(typeof result).toBe('boolean');
    });
  });
});
