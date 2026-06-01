import {
  StructuredErrorLogger,
  StructuredLoggerFactory,
  LogLevel,
  type PerformanceMetrics,
} from './structured-logging';
import { ErrorCorrelationManager } from './error-correlation';
import {
  EnhancedAppException,
  ExtendedErrorType,
} from './enhanced-error-types';
import { ErrorSeverity } from '../common/error-handling.patterns';

// Mock dependencies
jest.mock('./error-correlation');

describe('StructuredErrorLogger', () => {
  let logger: StructuredErrorLogger;
  const serviceName = 'test-service';

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new StructuredErrorLogger(serviceName);

    (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue({
      traceId: 'trace-123',
      requestId: 'req-456',
      spanId: 'span-789',
      serviceName: 'test-service',
      operationName: 'test-operation',
      executionTime: 100,
      userId: 'user-123',
      sessionId: 'session-456',
      clientIp: '127.0.0.1',
      userAgent: 'test-agent',
      metadata: {
        method: 'GET',
        path: '/test',
      },
    });
  });

  describe('logError', () => {
    it('should log error with full context', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error message',
        500,
        { detail: 'test' },
        { userId: 'user-123' },
      )
        .withBusinessImpact('high')
        .withUserImpact('severe')
        .withSeverity(ErrorSeverity.HIGH);

      // Should not throw
      expect(() => logger.logError(error, 'test-operation')).not.toThrow();
    });

    it('should log error without correlation context', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.VALIDATION_ERROR,
        'VALIDATION_ERROR',
        'Validation failed',
        400,
      );

      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(null);

      expect(() => logger.logError(error)).not.toThrow();
    });

    it('should log error with additional context', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'SYSTEM_ERROR',
        'System error',
        500,
      );

      const additionalContext = {
        requestId: 'req-789',
        customField: 'custom-value',
      };

      expect(() =>
        logger.logError(error, 'test-operation', additionalContext),
      ).not.toThrow();
    });

    it('should log error with recovery strategies', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.EXTERNAL_SERVICE_ERROR,
        'SERVICE_ERROR',
        'External service error',
        503,
      ).withRecoveryStrategies(['Retry', 'Use fallback']);

      expect(() => logger.logError(error)).not.toThrow();
    });

    it('should log error with monitoring tags', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'SYSTEM_ERROR',
        'System error',
        500,
      ).withMonitoringTags({ component: 'database', severity: 'critical' });

      expect(() => logger.logError(error)).not.toThrow();
    });

    it('should handle error with null details', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'SYSTEM_ERROR',
        'System error',
        500,
        null,
      );

      expect(() => logger.logError(error)).not.toThrow();
    });

    it('should handle error with string details', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'SYSTEM_ERROR',
        'System error',
        500,
        'Error details as string',
      );

      expect(() => logger.logError(error)).not.toThrow();
    });
  });

  describe('logPerformance', () => {
    it('should log performance metrics', () => {
      const metrics: PerformanceMetrics = {
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      };

      expect(() =>
        logger.logPerformance('test-operation', metrics),
      ).not.toThrow();
    });

    it('should log performance with additional metadata', () => {
      const metrics: PerformanceMetrics = {
        startTime: Date.now(),
        duration: 500,
      };

      const additionalMetadata = {
        customMetric: 123,
        operationType: 'test',
      };

      expect(() =>
        logger.logPerformance('test-operation', metrics, additionalMetadata),
      ).not.toThrow();
    });

    it('should log performance without correlation context', () => {
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(null);

      const metrics: PerformanceMetrics = {
        startTime: Date.now(),
        duration: 500,
      };

      expect(() =>
        logger.logPerformance('test-operation', metrics),
      ).not.toThrow();
    });
  });

  describe('logOperationStart', () => {
    it('should log operation start', () => {
      const metrics = logger.logOperationStart('test-operation');

      expect(metrics).toHaveProperty('startTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuUsage');
    });

    it('should log operation start with metadata', () => {
      const metadata = {
        requestId: 'req-123',
        userId: 'user-456',
      };

      const metrics = logger.logOperationStart('test-operation', metadata);

      expect(metrics.startTime).toBeDefined();
    });

    it('should handle missing correlation context', () => {
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(null);

      const metrics = logger.logOperationStart('test-operation');

      expect(metrics.startTime).toBeDefined();
    });
  });

  describe('logOperationComplete', () => {
    it('should log successful operation completion', () => {
      const startMetrics: PerformanceMetrics = {
        startTime: Date.now() - 1000,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      };

      const completeMetrics = logger.logOperationComplete(
        'test-operation',
        startMetrics,
        true,
      );

      expect(completeMetrics.endTime).toBeDefined();
      expect(completeMetrics.duration).toBeGreaterThanOrEqual(0);
    });

    it('should log failed operation completion', () => {
      const startMetrics: PerformanceMetrics = {
        startTime: Date.now() - 1000,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      };

      const completeMetrics = logger.logOperationComplete(
        'test-operation',
        startMetrics,
        false,
        {
          error: 'Test error',
        },
      );

      expect(completeMetrics.endTime).toBeDefined();
    });

    it('should update correlation context execution time', () => {
      const context = {
        executionTime: 0,
      };
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(
        context,
      );

      const startMetrics: PerformanceMetrics = {
        startTime: Date.now() - 500,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      };

      logger.logOperationComplete('test-operation', startMetrics, true);

      expect(context.executionTime).toBeGreaterThan(0);
    });

    it('should handle missing start metrics properties', () => {
      const startMetrics: PerformanceMetrics = {
        startTime: Date.now() - 1000,
      };

      const completeMetrics = logger.logOperationComplete(
        'test-operation',
        startMetrics,
        true,
      );

      expect(completeMetrics.endTime).toBeDefined();
      expect(completeMetrics.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('withLogging', () => {
    it('should wrap successful function', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await logger.withLogging('test-operation', fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
    });

    it('should wrap failed function', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(logger.withLogging('test-operation', fn)).rejects.toThrow(
        'Test error',
      );

      expect(fn).toHaveBeenCalled();
    });

    it('should log EnhancedAppException errors', async () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'SYSTEM_ERROR',
        'System error',
        500,
      );
      const fn = jest.fn().mockRejectedValue(error);

      await expect(logger.withLogging('test-operation', fn)).rejects.toThrow(
        error,
      );
    });

    it('should pass metadata to wrapped function', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const metadata = { requestId: 'req-123' };

      await logger.withLogging('test-operation', fn, metadata);

      expect(fn).toHaveBeenCalled();
    });
  });

  describe('logCorrelationBoundary', () => {
    it('should log outbound call', () => {
      expect(() =>
        logger.logCorrelationBoundary('outbound', 'user-service', 'getUser'),
      ).not.toThrow();
    });

    it('should log inbound call', () => {
      expect(() =>
        logger.logCorrelationBoundary(
          'inbound',
          'gateway-service',
          'processRequest',
        ),
      ).not.toThrow();
    });

    it('should log with metadata', () => {
      const metadata = {
        requestSize: 1024,
        targetEndpoint: '/api/users',
      };

      expect(() =>
        logger.logCorrelationBoundary(
          'outbound',
          'user-service',
          'getUser',
          metadata,
        ),
      ).not.toThrow();
    });

    it('should handle missing correlation context', () => {
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(null);

      expect(() =>
        logger.logCorrelationBoundary('outbound', 'user-service', 'getUser'),
      ).not.toThrow();
    });
  });

  describe('createOperationLogger', () => {
    it('should create operation logger decorator', () => {
      const LogOperation =
        StructuredErrorLogger.createOperationLogger(serviceName);

      expect(LogOperation).toBeDefined();
      expect(typeof LogOperation).toBe('function');
    });
  });
});

describe('StructuredLoggerFactory', () => {
  beforeEach(() => {
    StructuredLoggerFactory.clearLoggers();
  });

  describe('getLogger', () => {
    it('should create new logger for service', () => {
      const logger = StructuredLoggerFactory.getLogger('new-service');

      expect(logger).toBeInstanceOf(StructuredErrorLogger);
    });

    it('should return same logger for same service', () => {
      const logger1 = StructuredLoggerFactory.getLogger('test-service');
      const logger2 = StructuredLoggerFactory.getLogger('test-service');

      expect(logger1).toBe(logger2);
    });

    it('should return different loggers for different services', () => {
      const logger1 = StructuredLoggerFactory.getLogger('service-1');
      const logger2 = StructuredLoggerFactory.getLogger('service-2');

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('configure', () => {
    it('should enable external logging', () => {
      const originalEnv = process.env.EXTERNAL_LOGGING_ENABLED;

      StructuredLoggerFactory.configure({
        enableExternalLogging: true,
      });

      expect(process.env.EXTERNAL_LOGGING_ENABLED).toBe('true');

      process.env.EXTERNAL_LOGGING_ENABLED = originalEnv;
    });

    it('should disable external logging', () => {
      const originalEnv = process.env.EXTERNAL_LOGGING_ENABLED;

      StructuredLoggerFactory.configure({
        enableExternalLogging: false,
      });

      expect(process.env.EXTERNAL_LOGGING_ENABLED).toBe('false');

      process.env.EXTERNAL_LOGGING_ENABLED = originalEnv;
    });

    it('should handle multiple configuration options', () => {
      const originalEnv = process.env.EXTERNAL_LOGGING_ENABLED;

      StructuredLoggerFactory.configure({
        enableExternalLogging: true,
        logLevel: LogLevel.DEBUG,
        enablePerformanceLogging: true,
        enableCorrelationLogging: true,
      });

      expect(process.env.EXTERNAL_LOGGING_ENABLED).toBe('true');

      process.env.EXTERNAL_LOGGING_ENABLED = originalEnv;
    });

    it('should handle empty configuration', () => {
      expect(() => StructuredLoggerFactory.configure({})).not.toThrow();
    });
  });

  describe('clearLoggers', () => {
    it('should clear all loggers', () => {
      const logger1 = StructuredLoggerFactory.getLogger('service-1');
      const logger2 = StructuredLoggerFactory.getLogger('service-2');

      StructuredLoggerFactory.clearLoggers();

      const newLogger1 = StructuredLoggerFactory.getLogger('service-1');
      const newLogger2 = StructuredLoggerFactory.getLogger('service-2');

      expect(newLogger1).not.toBe(logger1);
      expect(newLogger2).not.toBe(logger2);
    });
  });
});

describe('LogLevel enum', () => {
  it('should define all log levels', () => {
    expect(LogLevel.DEBUG).toBe('debug');
    expect(LogLevel.INFO).toBe('info');
    expect(LogLevel.WARN).toBe('warn');
    expect(LogLevel.ERROR).toBe('error');
    expect(LogLevel.FATAL).toBe('fatal');
  });
});
