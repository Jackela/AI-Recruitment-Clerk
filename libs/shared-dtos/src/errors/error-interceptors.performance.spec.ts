import { Logger } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ErrorCorrelationManager } from './error-correlation';
import { PerformanceTrackingInterceptor } from './error-interceptors';
import { StructuredLoggerFactory } from './structured-logging';

const createContext = (): ExecutionContext =>
  ({
    getHandler: () => ({ name: 'score' }),
    getClass: () => ({ name: 'ScoringController' }),
  }) as unknown as ExecutionContext;

describe('PerformanceTrackingInterceptor performance behavior', () => {
  const logger = {
    logPerformance: jest.fn(),
  };

  beforeEach(() => {
    jest
      .spyOn(StructuredLoggerFactory, 'getLogger')
      .mockReturnValue(logger as never);
  });

  afterEach(() => {
    ErrorCorrelationManager.clearContext();
    jest.restoreAllMocks();
  });

  it('logs performance metrics for normal operations', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1100);
    const interceptor = new PerformanceTrackingInterceptor('scoring', {
      warnThreshold: 500,
      errorThreshold: 1000,
    });

    await lastValueFrom(
      interceptor.intercept(createContext(), { handle: () => of('ok') }),
    );

    expect(logger.logPerformance).toHaveBeenCalledWith(
      'ScoringController.score',
      expect.objectContaining({ startTime: 1000, duration: 100 }),
      expect.objectContaining({ memoryDelta: expect.any(Number) }),
    );
  });

  it('logs warning for operations exceeding warn threshold', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1250);
    const interceptor = new PerformanceTrackingInterceptor('scoring', {
      warnThreshold: 100,
      errorThreshold: 500,
    });

    await lastValueFrom(
      interceptor.intercept(createContext(), { handle: () => of('ok') }),
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('PERFORMANCE WARNING'),
      expect.objectContaining({ duration: 250 }),
    );
  });

  it('logs error for operations exceeding error threshold', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1800);
    const interceptor = new PerformanceTrackingInterceptor('scoring', {
      warnThreshold: 100,
      errorThreshold: 500,
    });

    await lastValueFrom(
      interceptor.intercept(createContext(), { handle: () => of('ok') }),
    );

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('PERFORMANCE ALERT'),
      expect.objectContaining({ duration: 800 }),
    );
  });

  it('tracks memory usage during operation', async () => {
    const interceptor = new PerformanceTrackingInterceptor('scoring');

    await lastValueFrom(
      interceptor.intercept(createContext(), { handle: () => of('ok') }),
    );

    expect(logger.logPerformance).toHaveBeenCalledWith(
      'ScoringController.score',
      expect.objectContaining({
        memoryUsage: expect.objectContaining({
          heapUsed: expect.any(Number),
        }),
      }),
      expect.any(Object),
    );
  });
});
