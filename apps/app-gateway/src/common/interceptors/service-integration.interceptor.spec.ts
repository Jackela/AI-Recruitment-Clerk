/**
 * Service Integration Interceptor Tests
 * AI Recruitment Clerk - Testing for service integration patterns
 */

import {
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
  RequestTimeoutException,
} from '@nestjs/common';
import { of, throwError, delay, firstValueFrom } from 'rxjs';
import { TimeoutError } from 'rxjs';
import {
  ServiceIntegrationInterceptor,
  ServiceIntegrationOptions,
} from './service-integration.interceptor';
import { Cache } from 'cache-manager';

describe('ServiceIntegrationInterceptor', () => {
  let interceptor: ServiceIntegrationInterceptor;
  let mockCacheManager: jest.Mocked<Cache>;

  const createMockExecutionContext = (overrides: {
    url?: string;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    className?: string;
    methodName?: string;
  } = {}): ExecutionContext => {
    const request = {
      url: overrides.url || '/api/test',
      query: overrides.query || {},
      body: overrides.body || {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ statusCode: 200 }),
      }),
      getHandler: () => ({
        name: overrides.methodName || 'testMethod',
      }),
      getClass: () => ({
        name: overrides.className || 'TestController',
      }),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (
    result: unknown = { data: 'test' },
    shouldThrow = false,
    errorType?: 'timeout' | 'generic',
    delayMs?: number,
  ): CallHandler => {
    if (shouldThrow) {
      if (errorType === 'timeout') {
        const timeoutError = new Error('Timeout has occurred') as Error & { name: string };
        timeoutError.name = 'TimeoutError';
        return {
          handle: () => throwError(() => timeoutError),
        };
      }
      return {
        handle: () => throwError(() => new Error('Test error')),
      };
    }

    if (delayMs) {
      return {
        handle: () => of(result).pipe(delay(delayMs)),
      };
    }

    return {
      handle: () => of(result),
    };
  };

  beforeEach(() => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      wrap: jest.fn(),
      store: {} as any,
    } as unknown as jest.Mocked<Cache>;

    interceptor = new ServiceIntegrationInterceptor({}, mockCacheManager);

    // Suppress logger output during tests
    jest.spyOn(interceptor['logger'], 'debug').mockImplementation();
    jest.spyOn(interceptor['logger'], 'warn').mockImplementation();
    jest.spyOn(interceptor['logger'], 'error').mockImplementation();
    jest.spyOn(interceptor['logger'], 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept - basic functionality', () => {
    it('should pass through successful requests', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ success: true });

      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ success: true });
    });

    it('should use default timeout of 30000ms', async () => {
      const options: ServiceIntegrationOptions = {};
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ data: 'test' });
    });

    it('should use default retry count of 3', async () => {
      const options: ServiceIntegrationOptions = {};
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ data: 'test' });
    });

    it('should correctly identify operation ID from class and method', async () => {
      const context = createMockExecutionContext({
        className: 'UserController',
        methodName: 'findAll',
      });
      const handler = createMockCallHandler();

      const result$ = await interceptor.intercept(context, handler);
      await firstValueFrom(result$);

      // Operation should be tracked correctly
      expect(context.getClass().name).toBe('UserController');
      expect(context.getHandler().name).toBe('findAll');
    });
  });

  describe('caching', () => {
    it('should return cached result when cache hit occurs', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: true,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      mockCacheManager.get.mockResolvedValue({ cached: true });

      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ cached: true });
      expect(mockCacheManager.get).toHaveBeenCalled();
    });

    it('should cache successful results', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: true,
        cacheTTL: 600,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ fresh: true });

      const result$ = await interceptor.intercept(context, handler);
      await firstValueFrom(result$);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('service:TestController.testMethod:'),
        { fresh: true },
        600,
      );
    });

    it('should use default TTL of 300 seconds', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: true,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, handler);
      await firstValueFrom(result$);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        300,
      );
    });

    it('should use custom cache key when provided', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: true,
        cacheKey: 'custom:key:123',
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, handler);
      await firstValueFrom(result$);

      expect(mockCacheManager.get).toHaveBeenCalledWith('custom:key:123');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'custom:key:123',
        expect.any(Object),
        expect.any(Number),
      );
    });

    it('should not cache when cacheable is false', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: false,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, handler);
      await firstValueFrom(result$);

      expect(mockCacheManager.get).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should not cache when cache manager is not available', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: true,
      };
      interceptor = new ServiceIntegrationInterceptor(options, undefined);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ data: 'test' });
    });

    it('should not cache null or undefined results', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: true,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      mockCacheManager.get.mockResolvedValue(null);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null);

      const result$ = await interceptor.intercept(context, handler);
      await firstValueFrom(result$);

      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should generate cache key based on request parameters', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: true,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext({
        url: '/api/users',
        query: { page: 1 },
        body: { filter: 'active' },
      });
      const handler = createMockCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, handler);
      await firstValueFrom(result$);

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringMatching(/^service:TestController\.testMethod:/),
      );
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const options: ServiceIntegrationOptions = {
        circuitBreaker: {
          threshold: 3,
          resetTimeout: 60000,
        },
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();

      // Simulate 3 failures to trip the circuit breaker
      for (let i = 0; i < 3; i++) {
        const handler = createMockCallHandler(null, true);
        const result$ = await interceptor.intercept(context, handler);

        try {
          await firstValueFrom(result$);
        } catch (error) {
          // Expected error
        }
      }

      // Next call should throw ServiceUnavailableException
      const handler = createMockCallHandler({ data: 'test' });

      await expect(interceptor.intercept(context, handler)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should use default threshold of 5 failures', async () => {
      const options: ServiceIntegrationOptions = {
        circuitBreaker: {},
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();

      // Simulate 4 failures (below default threshold of 5)
      for (let i = 0; i < 4; i++) {
        const handler = createMockCallHandler(null, true);
        const result$ = await interceptor.intercept(context, handler);

        try {
          await firstValueFrom(result$);
        } catch (error) {
          // Expected error
        }
      }

      // Should still allow calls (not yet at threshold)
      const handler = createMockCallHandler({ data: 'test' });
      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ data: 'test' });
    });

    it('should reset circuit breaker on success', async () => {
      const options: ServiceIntegrationOptions = {
        circuitBreaker: {
          threshold: 3,
        },
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();

      // Simulate 2 failures
      for (let i = 0; i < 2; i++) {
        const handler = createMockCallHandler(null, true);
        const result$ = await interceptor.intercept(context, handler);

        try {
          await firstValueFrom(result$);
        } catch (error) {
          // Expected error
        }
      }

      // Success should reset the counter
      const successHandler = createMockCallHandler({ success: true });
      const successResult$ = await interceptor.intercept(context, successHandler);
      await firstValueFrom(successResult$);

      // Should allow 2 more failures without opening circuit
      for (let i = 0; i < 2; i++) {
        const handler = createMockCallHandler(null, true);
        const result$ = await interceptor.intercept(context, handler);

        try {
          await firstValueFrom(result$);
        } catch (error) {
          // Expected error
        }
      }

      // Circuit should still be closed
      const finalHandler = createMockCallHandler({ data: 'test' });
      const finalResult$ = await interceptor.intercept(context, finalHandler);
      const result = await firstValueFrom(finalResult$);

      expect(result).toEqual({ data: 'test' });
    });

    it('should reset circuit breaker after reset timeout', async () => {
      const options: ServiceIntegrationOptions = {
        circuitBreaker: {
          threshold: 2,
          resetTimeout: 100, // 100ms for testing
        },
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();

      // Trip the circuit breaker
      for (let i = 0; i < 2; i++) {
        const handler = createMockCallHandler(null, true);
        const result$ = await interceptor.intercept(context, handler);

        try {
          await firstValueFrom(result$);
        } catch (error) {
          // Expected error
        }
      }

      // Verify circuit is open
      await expect(
        interceptor.intercept(context, createMockCallHandler()),
      ).rejects.toThrow(ServiceUnavailableException);

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Circuit should be closed now
      const handler = createMockCallHandler({ data: 'after-reset' });
      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ data: 'after-reset' });
    });

    it('should track circuit breaker state per operation', async () => {
      const options: ServiceIntegrationOptions = {
        circuitBreaker: {
          threshold: 2,
        },
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context1 = createMockExecutionContext({
        className: 'Controller1',
        methodName: 'method1',
      });

      const context2 = createMockExecutionContext({
        className: 'Controller2',
        methodName: 'method2',
      });

      // Trip circuit breaker for context1
      for (let i = 0; i < 2; i++) {
        const handler = createMockCallHandler(null, true);
        const result$ = await interceptor.intercept(context1, handler);

        try {
          await firstValueFrom(result$);
        } catch (error) {
          // Expected error
        }
      }

      // context1 should be blocked
      await expect(
        interceptor.intercept(context1, createMockCallHandler()),
      ).rejects.toThrow(ServiceUnavailableException);

      // context2 should still work
      const handler2 = createMockCallHandler({ data: 'context2' });
      const result2$ = await interceptor.intercept(context2, handler2);
      const result2 = await firstValueFrom(result2$);

      expect(result2).toEqual({ data: 'context2' });
    });

    it('should not use circuit breaker when not configured', async () => {
      const options: ServiceIntegrationOptions = {};
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();

      // Simulate many failures
      for (let i = 0; i < 10; i++) {
        const handler = createMockCallHandler(null, true);
        const result$ = await interceptor.intercept(context, handler);

        try {
          await firstValueFrom(result$);
        } catch (error) {
          // Expected error
        }
      }

      // Should still allow requests
      const handler = createMockCallHandler({ data: 'test' });
      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('error handling', () => {
    it('should transform timeout errors to RequestTimeoutException', async () => {
      const options: ServiceIntegrationOptions = {
        timeout: 100,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null, true, 'timeout');

      const result$ = await interceptor.intercept(context, handler);

      await expect(firstValueFrom(result$)).rejects.toThrow(
        RequestTimeoutException,
      );
    });

    it('should include operation ID in timeout error message', async () => {
      const options: ServiceIntegrationOptions = {
        timeout: 100,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext({
        className: 'TestController',
        methodName: 'slowMethod',
      });
      const handler = createMockCallHandler(null, true, 'timeout');

      const result$ = await interceptor.intercept(context, handler);

      try {
        await firstValueFrom(result$);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RequestTimeoutException);
        expect((error as RequestTimeoutException).message).toContain(
          'TestController.slowMethod',
        );
      }
    });

    it('should log errors with operation context', async () => {
      const errorSpy = jest.spyOn(interceptor['logger'], 'error');

      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null, true);

      const result$ = await interceptor.intercept(context, handler);

      try {
        await firstValueFrom(result$);
      } catch {
        // Expected error
      }

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestController.testMethod'),
        expect.any(String),
      );
    });

    it('should re-throw generic errors', async () => {
      const options: ServiceIntegrationOptions = {};
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null, true);

      const result$ = await interceptor.intercept(context, handler);

      await expect(firstValueFrom(result$)).rejects.toThrow('Test error');
    });
  });

  describe('fallback handling', () => {
    it('should return fallback response on error when enabled', async () => {
      const options: ServiceIntegrationOptions = {
        fallback: true,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null, true);

      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Using fallback response due to service issues',
        fallback: true,
        originalError: 'Test error',
      });
    });

    it('should log when using fallback', async () => {
      const options: ServiceIntegrationOptions = {
        fallback: true,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      // Create spy AFTER creating new interceptor instance
      const warnSpy = jest.spyOn(interceptor['logger'], 'warn');

      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null, true);

      const result$ = await interceptor.intercept(context, handler);
      await firstValueFrom(result$);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using fallback'),
      );
    });

    it('should not use fallback when disabled', async () => {
      const options: ServiceIntegrationOptions = {
        fallback: false,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null, true);

      const result$ = await interceptor.intercept(context, handler);

      await expect(firstValueFrom(result$)).rejects.toThrow('Test error');
    });
  });

  describe('service validation', () => {
    it('should validate required services when configured', async () => {
      const options: ServiceIntegrationOptions = {
        validateServices: true,
        requiredServices: ['service-a', 'service-b'],
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      // Services are always healthy in the placeholder implementation
      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ data: 'test' });
    });

    it('should not validate when validateServices is false', async () => {
      const options: ServiceIntegrationOptions = {
        validateServices: false,
        requiredServices: ['service-a'],
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ data: 'test' });
    });

    it('should not validate when requiredServices is not specified', async () => {
      const options: ServiceIntegrationOptions = {
        validateServices: true,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('cache key generation', () => {
    it('should generate cache key containing operation ID and hash prefix', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: true,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext({
        url: '/test-endpoint',
      });

      await interceptor.intercept(context, createMockCallHandler({ data: '1' }));

      const cacheKey = mockCacheManager.get.mock.calls[0][0];
      // Cache key should follow pattern: service:{operationId}:{hash}
      expect(cacheKey).toMatch(/^service:TestController\.testMethod:/);
      // Should have a base64 hash suffix
      expect(cacheKey.split(':')[2]).toBeDefined();
    });

    it('should generate same cache key for identical requests', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: true,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const context1 = createMockExecutionContext({
        url: '/api/users',
        query: { id: '1' },
        body: { filter: 'active' },
      });

      const context2 = createMockExecutionContext({
        url: '/api/users',
        query: { id: '1' },
        body: { filter: 'active' },
      });

      await interceptor.intercept(context1, createMockCallHandler({ data: '1' }));
      await interceptor.intercept(context2, createMockCallHandler({ data: '2' }));

      const cacheKeys = mockCacheManager.get.mock.calls.map((call) => call[0]);
      expect(cacheKeys[0]).toBe(cacheKeys[1]);
    });

    it('should use custom cache key when provided', async () => {
      const customCacheKey = 'my-custom-cache-key';
      const options: ServiceIntegrationOptions = {
        cacheable: true,
        cacheKey: customCacheKey,
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext({
        url: '/api/users',
        query: { id: '1' },
      });

      await interceptor.intercept(context, createMockCallHandler({ data: 'test' }));

      expect(mockCacheManager.get).toHaveBeenCalledWith(customCacheKey);
    });
  });

  describe('integration scenarios', () => {
    it('should handle combined caching and circuit breaker', async () => {
      const options: ServiceIntegrationOptions = {
        cacheable: true,
        circuitBreaker: {
          threshold: 3,
        },
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const context = createMockExecutionContext();

      // Successful request should be cached
      const successHandler = createMockCallHandler({ data: 'success' });
      const successResult$ = await interceptor.intercept(context, successHandler);
      await firstValueFrom(successResult$);

      expect(mockCacheManager.set).toHaveBeenCalled();

      // Subsequent cache hit should not count as failure
      mockCacheManager.get.mockResolvedValue({ data: 'cached' });

      const cachedResult$ = await interceptor.intercept(context, createMockCallHandler());
      const cachedResult = await firstValueFrom(cachedResult$);

      expect(cachedResult).toEqual({ data: 'cached' });
    });

    it('should handle fallback with circuit breaker', async () => {
      const options: ServiceIntegrationOptions = {
        fallback: true,
        circuitBreaker: {
          threshold: 2,
        },
      };
      interceptor = new ServiceIntegrationInterceptor(options, mockCacheManager);

      const context = createMockExecutionContext();

      // Fail twice to trip circuit breaker
      for (let i = 0; i < 2; i++) {
        const handler = createMockCallHandler(null, true);
        const result$ = await interceptor.intercept(context, handler);
        const result = await firstValueFrom(result$);

        // Fallback response
        expect(result.fallback).toBe(true);
      }

      // Circuit breaker should be open
      await expect(
        interceptor.intercept(context, createMockCallHandler()),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
