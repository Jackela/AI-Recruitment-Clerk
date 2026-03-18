import {
  StandardizedErrorResponseFormatter,
  UserErrorMessages,
  type ErrorResponseDto,
  type ErrorCorrelation,
  type ErrorRecovery,
  type ErrorImpact,
  type ErrorMonitoring,
} from './error-response-formatter';
import {
  EnhancedAppException,
  ExtendedErrorType,
} from './enhanced-error-types';
import { ErrorCorrelationManager } from './error-correlation';
import { ErrorSeverity } from '../common/error-handling.patterns';
import { HttpStatus } from '@nestjs/common';

// Mock dependencies
jest.mock('./error-correlation');

describe('StandardizedErrorResponseFormatter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatEnhanced', () => {
    it('should format enhanced error response', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
        .withBusinessImpact('high')
        .withUserImpact('severe')
        .withSeverity(ErrorSeverity.HIGH);

      const requestContext = {
        path: '/test',
        method: 'GET',
        ip: '127.0.0.1',
      };

      const response = StandardizedErrorResponseFormatter.formatEnhanced(
        error,
        requestContext,
      );

      expect(response.success).toBe(false);
      expect(response.error.type).toBe(ExtendedErrorType.SYSTEM_ERROR);
      expect(response.error.code).toBe('TEST_ERROR');
      expect(response.error.message).toBe('Test error message');
      expect(response.error.severity).toBe(ErrorSeverity.HIGH);
      expect(response.impact.business).toBe('high');
      expect(response.impact.user).toBe('severe');
    });

    it('should include correlation information', () => {
      const correlationContext = {
        traceId: 'trace-123',
        requestId: 'req-456',
        spanId: 'span-789',
        parentSpanId: 'parent-000',
        serviceName: 'test-service',
        operationName: 'test-operation',
        timestamp: new Date().toISOString(),
      };

      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(
        correlationContext,
      );

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const response = StandardizedErrorResponseFormatter.formatEnhanced(error);

      expect(response.correlation).toBeDefined();
      expect(response.correlation?.traceId).toBe('trace-123');
      expect(response.correlation?.requestId).toBe('req-456');
      expect(response.correlation?.spanId).toBe('span-789');
    });

    it('should include monitoring information', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      ).withMonitoringTags({ component: 'database', operation: 'query' });

      const response = StandardizedErrorResponseFormatter.formatEnhanced(error);

      expect(response.monitoring).toBeDefined();
      expect(response.monitoring?.tags).toEqual({
        component: 'database',
        operation: 'query',
      });
      expect(response.monitoring?.metrics).toBeDefined();
      expect(response.monitoring?.metrics.timestamp).toBeGreaterThan(0);
    });

    it('should include recovery strategies', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.EXTERNAL_SERVICE_ERROR,
        'SERVICE_ERROR',
        'Service error',
        503,
      ).withRecoveryStrategies(['Retry the operation', 'Use fallback service']);

      const response = StandardizedErrorResponseFormatter.formatEnhanced(error);

      expect(response.recovery.strategies).toEqual([
        'Retry the operation',
        'Use fallback service',
      ]);
      expect(response.recovery.retryable).toBe(true);
      expect(response.recovery.suggestions.length).toBeGreaterThan(0);
    });

    it('should include user-friendly message', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.VALIDATION_ERROR,
        'VALIDATION_FAILED',
        'Validation error',
        400,
      );

      const response = StandardizedErrorResponseFormatter.formatEnhanced(error);

      expect(response.error.userMessage).toBeDefined();
      expect(typeof response.error.userMessage).toBe('string');
    });

    it('should include context information', () => {
      const requestContext = {
        path: '/api/test',
        method: 'POST',
        ip: '192.168.1.1',
      };

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const response = StandardizedErrorResponseFormatter.formatEnhanced(
        error,
        requestContext,
      );

      expect(response.context.path).toBe('/api/test');
      expect(response.context.method).toBe('POST');
      expect(response.context.ip).toBe('192.168.1.1');
    });

    it('should include details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
        { detail: 'Additional detail' },
      );

      const response = StandardizedErrorResponseFormatter.formatEnhanced(error);

      expect(response.details).toBeDefined();
      expect(response.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should exclude details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
        { detail: 'Additional detail' },
      );

      const response = StandardizedErrorResponseFormatter.formatEnhanced(error);

      expect(response.details).toBeUndefined();
      expect(response.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle error without correlation context', () => {
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(null);

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const response = StandardizedErrorResponseFormatter.formatEnhanced(error);

      expect(response.success).toBe(false);
      expect(response.correlation).toBeUndefined();
    });

    it('should include service name from correlation context', () => {
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue({
        serviceName: 'test-service',
        operationName: 'test-operation',
      });

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const response = StandardizedErrorResponseFormatter.formatEnhanced(error);

      expect(response.context.serviceName).toBe('test-service');
    });

    it('should handle errors with timestamp', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const response = StandardizedErrorResponseFormatter.formatEnhanced(error);

      expect(response.error.timestamp).toBeDefined();
      expect(typeof response.error.timestamp).toBe('string');
    });
  });

  describe('formatForLogging', () => {
    it('should format error for logging', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      )
        .withBusinessImpact('high')
        .withUserImpact('severe');

      const logEntry =
        StandardizedErrorResponseFormatter.formatForLogging(error);

      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.level).toBeDefined();
      expect(logEntry.message).toBe('Test error');
      expect(logEntry.error.type).toBe(ExtendedErrorType.SYSTEM_ERROR);
      expect(logEntry.error.code).toBe('TEST_ERROR');
      expect(logEntry.recovery.retryable).toBeDefined();
    });

    it('should include correlation in log entry', () => {
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue({
        traceId: 'trace-123',
        requestId: 'req-456',
        serviceName: 'test-service',
      });

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const logEntry =
        StandardizedErrorResponseFormatter.formatForLogging(error);

      expect(logEntry.correlation).toBeDefined();
      expect(logEntry.correlation.traceId).toBe('trace-123');
    });

    it('should include request context', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const requestContext = {
        path: '/test',
        method: 'GET',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const logEntry = StandardizedErrorResponseFormatter.formatForLogging(
        error,
        requestContext,
      );

      expect(logEntry.context.path).toBe('/test');
      expect(logEntry.context.method).toBe('GET');
    });

    it('should exclude stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const logEntry =
        StandardizedErrorResponseFormatter.formatForLogging(error);

      expect(logEntry.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const logEntry =
        StandardizedErrorResponseFormatter.formatForLogging(error);

      expect(logEntry.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createErrorSummary', () => {
    it('should create error summary for monitoring', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      )
        .withBusinessImpact('critical')
        .withUserImpact('severe')
        .withMonitoringTags({ component: 'database' });

      const summary =
        StandardizedErrorResponseFormatter.createErrorSummary(error);

      expect(summary.errorType).toBe(ExtendedErrorType.SYSTEM_ERROR);
      expect(summary.errorCode).toBe('TEST_ERROR');
      expect(summary.businessImpact).toBe('critical');
      expect(summary.userImpact).toBe('severe');
      expect(summary.retryable).toBe(true);
      expect(summary.tags).toEqual({ component: 'database' });
    });

    it('should include service and operation names', () => {
      const correlationContext = {
        serviceName: 'test-service',
        operationName: 'test-operation',
      };

      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(
        correlationContext,
      );

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const summary =
        StandardizedErrorResponseFormatter.createErrorSummary(error);

      expect(summary.serviceName).toBe('test-service');
      expect(summary.operationName).toBe('test-operation');
    });

    it('should handle missing correlation context', () => {
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(null);

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const summary =
        StandardizedErrorResponseFormatter.createErrorSummary(error);

      expect(summary.serviceName).toBe('unknown');
      expect(summary.operationName).toBe('unknown');
    });

    it('should determine retryable status', () => {
      const validationError = new EnhancedAppException(
        ExtendedErrorType.VALIDATION_ERROR,
        'VALIDATION_FAILED',
        'Validation failed',
        400,
      );

      const summary =
        StandardizedErrorResponseFormatter.createErrorSummary(validationError);

      expect(summary.retryable).toBe(false);
    });
  });

  describe('formatMinimal', () => {
    it('should format minimal error response', () => {
      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const minimal = StandardizedErrorResponseFormatter.formatMinimal(error);

      expect(minimal.success).toBe(false);
      expect(minimal.error).toBe('Test error');
      expect(minimal.code).toBe('TEST_ERROR');
      expect(minimal.timestamp).toBeDefined();
    });

    it('should include traceId when available', () => {
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue({
        traceId: 'trace-123',
      });

      const error = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_ERROR',
        'Test error',
        500,
      );

      const minimal = StandardizedErrorResponseFormatter.formatMinimal(error);

      expect(minimal.traceId).toBe('trace-123');
    });
  });
});

describe('UserErrorMessages', () => {
  it('should have service-specific messages', () => {
    expect(UserErrorMessages['resume-parser']).toBeDefined();
    expect(
      UserErrorMessages['resume-parser'].RESUME_PARSE_FAILED,
    ).toBeDefined();

    expect(UserErrorMessages['report-generator']).toBeDefined();
    expect(UserErrorMessages['app-gateway']).toBeDefined();
    expect(UserErrorMessages['database']).toBeDefined();
  });

  it('should have general error messages', () => {
    expect(UserErrorMessages.general).toBeDefined();
    expect(UserErrorMessages.general.VALIDATION_FAILED).toBeDefined();
    expect(UserErrorMessages.general.UNAUTHORIZED).toBeDefined();
    expect(UserErrorMessages.general.NOT_FOUND).toBeDefined();
  });

  it('should have Chinese translations', () => {
    const message = UserErrorMessages['resume-parser'].RESUME_PARSE_FAILED;
    expect(message).toContain('简历');
  });
});
