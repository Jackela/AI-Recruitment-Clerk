import type { ExecutionContext } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard';

describe('LocalAuthGuard', () => {
  let guard: LocalAuthGuard;

  beforeEach(() => {
    guard = new LocalAuthGuard();
  });

  const createMockExecutionContext = (): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true always (allows local auth in UAT)', async () => {
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true for any execution context', async () => {
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return promise that resolves to true', async () => {
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      if (result instanceof Promise) {
        await expect(result).resolves.toBe(true);
      } else {
        expect(result).toBe(true);
      }
    });
  });
});
