import {
  ErrorCorrelationInterceptor,
  ErrorLoggingInterceptor,
  PerformanceTrackingInterceptor,
  ErrorRecoveryInterceptor,
  ErrorInterceptorFactory,
} from './error-interceptors';
import { ErrorCorrelationManager } from './error-correlation';
import { StructuredLoggerFactory } from './structured-logging';
import { EnhancedAppException } from './enhanced-error-types';
import { ErrorType } from '../common/error-handling.patterns';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import type { Request, Response } from 'express';

// Mock the dependencies
jest.mock('./error-correlation');
jest.mock('./structured-logging');

describe('Error Interceptors', () => {
  const mockServiceName = 'test-service';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ErrorCorrelationInterceptor', () => {
    let interceptor: ErrorCorrelationInterceptor;
    let mockContext: jest.Mocked<ExecutionContext>;
    let mockCallHandler: jest.Mocked<CallHandler>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      interceptor = new ErrorCorrelationInterceptor(mockServiceName);

      mockRequest = {
        headers: {},
        path: '/test',
        method: 'GET',
      };

      mockResponse = {
        setHeader: jest.fn(),
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
        getHandler: jest.fn().mockReturnValue({ name: 'testHandler' }),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      } as unknown as jest.Mocked<ExecutionContext>;

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('success')),
      } as unknown as jest.Mocked<CallHandler>;

      (
        ErrorCorrelationManager.createContextFromRequest as jest.Mock
      ).mockReturnValue({
        traceId: 'trace-123',
        requestId: 'req-456',
        spanId: 'span-789',
        serviceName: mockServiceName,
        operationName: 'TestController.testHandler',
        timestamp: new Date().toISOString(),
      });
    });

    it('should create correlation context from request', async () => {
      const result = await interceptor
        .intercept(mockContext, mockCallHandler)
        .toPromise();

      expect(
        ErrorCorrelationManager.createContextFromRequest,
      ).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should set correlation headers in response', async () => {
      await interceptor.intercept(mockContext, mockCallHandler).toPromise();

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Trace-ID',
        'trace-123',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        'req-456',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Span-ID',
        'span-789',
      );
    });

    it('should set correlation context', async () => {
      await interceptor.intercept(mockContext, mockCallHandler).toPromise();

      expect(ErrorCorrelationManager.setContext).toHaveBeenCalled();
    });

    it('should clear correlation context on completion', async () => {
      await interceptor.intercept(mockContext, mockCallHandler).toPromise();

      expect(ErrorCorrelationManager.clearContext).toHaveBeenCalled();
    });

    it('should add correlation to EnhancedAppException errors', async () => {
      const error = new EnhancedAppException(
        ErrorType.SYSTEM,
        'TEST',
        'Test error',
      );
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      try {
        await interceptor.intercept(mockContext, mockCallHandler).toPromise();
      } catch (_e) {
        // Expected
      }

      expect(error.enhancedDetails.correlationContext).toBeDefined();
    });

    it('should handle request completion successfully', async () => {
      mockCallHandler.handle.mockReturnValue(of({ data: 'test' }));

      const result = await interceptor
        .intercept(mockContext, mockCallHandler)
        .toPromise();

      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('ErrorLoggingInterceptor', () => {
    let interceptor: ErrorLoggingInterceptor;
    let mockContext: jest.Mocked<ExecutionContext>;
    let mockCallHandler: jest.Mocked<CallHandler>;
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = {
        logOperationStart: jest.fn().mockReturnValue({ startTime: Date.now() }),
        logOperationComplete: jest.fn().mockReturnValue({}),
        logError: jest.fn(),
      };

      (StructuredLoggerFactory.getLogger as jest.Mock).mockReturnValue(
        mockLogger,
      );

      interceptor = new ErrorLoggingInterceptor(mockServiceName);

      mockContext = {
        getHandler: jest.fn().mockReturnValue({ name: 'testHandler' }),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      } as unknown as jest.Mocked<ExecutionContext>;

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('success')),
      } as unknown as jest.Mocked<CallHandler>;
    });

    it('should log operation start', async () => {
      await interceptor.intercept(mockContext, mockCallHandler).toPromise();

      expect(mockLogger.logOperationStart).toHaveBeenCalledWith(
        'TestController.testHandler',
      );
    });

    it('should log successful operation completion', async () => {
      await interceptor.intercept(mockContext, mockCallHandler).toPromise();

      expect(mockLogger.logOperationComplete).toHaveBeenCalledWith(
        'TestController.testHandler',
        expect.any(Object),
        true,
        expect.objectContaining({
          resultType: 'string',
          hasResult: true,
        }),
      );
    });

    it('should log failed operation completion', async () => {
      const error = new Error('Test error');
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      try {
        await interceptor.intercept(mockContext, mockCallHandler).toPromise();
      } catch (_e) {
        // Expected
      }

      expect(mockLogger.logOperationComplete).toHaveBeenCalledWith(
        'TestController.testHandler',
        expect.any(Object),
        false,
        expect.objectContaining({
          errorType: 'Error',
          errorMessage: 'Test error',
        }),
      );
    });

    it('should log EnhancedAppException errors', async () => {
      const error = new EnhancedAppException(
        ErrorType.SYSTEM,
        'TEST',
        'Test error',
      );
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      try {
        await interceptor.intercept(mockContext, mockCallHandler).toPromise();
      } catch (_e) {
        // Expected
      }

      expect(mockLogger.logError).toHaveBeenCalledWith(
        error,
        'TestController.testHandler',
      );
    });

    it('should handle undefined result', async () => {
      mockCallHandler.handle.mockReturnValue(of(undefined));

      await interceptor.intercept(mockContext, mockCallHandler).toPromise();

      expect(mockLogger.logOperationComplete).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        true,
        expect.objectContaining({
          hasResult: false,
        }),
      );
    });

    it('should handle null result', async () => {
      mockCallHandler.handle.mockReturnValue(of(null));

      await interceptor.intercept(mockContext, mockCallHandler).toPromise();

      expect(mockLogger.logOperationComplete).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        true,
        expect.objectContaining({
          hasResult: false,
        }),
      );
    });
  });

  describe('PerformanceTrackingInterceptor', () => {
    let interceptor: PerformanceTrackingInterceptor;
    let mockContext: jest.Mocked<ExecutionContext>;
    let mockCallHandler: jest.Mocked<CallHandler>;
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = {
        logPerformance: jest.fn(),
      };

      (StructuredLoggerFactory.getLogger as jest.Mock).mockReturnValue(
        mockLogger,
      );

      interceptor = new PerformanceTrackingInterceptor(mockServiceName, {
        warnThreshold: 500,
        errorThreshold: 1000,
      });

      mockContext = {
        getHandler: jest.fn().mockReturnValue({ name: 'testHandler' }),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      } as unknown as jest.Mocked<ExecutionContext>;

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('success')),
      } as unknown as jest.Mocked<CallHandler>;

      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue({
        executionTime: 0,
      });
    });

    it('should track performance metrics', async () => {
      await interceptor.intercept(mockContext, mockCallHandler).toPromise();

      expect(mockLogger.logPerformance).toHaveBeenCalled();
      const performanceCall = mockLogger.logPerformance.mock.calls[0];
      expect(performanceCall[0]).toBe('TestController.testHandler');
      expect(performanceCall[1]).toHaveProperty('startTime');
      expect(performanceCall[1]).toHaveProperty('duration');
      expect(performanceCall[1]).toHaveProperty('memoryUsage');
    });

    it('should update correlation context with execution time', async () => {
      await interceptor.intercept(mockContext, mockCallHandler).toPromise();

      const context = ErrorCorrelationManager.getContext();
      expect(context.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should use default thresholds when not provided', () => {
      const defaultInterceptor = new PerformanceTrackingInterceptor(
        mockServiceName,
      );

      expect(defaultInterceptor).toBeDefined();
    });

    it('should handle error threshold breach', async () => {
      // Create interceptor with very low threshold to trigger error
      const lowThresholdInterceptor = new PerformanceTrackingInterceptor(
        mockServiceName,
        {
          warnThreshold: 1,
          errorThreshold: 5,
        },
      );

      await lowThresholdInterceptor
        .intercept(mockContext, mockCallHandler)
        .toPromise();

      // Should have logged performance
      expect(mockLogger.logPerformance).toHaveBeenCalled();
    });
  });

  describe('ErrorRecoveryInterceptor', () => {
    let interceptor: ErrorRecoveryInterceptor;
    let mockContext: jest.Mocked<ExecutionContext>;
    let mockCallHandler: jest.Mocked<CallHandler>;

    beforeEach(() => {
      interceptor = new ErrorRecoveryInterceptor(mockServiceName, {
        enableCircuitBreaker: true,
        failureThreshold: 3,
        recoveryTimeout: 1000,
      });

      mockContext = {
        getHandler: jest.fn().mockReturnValue({ name: 'testHandler' }),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      } as unknown as jest.Mocked<ExecutionContext>;

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('success')),
      } as unknown as jest.Mocked<CallHandler>;
    });

    it('should allow operation when circuit is closed', async () => {
      const result = await interceptor
        .intercept(mockContext, mockCallHandler)
        .toPromise();

      expect(result).toBe('success');
    });

    it('should open circuit after threshold failures', async () => {
      mockCallHandler.handle.mockReturnValue(
        throwError(() => new Error('Test error')),
      );

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await interceptor.intercept(mockContext, mockCallHandler).toPromise();
        } catch (_e) {
          // Expected
        }
      }

      // Circuit should be open now
      const error = new EnhancedAppException(ErrorType.SYSTEM, 'TEST', 'Test');
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      try {
        await interceptor.intercept(mockContext, mockCallHandler).toPromise();
      } catch (e) {
        expect(e).toBeInstanceOf(EnhancedAppException);
        expect((e as EnhancedAppException).enhancedDetails.code).toBe(
          'CIRCUIT_BREAKER_OPEN',
        );
      }
    });

    it('should reset circuit breaker on success', async () => {
      // First fail a few times
      mockCallHandler.handle.mockReturnValue(
        throwError(() => new Error('Test error')),
      );

      for (let i = 0; i < 2; i++) {
        try {
          await interceptor.intercept(mockContext, mockCallHandler).toPromise();
        } catch (_e) {
          // Expected
        }
      }

      // Then succeed
      mockCallHandler.handle.mockReturnValue(of('success'));
      await interceptor.intercept(mockContext, mockCallHandler).toPromise();

      // Circuit should be reset
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should enhance errors with recovery strategies', async () => {
      // First, fail 3 times to open the circuit breaker
      mockCallHandler.handle.mockReturnValue(
        throwError(() => new Error('Test error')),
      );

      for (let i = 0; i < 3; i++) {
        try {
          await interceptor.intercept(mockContext, mockCallHandler).toPromise();
        } catch (_e) {
          // Expected - circuit breaker is recording failures
        }
      }

      // Now the circuit is open, error should have recovery strategies
      const error = new EnhancedAppException(
        ErrorType.SYSTEM,
        'TEST',
        'Test error',
      );
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      try {
        await interceptor.intercept(mockContext, mockCallHandler).toPromise();
      } catch (e) {
        expect(
          (e as EnhancedAppException).enhancedDetails.recoveryStrategies,
        ).toBeDefined();
        expect(
          (e as EnhancedAppException).enhancedDetails.recoveryStrategies!
            .length,
        ).toBeGreaterThan(0);
      }
    });

    it('should use default config when not provided', () => {
      const defaultInterceptor = new ErrorRecoveryInterceptor(mockServiceName);

      expect(defaultInterceptor).toBeDefined();
    });

    it('should allow disabled circuit breaker', async () => {
      const disabledInterceptor = new ErrorRecoveryInterceptor(
        mockServiceName,
        {
          enableCircuitBreaker: false,
        },
      );

      const error = new Error('Test');
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      try {
        await disabledInterceptor
          .intercept(mockContext, mockCallHandler)
          .toPromise();
      } catch (e) {
        expect(e).toBe(error);
      }
    });
  });

  describe('ErrorInterceptorFactory', () => {
    it('should create correlation interceptor', () => {
      const interceptor =
        ErrorInterceptorFactory.createCorrelationInterceptor(mockServiceName);

      expect(interceptor).toBeInstanceOf(ErrorCorrelationInterceptor);
    });

    it('should create logging interceptor', () => {
      const interceptor =
        ErrorInterceptorFactory.createLoggingInterceptor(mockServiceName);

      expect(interceptor).toBeInstanceOf(ErrorLoggingInterceptor);
    });

    it('should create performance interceptor', () => {
      const interceptor = ErrorInterceptorFactory.createPerformanceInterceptor(
        mockServiceName,
        {
          warnThreshold: 1000,
          errorThreshold: 5000,
        },
      );

      expect(interceptor).toBeInstanceOf(PerformanceTrackingInterceptor);
    });

    it('should create recovery interceptor', () => {
      const interceptor = ErrorInterceptorFactory.createRecoveryInterceptor(
        mockServiceName,
        {
          enableCircuitBreaker: true,
        },
      );

      expect(interceptor).toBeInstanceOf(ErrorRecoveryInterceptor);
    });

    it('should create complete set of interceptors', () => {
      const interceptors = ErrorInterceptorFactory.createCompleteSet(
        mockServiceName,
        {
          enableCorrelation: true,
          enableLogging: true,
          enablePerformance: true,
          enableRecovery: true,
        },
      );

      expect(interceptors).toHaveLength(4);
      expect(interceptors[0]).toBeInstanceOf(ErrorCorrelationInterceptor);
      expect(interceptors[1]).toBeInstanceOf(ErrorLoggingInterceptor);
      expect(interceptors[2]).toBeInstanceOf(PerformanceTrackingInterceptor);
      expect(interceptors[3]).toBeInstanceOf(ErrorRecoveryInterceptor);
    });

    it('should create partial set with disabled interceptors', () => {
      const interceptors = ErrorInterceptorFactory.createCompleteSet(
        mockServiceName,
        {
          enableCorrelation: true,
          enableLogging: false,
          enablePerformance: true,
          enableRecovery: false,
        },
      );

      expect(interceptors).toHaveLength(2);
      expect(interceptors[0]).toBeInstanceOf(ErrorCorrelationInterceptor);
      expect(interceptors[1]).toBeInstanceOf(PerformanceTrackingInterceptor);
    });

    it('should create empty set when all disabled', () => {
      const interceptors = ErrorInterceptorFactory.createCompleteSet(
        mockServiceName,
        {
          enableCorrelation: false,
          enableLogging: false,
          enablePerformance: false,
          enableRecovery: false,
        },
      );

      expect(interceptors).toHaveLength(0);
    });

    it('should use defaults when options not provided', () => {
      const interceptors =
        ErrorInterceptorFactory.createCompleteSet(mockServiceName);

      expect(interceptors.length).toBeGreaterThan(0);
    });

    it('should pass performance thresholds to interceptor', () => {
      const thresholds = { warnThreshold: 500, errorThreshold: 2000 };
      const interceptor = ErrorInterceptorFactory.createPerformanceInterceptor(
        mockServiceName,
        thresholds,
      );

      expect(interceptor).toBeDefined();
    });

    it('should pass recovery config to interceptor', () => {
      const config = {
        enableCircuitBreaker: true,
        failureThreshold: 5,
        recoveryTimeout: 30000,
      };
      const interceptor = ErrorInterceptorFactory.createRecoveryInterceptor(
        mockServiceName,
        config,
      );

      expect(interceptor).toBeDefined();
    });
  });
});
