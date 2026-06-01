import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ErrorType } from '../common/error-handling.patterns';
import { EnhancedAppException } from './enhanced-error-types';
import { ErrorRecoveryInterceptor } from './error-interceptors';

const createContext = (): ExecutionContext =>
  ({
    getHandler: () => ({ name: 'sync' }),
    getClass: () => ({ name: 'IntegrationController' }),
  }) as unknown as ExecutionContext;

describe('ErrorRecoveryInterceptor recovery behavior', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows operation when circuit breaker is closed', async () => {
    const interceptor = new ErrorRecoveryInterceptor('gateway');

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext(), { handle: () => of('ok') }),
      ),
    ).resolves.toBe('ok');
  });

  it('records failures and opens circuit breaker after threshold', async () => {
    const interceptor = new ErrorRecoveryInterceptor('gateway', {
      enableCircuitBreaker: true,
      failureThreshold: 2,
      recoveryTimeout: 1000,
    });
    const error = new EnhancedAppException(
      ErrorType.EXTERNAL_SERVICE,
      'DOWNSTREAM_FAILED',
      'Downstream failed',
    );
    const failingHandler: CallHandler = {
      handle: () => throwError(() => error),
    };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(), failingHandler)),
    ).rejects.toBe(error);
    await expect(
      lastValueFrom(interceptor.intercept(createContext(), failingHandler)),
    ).rejects.toBe(error);

    await expect(
      lastValueFrom(interceptor.intercept(createContext(), failingHandler)),
    ).rejects.toMatchObject({
      enhancedDetails: expect.objectContaining({
        code: 'CIRCUIT_BREAKER_OPEN',
      }),
    });
  });

  it('transitions to half-open after recovery timeout', async () => {
    const interceptor = new ErrorRecoveryInterceptor('gateway', {
      enableCircuitBreaker: true,
      failureThreshold: 1,
      recoveryTimeout: 100,
    });

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext(), {
          handle: () => throwError(() => new Error('fail')),
        }),
      ),
    ).rejects.toThrow('fail');

    const circuitBreakers = (
      interceptor as never as {
        circuitBreakers: Map<string, { lastFailure: number }>;
      }
    ).circuitBreakers;
    const circuit = circuitBreakers.get('IntegrationController.sync');
    if (circuit) {
      circuit.lastFailure = Date.now() - 101;
    }

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext(), { handle: () => of('ok') }),
      ),
    ).resolves.toBe('ok');
  });

  it('resets circuit breaker on successful operation', async () => {
    const interceptor = new ErrorRecoveryInterceptor('gateway', {
      enableCircuitBreaker: true,
      failureThreshold: 2,
    });

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext(), {
          handle: () => throwError(() => new Error('fail')),
        }),
      ),
    ).rejects.toThrow('fail');

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext(), { handle: () => of('ok') }),
      ),
    ).resolves.toBe('ok');
  });

  it('enhances errors with recovery strategies', async () => {
    const interceptor = new ErrorRecoveryInterceptor('gateway', {
      enableCircuitBreaker: true,
      enableRetry: true,
      maxRetries: 3,
    });
    const error = new EnhancedAppException(
      ErrorType.EXTERNAL_SERVICE,
      'CALL_FAILED',
      'Call failed',
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext(), {
          handle: () => throwError(() => error),
        }),
      ),
    ).rejects.toBe(error);

    expect(error.enhancedDetails.recoveryStrategies).toContain(
      'Retry operation (max 3 attempts)',
    );
  });
});
