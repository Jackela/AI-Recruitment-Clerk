import { Logger as NestLogger } from '@nestjs/common';
import { Logger } from './logger.service';

describe('Logger structured error behavior', () => {
  let fatalSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    const prototype = NestLogger.prototype as NestLogger & {
      fatal?: (message: string, context?: string) => void;
    };
    if (!prototype.fatal) {
      prototype.fatal = jest.fn();
    }
    fatalSpy = jest.spyOn(prototype, 'fatal').mockImplementation();
    errorSpy = jest.spyOn(NestLogger.prototype, 'error').mockImplementation();
    warnSpy = jest.spyOn(NestLogger.prototype, 'warn').mockImplementation();
    logSpy = jest.spyOn(NestLogger.prototype, 'log').mockImplementation();
    debugSpy = jest.spyOn(NestLogger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs critical severity error with fatal level', () => {
    new Logger('Gateway').logError('Critical failure', {
      severity: 'critical',
    });

    expect(fatalSpy).toHaveBeenCalledWith(
      'Critical failure',
      expect.stringContaining('"severity":"critical"'),
    );
  });

  it('logs high severity error with error level', () => {
    const error = new Error('boom');

    new Logger('Gateway').logError('High failure', { severity: 'high' }, error);

    expect(errorSpy).toHaveBeenCalledWith(
      'High failure',
      error,
      expect.stringContaining('"severity":"high"'),
    );
  });

  it('logs medium severity error with warn level', () => {
    new Logger('Gateway').logError('Medium failure', {
      severity: 'medium',
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'Medium failure',
      expect.stringContaining('"severity":"medium"'),
    );
  });

  it('logs low severity error with debug level', () => {
    new Logger('Gateway').logError('Low failure', {
      severity: 'low',
    });

    expect(debugSpy).toHaveBeenCalledWith(
      'Low failure',
      expect.stringContaining('"severity":"low"'),
    );
  });

  it('logs error with correlation context', () => {
    new Logger('Gateway').logError('Correlated failure', {
      severity: 'high',
      traceId: 'trace-1',
      requestId: 'req-1',
      userId: 'user-1',
      operation: 'jobs.create',
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[jobs.create] trace:trace-1 req:req-1 user:user-1',
      ),
      undefined,
      expect.stringContaining('"requestId":"req-1"'),
    );
  });

  it('logs error with business and user impact information', () => {
    new Logger('Gateway').logError('Impact failure', {
      severity: 'high',
      businessImpact: 'high',
      userImpact: 'severe',
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Impact failure',
      undefined,
      expect.stringContaining('"businessImpact":"high"'),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'Impact failure',
      undefined,
      expect.stringContaining('"userImpact":"severe"'),
    );
  });

  it('logs error with recovery strategies', () => {
    new Logger('Gateway').logError('Recoverable failure', {
      severity: 'medium',
      recoveryStrategies: ['Retry', 'Use fallback'],
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'Recoverable failure',
      expect.stringContaining('"recoveryStrategies":["Retry","Use fallback"]'),
    );
  });

  it.each([
    ['Circuit breaker opened', { operation: 'breaker.open' }],
    ['Fallback used', { operation: 'fallback.use' }],
    ['Retry attempted', { operation: 'retry.attempt' }],
    ['Performance threshold exceeded', { operation: 'performance.warn' }],
  ])('logs warning: %s', (message, context) => {
    new Logger('Gateway').warn(message, context);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(message),
      expect.stringContaining(`"operation":"${context.operation}"`),
    );
  });

  it.each([
    ['Operation completed', { operation: 'operation.complete' }],
    ['Circuit breaker reset', { operation: 'breaker.reset' }],
    ['Cache hit', { operation: 'cache.hit' }],
    ['Request correlation created', { operation: 'correlation.create' }],
  ])('logs info: %s', (message, context) => {
    new Logger('Gateway').log(message, context);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(message),
      expect.stringContaining(`"operation":"${context.operation}"`),
    );
  });

  it.each([
    ['Operation start', { operation: 'operation.start' }],
    ['Correlation propagated', { operation: 'correlation.propagate' }],
    ['Performance metrics collected', { operation: 'performance.debug' }],
    ['Error context enriched', { operation: 'error.enrich' }],
  ])('logs debug: %s', (message, context) => {
    new Logger('Gateway').debug(message, context);

    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining(message),
      expect.stringContaining(`"operation":"${context.operation}"`),
    );
  });
});
