import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ErrorType } from '../common/error-handling.patterns';
import { EnhancedAppException } from './enhanced-error-types';
import { ErrorLoggingInterceptor } from './error-interceptors';
import { StructuredLoggerFactory } from './structured-logging';

const createContext = (): ExecutionContext =>
  ({
    getHandler: () => ({ name: 'create' }),
    getClass: () => ({ name: 'JobsController' }),
  }) as unknown as ExecutionContext;

describe('ErrorLoggingInterceptor logging behavior', () => {
  const logger = {
    logOperationStart: jest.fn().mockReturnValue({ startTime: 100 }),
    logOperationComplete: jest.fn(),
    logError: jest.fn(),
  };

  beforeEach(() => {
    jest
      .spyOn(StructuredLoggerFactory, 'getLogger')
      .mockReturnValue(logger as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs operation start metrics', async () => {
    const interceptor = new ErrorLoggingInterceptor('app-gateway');
    const next: CallHandler = { handle: () => of({ id: 'job-1' }) };

    await lastValueFrom(interceptor.intercept(createContext(), next));

    expect(logger.logOperationStart).toHaveBeenCalledWith(
      'JobsController.create',
    );
  });

  it('logs successful operation completion', async () => {
    const interceptor = new ErrorLoggingInterceptor('app-gateway');
    const next: CallHandler = { handle: () => of({ id: 'job-1' }) };

    await lastValueFrom(interceptor.intercept(createContext(), next));

    expect(logger.logOperationComplete).toHaveBeenCalledWith(
      'JobsController.create',
      { startTime: 100 },
      true,
      expect.objectContaining({ resultType: 'object', hasResult: true }),
    );
  });

  it('logs operation failure with error details', async () => {
    const interceptor = new ErrorLoggingInterceptor('app-gateway');
    const error = new EnhancedAppException(
      ErrorType.SYSTEM,
      'CREATE_FAILED',
      'Create failed',
    );
    const next: CallHandler = { handle: () => throwError(() => error) };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(), next)),
    ).rejects.toBe(error);

    expect(logger.logOperationComplete).toHaveBeenCalledWith(
      'JobsController.create',
      { startTime: 100 },
      false,
      expect.objectContaining({
        errorType: 'EnhancedAppException',
        errorMessage: 'Create failed',
      }),
    );
    expect(logger.logError).toHaveBeenCalledWith(
      error,
      'JobsController.create',
    );
  });
});
