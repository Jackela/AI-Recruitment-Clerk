import type {
  ErrorResponse,
  ErrorResponseContext,
  ErrorCorrelation,
  ErrorRecovery,
  ErrorImpact,
  ErrorMonitoring,
  ErrorResponseDto,
  MinimalErrorResponseDto,
} from './error-response.dto';

describe('ErrorResponseDto', () => {
  describe('ErrorResponse interface', () => {
    it('should accept valid error response object', () => {
      const errorResponse: ErrorResponse = {
        type: 'VALIDATION_ERROR',
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        userMessage: 'Please check your input',
        timestamp: '2024-01-01T00:00:00.000Z',
        severity: 'medium',
        traceId: 'trace-123',
        requestId: 'req-456',
      };

      expect(errorResponse.type).toBe('VALIDATION_ERROR');
      expect(errorResponse.code).toBe('VALIDATION_FAILED');
      expect(errorResponse.severity).toBe('medium');
    });

    it('should allow optional traceId and requestId', () => {
      const errorResponse: ErrorResponse = {
        type: 'NOT_FOUND',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        userMessage: 'The requested user does not exist',
        timestamp: '2024-01-01T00:00:00.000Z',
        severity: 'low',
      };

      expect(errorResponse.traceId).toBeUndefined();
      expect(errorResponse.requestId).toBeUndefined();
    });
  });

  describe('ErrorResponseContext interface', () => {
    it('should accept valid context object', () => {
      const context: ErrorResponseContext = {
        path: '/api/users',
        method: 'POST',
        serviceName: 'user-service',
        operationName: 'createUser',
        ip: '192.168.1.1',
      };

      expect(context.path).toBe('/api/users');
      expect(context.method).toBe('POST');
    });

    it('should allow partial context', () => {
      const context: ErrorResponseContext = {
        path: '/api/jobs',
      };

      expect(context.path).toBe('/api/jobs');
      expect(context.method).toBeUndefined();
    });
  });

  describe('ErrorCorrelation interface', () => {
    it('should accept valid correlation object', () => {
      const correlation: ErrorCorrelation = {
        traceId: 'trace-abc',
        requestId: 'req-123',
        spanId: 'span-456',
        parentSpanId: 'parent-span-789',
      };

      expect(correlation.traceId).toBe('trace-abc');
      expect(correlation.spanId).toBe('span-456');
    });

    it('should allow partial correlation', () => {
      const correlation: ErrorCorrelation = {
        traceId: 'trace-only',
      };

      expect(correlation.traceId).toBe('trace-only');
      expect(correlation.requestId).toBeUndefined();
    });
  });

  describe('ErrorRecovery interface', () => {
    it('should accept valid recovery object', () => {
      const recovery: ErrorRecovery = {
        strategies: ['retry', 'fallback'],
        suggestions: ['Check your input', 'Try again later'],
        retryable: true,
      };

      expect(recovery.strategies).toContain('retry');
      expect(recovery.retryable).toBe(true);
    });
  });

  describe('ErrorImpact interface', () => {
    it('should accept valid impact object', () => {
      const impact: ErrorImpact = {
        business: 'high',
        user: 'severe',
      };

      expect(impact.business).toBe('high');
      expect(impact.user).toBe('severe');
    });
  });

  describe('ErrorMonitoring interface', () => {
    it('should accept valid monitoring object', () => {
      const monitoring: ErrorMonitoring = {
        tags: { service: 'api-gateway', region: 'us-east-1' },
        metrics: { errorCount: 5, latencyMs: 1200 },
      };

      expect(monitoring.tags.service).toBe('api-gateway');
      expect(monitoring.metrics.errorCount).toBe(5);
    });
  });

  describe('ErrorResponseDto interface', () => {
    it('should accept complete error response', () => {
      const dto: ErrorResponseDto = {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'INVALID_INPUT',
          message: 'Invalid input provided',
          userMessage: 'Please check your input',
          timestamp: '2024-01-01T00:00:00.000Z',
          severity: 'medium',
        },
        context: {
          path: '/api/validate',
          method: 'POST',
        },
        correlation: {
          traceId: 'trace-123',
        },
        recovery: {
          strategies: ['validate input'],
          suggestions: ['Check format'],
          retryable: false,
        },
        impact: {
          business: 'low',
          user: 'minimal',
        },
        details: { field: 'email' },
        stack: 'Error stack trace',
        monitoring: {
          tags: { component: 'validator' },
          metrics: { attempts: 1 },
        },
      };

      expect(dto.success).toBe(false);
      expect(dto.error.type).toBe('VALIDATION_ERROR');
      expect(dto.correlation?.traceId).toBe('trace-123');
    });

    it('should allow minimal error response', () => {
      const dto: ErrorResponseDto = {
        success: false,
        error: {
          type: 'SYSTEM_ERROR',
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          userMessage: 'Something went wrong',
          timestamp: '2024-01-01T00:00:00.000Z',
          severity: 'critical',
        },
        context: {},
      };

      expect(dto.success).toBe(false);
      expect(dto.details).toBeUndefined();
      expect(dto.recovery).toBeUndefined();
    });
  });

  describe('MinimalErrorResponseDto interface', () => {
    it('should accept minimal error response', () => {
      const dto: MinimalErrorResponseDto = {
        success: false,
        error: 'Something went wrong',
        code: 'ERROR_CODE',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      expect(dto.success).toBe(false);
      expect(dto.error).toBe('Something went wrong');
    });

    it('should allow optional traceId', () => {
      const dto: MinimalErrorResponseDto = {
        success: false,
        error: 'Not found',
        code: 'NOT_FOUND',
        timestamp: '2024-01-01T00:00:00.000Z',
        traceId: 'trace-789',
      };

      expect(dto.traceId).toBe('trace-789');
    });
  });
});
