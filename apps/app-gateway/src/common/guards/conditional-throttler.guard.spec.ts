import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConditionalThrottlerGuard } from './conditional-throttler.guard';

describe('ConditionalThrottlerGuard', () => {
  let guard: ConditionalThrottlerGuard;
  let configService: ConfigService;
  let throttlerGuard: any;

  beforeEach(() => {
    configService = new ConfigService();
    throttlerGuard = {
      canActivate: jest.fn(),
    };
    guard = new ConditionalThrottlerGuard(configService, throttlerGuard);
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
    it('should return true when ENABLE_THROTTLE is not true', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('false');
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(throttlerGuard.canActivate).not.toHaveBeenCalled();
    });

    it('should delegate to throttlerGuard when ENABLE_THROTTLE is true', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('true');
      throttlerGuard.canActivate.mockResolvedValue(true);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(throttlerGuard.canActivate).toHaveBeenCalledWith(context);
    });

    it('should return throttlerGuard result when enabled', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('true');
      throttlerGuard.canActivate.mockResolvedValue(false);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle undefined ENABLE_THROTTLE as disabled', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should propagate error from throttlerGuard when enabled', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('true');
      throttlerGuard.canActivate.mockRejectedValue(
        new Error('Throttler error'),
      );
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Throttler error',
      );
    });
  });
});
