import {
  StandardizedGlobalExceptionFilter,
  createGlobalExceptionFilter,
  ExceptionFilterConfigHelper,
  type GlobalExceptionFilterConfig,
} from './global-exception.filter';
import {
  AppException,
  ErrorType,
  ErrorSeverity,
} from '../common/error-handling.patterns';
import {
  EnhancedAppException,
  ExtendedErrorType,
} from './enhanced-error-types';
import { ErrorCorrelationManager } from './error-correlation';
import { StructuredLoggerFactory } from './structured-logging';
import type { ArgumentsHost } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ValidationError } from 'class-validator';
import type { Request, Response } from 'express';

// Mock dependencies
jest.mock('./error-correlation');
jest.mock('./structured-logging');

describe('StandardizedGlobalExceptionFilter', () => {
  let filter: StandardizedGlobalExceptionFilter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;

  const mockConfig: GlobalExceptionFilterConfig = {
    serviceName: 'test-service',
    enableCorrelation: true,
    enableStructuredLogging: true,
    enablePerformanceTracking: true,
    includeStackTrace: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      path: '/test',
      method: 'GET',
      headers: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as jest.Mocked<ArgumentsHost>;

    (
      ErrorCorrelationManager.createContextFromRequest as jest.Mock
    ).mockReturnValue({
      traceId: 'trace-123',
      requestId: 'req-456',
      spanId: 'span-789',
      serviceName: 'test-service',
      operationName: 'GET /test',
      timestamp: new Date().toISOString(),
    });

    (StructuredLoggerFactory.getLogger as jest.Mock).mockReturnValue({
      logError: jest.fn(),
    });

    filter = new StandardizedGlobalExceptionFilter(mockConfig);
  });

  describe('catch', () => {
    it('should handle EnhancedAppException', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('TEST_ERROR');
    });

    it('should handle AppException', () => {
      const error = new AppException(
        ErrorType.SYSTEM,
        'APP_ERROR',
        'Application error',
        500,
        {},
        {},
        ErrorSeverity.HIGH,
      );

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle ThrottlerException', () => {
      const error = new ThrottlerException('Rate limit exceeded');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.error.type).toBe(ErrorType.RATE_LIMIT);
    });

    it('should handle validation errors', () => {
      const validationErrors = [
        Object.assign(new ValidationError(), {
          property: 'email',
          value: 'invalid',
          constraints: { isEmail: 'email must be a valid email' },
        }),
      ];

      filter.catch(validationErrors, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.error.type).toBe(ErrorType.VALIDATION);
    });

    it('should handle HttpException', () => {
      const error = {
        getStatus: () => HttpStatus.NOT_FOUND,
        getResponse: () => ({ message: 'Not found', error: 'NOT_FOUND' }),
        message: 'Not found',
      };

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.error.message).toContain('Something went wrong');
    });

    it('should set correlation headers', () => {
      const error = new Error('Test');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.header).toHaveBeenCalledWith(
        'X-Trace-ID',
        'trace-123',
      );
      expect(mockResponse.header).toHaveBeenCalledWith(
        'X-Request-ID',
        'req-456',
      );
    });

    it('should handle string errors', () => {
      filter.catch('String error', mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle null errors', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('configuration', () => {
    it('should use default configuration values', () => {
      const minimalConfig = { serviceName: 'test-service' };
      const minimalFilter = new StandardizedGlobalExceptionFilter(
        minimalConfig,
      );

      expect(minimalFilter).toBeDefined();
    });

    it('should allow disabling correlation', () => {
      const noCorrelationFilter = new StandardizedGlobalExceptionFilter({
        ...mockConfig,
        enableCorrelation: false,
      });

      const error = new Error('Test');
      noCorrelationFilter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should allow disabling structured logging', () => {
      const noLoggingFilter = new StandardizedGlobalExceptionFilter({
        ...mockConfig,
        enableStructuredLogging: false,
      });

      const error = new Error('Test');
      noLoggingFilter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should hide stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const prodFilter = new StandardizedGlobalExceptionFilter({
        ...mockConfig,
        includeStackTrace: false,
      });

      const error = new Error('Test');
      prodFilter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('client IP extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      mockRequest.headers = { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' };

      const error = new Error('Test');
      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should extract IP from x-real-ip header', () => {
      mockRequest.headers = { 'x-real-ip': '10.0.0.1' };

      const error = new Error('Test');
      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should use remoteAddress as fallback', () => {
      mockRequest.headers = {};
      mockRequest.ip = undefined;

      const error = new Error('Test');
      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should use unknown when no IP available', () => {
      mockRequest.headers = {};
      mockRequest.ip = undefined;
      mockRequest.socket = undefined;

      const error = new Error('Test');
      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('recovery strategies', () => {
    it('should provide recovery strategies for 400 errors', () => {
      const error = {
        getStatus: () => 400,
        getResponse: () => 'Bad Request',
        message: 'Bad Request',
      };

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.recovery.strategies.length).toBeGreaterThan(0);
    });

    it('should provide recovery strategies for 500 errors', () => {
      const error = new Error('Internal error');

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.recovery.strategies.length).toBeGreaterThan(0);
    });

    it('should provide recovery strategies for 503 errors', () => {
      const error = {
        getStatus: () => 503,
        getResponse: () => 'Service Unavailable',
        message: 'Service Unavailable',
      };

      filter.catch(error, mockArgumentsHost);

      const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.recovery.strategies.length).toBeGreaterThan(0);
    });
  });
});

describe('createGlobalExceptionFilter', () => {
  it('should create filter with service name', () => {
    const filter = createGlobalExceptionFilter('my-service');

    expect(filter).toBeInstanceOf(StandardizedGlobalExceptionFilter);
  });

  it('should create filter with custom config', () => {
    const filter = createGlobalExceptionFilter('my-service', {
      enableCorrelation: false,
      includeStackTrace: false,
    });

    expect(filter).toBeInstanceOf(StandardizedGlobalExceptionFilter);
  });
});

describe('ExceptionFilterConfigHelper', () => {
  describe('forApiGateway', () => {
    it('should return API gateway configuration', () => {
      const config = ExceptionFilterConfigHelper.forApiGateway();

      expect(config.enableCorrelation).toBe(true);
      expect(config.enableStructuredLogging).toBe(true);
      expect(config.enableErrorRecovery).toBe(true);
      expect(config.customErrorMapping).toBeDefined();
    });

    it('should include circuit breaker error mapping', () => {
      const config = ExceptionFilterConfigHelper.forApiGateway();

      expect(config.customErrorMapping?.CIRCUIT_BREAKER_OPEN).toBeDefined();
      expect(config.customErrorMapping?.CIRCUIT_BREAKER_OPEN.httpStatus).toBe(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    });
  });

  describe('forProcessingService', () => {
    it('should return processing service configuration', () => {
      const config = ExceptionFilterConfigHelper.forProcessingService();

      expect(config.enableCorrelation).toBe(true);
      expect(config.enableStructuredLogging).toBe(true);
      expect(config.enablePerformanceTracking).toBe(true);
      expect(config.includeStackTrace).toBe(true);
    });
  });

  describe('forProduction', () => {
    it('should return production configuration', () => {
      const config = ExceptionFilterConfigHelper.forProduction();

      expect(config.includeStackTrace).toBe(false);
      expect(config.enableErrorRecovery).toBe(true);
    });
  });
});
