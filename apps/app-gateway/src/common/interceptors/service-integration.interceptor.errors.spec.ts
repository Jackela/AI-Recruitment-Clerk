import {
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { defer, lastValueFrom, of, throwError, timer } from 'rxjs';
import { ServiceIntegrationInterceptor } from './service-integration.interceptor';

const createContext = (): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        body: { id: 'request-1' },
        path: '/api/test',
      }),
    }),
    getHandler: () => ({ name: 'sync' }),
    getClass: () => ({ name: 'IntegrationController' }),
  }) as unknown as ExecutionContext;

describe('ServiceIntegrationInterceptor error behavior', () => {
  const cacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached result when cache hit occurs', async () => {
    cacheManager.get.mockResolvedValue({ cached: true });
    const interceptor = new ServiceIntegrationInterceptor(
      { cacheable: true },
      cacheManager as never,
    );
    const next: CallHandler = { handle: jest.fn(() => of({ fresh: true })) };

    const result = await lastValueFrom(
      await interceptor.intercept(createContext(), next),
    );

    expect(result).toEqual({ cached: true });
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('executes service call when cache miss occurs and stores result', async () => {
    cacheManager.get.mockResolvedValue(undefined);
    const interceptor = new ServiceIntegrationInterceptor(
      { cacheable: true, cacheTTL: 60 },
      cacheManager as never,
    );
    const next: CallHandler = { handle: jest.fn(() => of({ fresh: true })) };

    const result = await lastValueFrom(
      await interceptor.intercept(createContext(), next),
    );

    expect(result).toEqual({ fresh: true });
    expect(cacheManager.set).toHaveBeenCalledWith(
      expect.stringContaining('IntegrationController.sync'),
      { fresh: true },
      60,
    );
  });

  it('throws timeout error when operation exceeds timeout', async () => {
    const interceptor = new ServiceIntegrationInterceptor({
      timeout: 5,
      retries: 0,
    });
    const next: CallHandler = { handle: () => timer(20) };

    await expect(
      lastValueFrom(await interceptor.intercept(createContext(), next)),
    ).rejects.toBeInstanceOf(RequestTimeoutException);
  });

  it('retries failed operations up to maxRetries', async () => {
    let attempts = 0;
    const interceptor = new ServiceIntegrationInterceptor({ retries: 2 });
    const next: CallHandler = {
      handle: () =>
        defer(() => {
          attempts++;
          if (attempts < 3) {
            return throwError(() => new Error('temporary'));
          }
          return of({ ok: true });
        }),
    };

    await expect(
      lastValueFrom(await interceptor.intercept(createContext(), next)),
    ).resolves.toEqual({ ok: true });
    expect(attempts).toBe(3);
  });

  it('throws error when all retries are exhausted', async () => {
    let attempts = 0;
    const interceptor = new ServiceIntegrationInterceptor({ retries: 2 });
    const next: CallHandler = {
      handle: () =>
        defer(() => {
          attempts++;
          return throwError(() => new Error('persistent'));
        }),
    };

    await expect(
      lastValueFrom(await interceptor.intercept(createContext(), next)),
    ).rejects.toThrow('persistent');
    expect(attempts).toBe(3);
  });

  it('returns fallback response when fallback is enabled', async () => {
    const interceptor = new ServiceIntegrationInterceptor({
      fallback: true,
      retries: 0,
    });
    const next: CallHandler = {
      handle: () => throwError(() => new Error('downstream failed')),
    };

    const result = await lastValueFrom(
      await interceptor.intercept(createContext(), next),
    );

    expect(result).toEqual({
      fallback: true,
      operationId: 'IntegrationController.sync',
      error: 'downstream failed',
    });
  });

  it('opens circuit breaker after failure threshold', async () => {
    const interceptor = new ServiceIntegrationInterceptor({
      retries: 0,
      circuitBreaker: { threshold: 1, resetTimeout: 10000 },
    });
    const next: CallHandler = {
      handle: () => throwError(() => new Error('broken')),
    };

    await expect(
      lastValueFrom(await interceptor.intercept(createContext(), next)),
    ).rejects.toThrow('broken');
    await expect(interceptor.intercept(createContext(), next)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('validates required services before operation', async () => {
    const interceptor = new ServiceIntegrationInterceptor({
      validateServices: true,
      requiredServices: ['mongo', 'nats'],
      serviceHealthChecks: {
        mongo: () => true,
        nats: () => false,
      },
    });

    await expect(
      interceptor.intercept(createContext(), { handle: () => of('ok') }),
    ).rejects.toThrow('Required services unavailable: nats');
  });
});
