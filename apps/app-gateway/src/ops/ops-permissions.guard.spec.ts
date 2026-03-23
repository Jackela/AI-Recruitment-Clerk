import { OpsPermissionsGuard } from './ops-permissions.guard';
import { Reflector } from '@nestjs/core';

describe('OpsPermissionsGuard', () => {
  let guard: OpsPermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new OpsPermissionsGuard(reflector);
  });

  const createMockExecutionContext = (
    user: any = { permissions: ['ops:admin'] },
  ): any => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
  };

  describe('canActivate', () => {
    it('should return true when user has ops permissions', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ops:admin']);

      const result = guard.canActivate(createMockExecutionContext());

      expect(result).toBe(true);
    });

    it('should return false when user lacks permissions', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ops:admin']);

      const result = guard.canActivate(
        createMockExecutionContext({ permissions: [] }),
      );

      expect(result).toBe(false);
    });

    it('should return true when no permissions required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(createMockExecutionContext());

      expect(result).toBe(true);
    });
  });
});
