import { HttpStatus } from '@nestjs/common';
import {
  ErrorType,
  ErrorSeverity,
  AppException,
  BusinessLogicException,
  ValidationException,
  ResourceNotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  ExternalServiceException,
  ErrorHandler,
  ErrorRecoveryStrategy,
  ErrorResponseFormatter,
} from './error-handling.patterns';

describe('Error Handling Patterns', () => {
  describe('ErrorType Enum', () => {
    it('should define all error types', () => {
      expect(ErrorType.VALIDATION).toBe('VALIDATION_ERROR');
      expect(ErrorType.AUTHENTICATION).toBe('AUTHENTICATION_ERROR');
      expect(ErrorType.AUTHORIZATION).toBe('AUTHORIZATION_ERROR');
      expect(ErrorType.NOT_FOUND).toBe('NOT_FOUND_ERROR');
      expect(ErrorType.CONFLICT).toBe('CONFLICT_ERROR');
      expect(ErrorType.RATE_LIMIT).toBe('RATE_LIMIT_ERROR');
      expect(ErrorType.EXTERNAL_SERVICE).toBe('EXTERNAL_SERVICE_ERROR');
      expect(ErrorType.DATABASE).toBe('DATABASE_ERROR');
      expect(ErrorType.FILE_UPLOAD).toBe('FILE_UPLOAD_ERROR');
      expect(ErrorType.BUSINESS_LOGIC).toBe('BUSINESS_LOGIC_ERROR');
      expect(ErrorType.SYSTEM).toBe('SYSTEM_ERROR');
    });
  });

  describe('ErrorSeverity Enum', () => {
    it('should define all severity levels', () => {
      expect(ErrorSeverity.LOW).toBe('low');
      expect(ErrorSeverity.MEDIUM).toBe('medium');
      expect(ErrorSeverity.HIGH).toBe('high');
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });
  });

  describe('AppException', () => {
    it('should create an exception with default values', () => {
      const exception = new AppException(
        ErrorType.SYSTEM,
        'TEST_CODE',
        'Test message',
      );

      expect(exception).toBeInstanceOf(AppException);
      expect(exception.message).toBe('Test message');
      expect(exception.errorDetails.type).toBe(ErrorType.SYSTEM);
      expect(exception.errorDetails.code).toBe('TEST_CODE');
      expect(exception.errorDetails.severity).toBe(ErrorSeverity.MEDIUM);
      expect(exception.errorDetails.timestamp).toBeDefined();
    });

    it('should create an exception with custom HTTP status', () => {
      const exception = new AppException(
        ErrorType.VALIDATION,
        'VAL_CODE',
        'Validation failed',
        HttpStatus.BAD_REQUEST,
      );

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create an exception with details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const exception = new AppException(
        ErrorType.VALIDATION,
        'VAL_CODE',
        'Validation failed',
        HttpStatus.BAD_REQUEST,
        details,
      );

      expect(exception.errorDetails.details).toEqual(details);
    });

    it('should create an exception with context', () => {
      const context = { userId: 'user-123', action: 'update' };
      const exception = new AppException(
        ErrorType.SYSTEM,
        'SYS_CODE',
        'System error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        context,
      );

      expect(exception.errorDetails.context).toEqual(context);
    });

    it('should support fluent interface with withTraceId', () => {
      const exception = new AppException(
        ErrorType.SYSTEM,
        'CODE',
        'Message',
      ).withTraceId('trace-123');

      expect(exception.errorDetails.traceId).toBe('trace-123');
    });

    it('should support fluent interface with withUserId', () => {
      const exception = new AppException(
        ErrorType.SYSTEM,
        'CODE',
        'Message',
      ).withUserId('user-456');

      expect(exception.errorDetails.userId).toBe('user-456');
    });

    it('should support fluent interface with withSessionId', () => {
      const exception = new AppException(
        ErrorType.SYSTEM,
        'CODE',
        'Message',
      ).withSessionId('session-789');

      expect(exception.errorDetails.sessionId).toBe('session-789');
    });

    it('should support fluent interface with withSeverity', () => {
      const exception = new AppException(
        ErrorType.SYSTEM,
        'CODE',
        'Message',
      ).withSeverity(ErrorSeverity.HIGH);

      expect(exception.errorDetails.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should support fluent interface with withContext', () => {
      const exception = new AppException(
        ErrorType.SYSTEM,
        'CODE',
        'Message',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        { initial: 'context' },
      ).withContext({ added: 'value' });

      expect(exception.errorDetails.context).toEqual({
        initial: 'context',
        added: 'value',
      });
    });

    it('should chain multiple fluent methods', () => {
      const exception = new AppException(
        ErrorType.SYSTEM,
        'CODE',
        'Message',
      )
        .withTraceId('trace-1')
        .withUserId('user-1')
        .withSessionId('session-1')
        .withSeverity(ErrorSeverity.CRITICAL)
        .withContext({ key: 'value' });

      expect(exception.errorDetails.traceId).toBe('trace-1');
      expect(exception.errorDetails.userId).toBe('user-1');
      expect(exception.errorDetails.sessionId).toBe('session-1');
      expect(exception.errorDetails.severity).toBe(ErrorSeverity.CRITICAL);
      expect(exception.errorDetails.context).toEqual({ key: 'value' });
    });
  });

  describe('BusinessLogicException', () => {
    it('should create a business logic exception', () => {
      const exception = new BusinessLogicException(
        'BIZ_CODE',
        'Business rule violated',
      );

      expect(exception).toBeInstanceOf(AppException);
      expect(exception.errorDetails.type).toBe(ErrorType.BUSINESS_LOGIC);
      expect(exception.errorDetails.code).toBe('BIZ_CODE');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create with details', () => {
      const details = { rule: 'max_items', limit: 10 };
      const exception = new BusinessLogicException(
        'LIMIT_EXCEEDED',
        'Limit exceeded',
        details,
      );

      expect(exception.errorDetails.details).toEqual(details);
    });
  });

  describe('ValidationException', () => {
    it('should create a validation exception', () => {
      const exception = new ValidationException('Invalid input');

      expect(exception).toBeInstanceOf(AppException);
      expect(exception.errorDetails.type).toBe(ErrorType.VALIDATION);
      expect(exception.errorDetails.code).toBe('VALIDATION_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create with validation errors', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const exception = new ValidationException('Validation failed', errors);

      expect(exception.errorDetails.details).toEqual(errors);
    });
  });

  describe('ResourceNotFoundException', () => {
    it('should create a not found exception', () => {
      const exception = new ResourceNotFoundException('User', 'user-123');

      expect(exception).toBeInstanceOf(AppException);
      expect(exception.errorDetails.type).toBe(ErrorType.NOT_FOUND);
      expect(exception.errorDetails.code).toBe('RESOURCE_NOT_FOUND');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.message).toBe("User with identifier 'user-123' not found");
    });

    it('should include resource details', () => {
      const exception = new ResourceNotFoundException('Resume', 'resume-456');

      expect(exception.errorDetails.details).toEqual({
        resource: 'Resume',
        identifier: 'resume-456',
      });
    });
  });

  describe('UnauthorizedException', () => {
    it('should create with default message', () => {
      const exception = new UnauthorizedException();

      expect(exception).toBeInstanceOf(AppException);
      expect(exception.errorDetails.type).toBe(ErrorType.AUTHORIZATION);
      expect(exception.errorDetails.code).toBe('UNAUTHORIZED');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.message).toBe('Unauthorized access');
    });

    it('should create with custom message', () => {
      const exception = new UnauthorizedException('Token expired');

      expect(exception.message).toBe('Token expired');
    });
  });

  describe('ForbiddenException', () => {
    it('should create with default message', () => {
      const exception = new ForbiddenException();

      expect(exception).toBeInstanceOf(AppException);
      expect(exception.errorDetails.type).toBe(ErrorType.AUTHORIZATION);
      expect(exception.errorDetails.code).toBe('FORBIDDEN');
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.message).toBe('Access forbidden');
    });

    it('should create with custom message', () => {
      const exception = new ForbiddenException('Admin access required');

      expect(exception.message).toBe('Admin access required');
    });
  });

  describe('ConflictException', () => {
    it('should create a conflict exception', () => {
      const exception = new ConflictException('Resource already exists');

      expect(exception).toBeInstanceOf(AppException);
      expect(exception.errorDetails.type).toBe(ErrorType.CONFLICT);
      expect(exception.errorDetails.code).toBe('RESOURCE_CONFLICT');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('should create with conflict details', () => {
      const details = { field: 'email', value: 'test@example.com' };
      const exception = new ConflictException('Duplicate email', details);

      expect(exception.errorDetails.details).toEqual(details);
    });
  });

  describe('ExternalServiceException', () => {
    it('should create an external service exception', () => {
      const exception = new ExternalServiceException(
        'PaymentGateway',
        'Connection timeout',
      );

      expect(exception).toBeInstanceOf(AppException);
      expect(exception.errorDetails.type).toBe(ErrorType.EXTERNAL_SERVICE);
      expect(exception.errorDetails.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(exception.message).toContain('PaymentGateway');
      expect(exception.message).toContain('Connection timeout');
    });

    it('should include status code in details', () => {
      const exception = new ExternalServiceException(
        'EmailService',
        'Rate limited',
        429,
      );

      expect(exception.errorDetails.details).toEqual({
        serviceName: 'EmailService',
        originalStatusCode: 429,
      });
    });
  });

  describe('ErrorHandler', () => {
    describe('handleError', () => {
      it('should return AppException as-is with trace ID', () => {
        const original = new ValidationException('Invalid input');
        const result = ErrorHandler.handleError(original);

        expect(result).toBe(original);
        expect(result.errorDetails.traceId).toBeDefined();
      });

      it('should convert generic error to AppException', () => {
        const error = new Error('Something went wrong');
        const result = ErrorHandler.handleError(error, 'TestContext');

        expect(result).toBeInstanceOf(AppException);
        expect(result.errorDetails.type).toBe(ErrorType.SYSTEM);
        expect(result.errorDetails.traceId).toBeDefined();
      });

      it('should detect database errors', () => {
        const error = new Error('mongodb connection timeout');
        const result = ErrorHandler.handleError(error);

        expect(result.errorDetails.type).toBe(ErrorType.DATABASE);
        expect(result.errorDetails.severity).toBe(ErrorSeverity.HIGH);
      });

      it('should detect network errors', () => {
        const error = new Error('ECONNREFUSED');
        const result = ErrorHandler.handleError(error);

        expect(result.errorDetails.type).toBe(ErrorType.EXTERNAL_SERVICE);
      });
    });
  });

  describe('ErrorRecoveryStrategy', () => {
    describe('withRetry', () => {
      it('should succeed on first attempt', async () => {
        const operation = jest.fn().mockResolvedValue('success');

        const result = await ErrorRecoveryStrategy.withRetry(operation);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should retry on failure and succeed', async () => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(new Error('Temporary failure'))
          .mockResolvedValue('success');

        const result = await ErrorRecoveryStrategy.withRetry(operation, 3, 10);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('should throw after max retries', async () => {
        const error = new Error('Persistent failure');
        const operation = jest.fn().mockRejectedValue(error);

        await expect(
          ErrorRecoveryStrategy.withRetry(operation, 2, 10),
        ).rejects.toThrow();

        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('should not retry non-retryable errors', async () => {
        const validationError = new ValidationException('Invalid input');
        const operation = jest.fn().mockRejectedValue(validationError);

        await expect(
          ErrorRecoveryStrategy.withRetry(operation, 3, 10),
        ).rejects.toThrow();

        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should use exponential backoff', async () => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockResolvedValue('success');

        const startTime = Date.now();
        await ErrorRecoveryStrategy.withRetry(operation, 3, 10, true);
        const elapsed = Date.now() - startTime;

        // With exponential backoff: 10ms + 20ms = 30ms minimum
        expect(elapsed).toBeGreaterThanOrEqual(25);
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should support linear backoff', async () => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockResolvedValue('success');

        const startTime = Date.now();
        await ErrorRecoveryStrategy.withRetry(operation, 3, 10, false);
        const elapsed = Date.now() - startTime;

        // With linear backoff: 10ms + 10ms = 20ms minimum
        expect(elapsed).toBeGreaterThanOrEqual(15);
        expect(operation).toHaveBeenCalledTimes(3);
      });
    });

    describe('circuitBreaker', () => {
      it('should execute operation when circuit is closed', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        const breaker = ErrorRecoveryStrategy.circuitBreaker(operation);

        const result = await breaker();

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should open circuit after threshold failures', async () => {
        const error = new Error('Service unavailable');
        const operation = jest.fn().mockRejectedValue(error);
        const breaker = ErrorRecoveryStrategy.circuitBreaker(operation, 2, 1000);

        // First two failures
        await expect(breaker()).rejects.toThrow();
        await expect(breaker()).rejects.toThrow();

        // Circuit should be open now
        await expect(breaker()).rejects.toThrow('Circuit breaker is open');

        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('should reset circuit on success', async () => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(new Error('Fail'))
          .mockResolvedValue('success')
          .mockResolvedValue('success');
        const breaker = ErrorRecoveryStrategy.circuitBreaker(operation, 2, 1000);

        // First failure
        await expect(breaker()).rejects.toThrow();

        // Success resets the circuit
        expect(await breaker()).toBe('success');

        // Circuit should still be closed
        expect(await breaker()).toBe('success');

        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should transition to half-open after timeout', async () => {
        const operation = jest
          .fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockResolvedValue('success');
        const breaker = ErrorRecoveryStrategy.circuitBreaker(operation, 2, 50);

        // Trigger circuit open
        await expect(breaker()).rejects.toThrow();
        await expect(breaker()).rejects.toThrow();

        // Wait for timeout
        await new Promise((resolve) => setTimeout(resolve, 60));

        // Should transition to half-open and succeed
        expect(await breaker()).toBe('success');
      });
    });
  });

  describe('ErrorResponseFormatter', () => {
    describe('format', () => {
      it('should format error for response', () => {
        const exception = new ValidationException('Invalid input')
          .withTraceId('trace-123');

        const formatted = ErrorResponseFormatter.format(exception);

        expect(formatted.success).toBe(false);
        expect(formatted.error).toBeDefined();
        expect((formatted.error as Record<string, unknown>).type).toBe(
          ErrorType.VALIDATION,
        );
        expect((formatted.error as Record<string, unknown>).code).toBe(
          'VALIDATION_FAILED',
        );
        expect((formatted.error as Record<string, unknown>).message).toBe(
          'Invalid input',
        );
        expect((formatted.error as Record<string, unknown>).traceId).toBe(
          'trace-123',
        );
      });
    });

    describe('formatUserMessage', () => {
      it('should return user-friendly message for validation error', () => {
        const exception = new ValidationException('Invalid');
        const message = ErrorResponseFormatter.formatUserMessage(exception);

        expect(message).toBe('输入信息有误，请检查后重试');
      });

      it('should return user-friendly message for authentication error', () => {
        const exception = new AppException(
          ErrorType.AUTHENTICATION,
          'AUTH_FAILED',
          'Auth failed',
        );
        const message = ErrorResponseFormatter.formatUserMessage(exception);

        expect(message).toBe('身份验证失败，请重新登录');
      });

      it('should return user-friendly message for not found error', () => {
        const exception = new ResourceNotFoundException('User', '123');
        const message = ErrorResponseFormatter.formatUserMessage(exception);

        expect(message).toBe('请求的资源不存在');
      });

      it('should return user-friendly message for external service error', () => {
        const exception = new ExternalServiceException('API', 'Down');
        const message = ErrorResponseFormatter.formatUserMessage(exception);

        expect(message).toBe('外部服务暂时不可用，请稍后重试');
      });

      it('should return business logic message as-is', () => {
        const exception = new BusinessLogicException(
          'CUSTOM_CODE',
          'Custom business message',
        );
        const message = ErrorResponseFormatter.formatUserMessage(exception);

        expect(message).toBe('Custom business message');
      });

      it('should return system error message', () => {
        const exception = new AppException(
          ErrorType.SYSTEM,
          'SYS_CODE',
          'System failed',
        );
        const message = ErrorResponseFormatter.formatUserMessage(exception);

        expect(message).toBe('系统出现错误，请联系管理员');
      });

      it('should return user-friendly message for forbidden error', () => {
        const exception = new ForbiddenException();
        const message = ErrorResponseFormatter.formatUserMessage(exception);

        expect(message).toBe('您没有权限执行此操作');
      });

      it('should return user-friendly message for conflict error', () => {
        const exception = new ConflictException('Duplicate');
        const message = ErrorResponseFormatter.formatUserMessage(exception);

        expect(message).toBe('操作冲突，请稍后重试');
      });

      it('should return user-friendly message for database error', () => {
        const exception = new AppException(
          ErrorType.DATABASE,
          'DB_ERROR',
          'Database failed',
        );
        const message = ErrorResponseFormatter.formatUserMessage(exception);

        expect(message).toBe('数据服务暂时不可用，请稍后重试');
      });

      it('should return user-friendly message for file upload error', () => {
        const exception = new AppException(
          ErrorType.FILE_UPLOAD,
          'FILE_ERROR',
          'Upload failed',
        );
        const message = ErrorResponseFormatter.formatUserMessage(exception);

        expect(message).toBe('文件上传失败，请检查文件格式和大小');
      });
    });
  });
});
