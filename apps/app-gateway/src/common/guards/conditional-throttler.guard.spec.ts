import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConditionalThrottlerGuard } from './conditional-throttler.guard';

/**
 * Creates a mock ExecutionContext for testing.
 */
const createExecutionContext = (
  requestOverrides: Record<string, unknown> = {},
): ExecutionContext => {
  const request = {
    headers: {},
    ip: '127.0.0.1',
    path: '/api/test',
    method: 'GET',
    ...requestOverrides,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader: jest.fn() }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    getType: () => 'http',
  } as unknown as ExecutionContext;
};

describe('ConditionalThrottlerGuard', () => {
  let guard: ConditionalThrottlerGuard;
  let configService: jest.Mocked<ConfigService>;
  let throttlerGuard: jest.Mocked<ThrottlerGuard>;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    throttlerGuard = {
      canActivate: jest.fn(),
    } as unknown as jest.Mocked<ThrottlerGuard>;

    guard = new ConditionalThrottlerGuard(configService, throttlerGuard);
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should return true when throttling is disabled', async () => {
      configService.get.mockReturnValue('false');
      const context = createExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('ENABLE_THROTTLE');
      expect(throttlerGuard.canActivate).not.toHaveBeenCalled();
    });

    it('should return true when ENABLE_THROTTLE is not set', async () => {
      configService.get.mockReturnValue(undefined);
      const context = createExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(throttlerGuard.canActivate).not.toHaveBeenCalled();
    });

    it('should return true when ENABLE_THROTTLE is empty string', async () => {
      configService.get.mockReturnValue('');
      const context = createExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(throttlerGuard.canActivate).not.toHaveBeenCalled();
    });

    it('should delegate to throttler guard when throttling is enabled', async () => {
      configService.get.mockReturnValue('true');
      throttlerGuard.canActivate.mockResolvedValue(true);
      const context = createExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(throttlerGuard.canActivate).toHaveBeenCalledWith(context);
    });

    it('should return false when throttler guard blocks request', async () => {
      configService.get.mockReturnValue('true');
      throttlerGuard.canActivate.mockResolvedValue(false);
      const context = createExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(throttlerGuard.canActivate).toHaveBeenCalledWith(context);
    });

    it('should propagate throttler guard exceptions', async () => {
      configService.get.mockReturnValue('true');
      const throttleError = new Error('Too many requests');
      throttlerGuard.canActivate.mockRejectedValue(throttleError);
      const context = createExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow('Too many requests');
    });
  });

  describe('configuration handling', () => {
    it('should check ENABLE_THROTTLE config key', async () => {
      configService.get.mockReturnValue('false');
      const context = createExecutionContext();

      await guard.canActivate(context);

      expect(configService.get).toHaveBeenCalledWith('ENABLE_THROTTLE');
    });

    it('should treat any non-true value as disabled', async () => {
      const nonTrueValues = ['false', 'FALSE', '0', 'no', 'disabled', null, undefined];

      for (const value of nonTrueValues) {
        configService.get.mockReturnValue(value);
        const context = createExecutionContext();

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(throttlerGuard.canActivate).not.toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });

    it('should only enable throttling for exact "true" string', async () => {
      configService.get.mockReturnValue('true');
      throttlerGuard.canActivate.mockResolvedValue(true);
      const context = createExecutionContext();

      await guard.canActivate(context);

      expect(throttlerGuard.canActivate).toHaveBeenCalled();
    });

    it('should not enable throttling for "TRUE" (uppercase)', async () => {
      configService.get.mockReturnValue('TRUE');
      const context = createExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(throttlerGuard.canActivate).not.toHaveBeenCalled();
    });
  });

  describe('async behavior', () => {
    it('should return a Promise', () => {
      configService.get.mockReturnValue('false');
      const context = createExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle async throttler guard response', async () => {
      configService.get.mockReturnValue('true');
      throttlerGuard.canActivate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 10)),
      );
      const context = createExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('request context', () => {
    it('should pass execution context to throttler guard unchanged', async () => {
      configService.get.mockReturnValue('true');
      throttlerGuard.canActivate.mockResolvedValue(true);

      const customRequest = { ip: '192.168.1.100', path: '/api/custom' };
      const context = createExecutionContext(customRequest);

      await guard.canActivate(context);

      expect(throttlerGuard.canActivate).toHaveBeenCalledWith(context);
    });

    it('should work with different HTTP methods', async () => {
      configService.get.mockReturnValue('true');
      throttlerGuard.canActivate.mockResolvedValue(true);

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const context = createExecutionContext({ method });
        await guard.canActivate(context);
        expect(throttlerGuard.canActivate).toHaveBeenCalledWith(context);
      }
    });
  });
});
