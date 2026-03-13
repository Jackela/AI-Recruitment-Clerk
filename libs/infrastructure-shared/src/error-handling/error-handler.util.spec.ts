import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConfigurationError,
  ExternalServiceError,
  asyncErrorBoundary,
  errorBoundary,
  successResponse,
  errorResponse,
  extractErrorInfo,
  isRetryableError,
  ErrorCategory,
  ErrorSeverity,
  ErrorResponse,
} from './error-handler.util';

describe('Error Handler Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AppError', () => {
    it('should create AppError with message and code', () => {
      const error = new AppError('Something went wrong', 'ERR_001');
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('ERR_001');
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should create AppError with custom category and severity', () => {
      const error = new AppError(
        'Database error',
        'DB_001',
        ErrorCategory.DATABASE,
        ErrorSeverity.HIGH,
        { table: 'users' },
      );
      expect(error.category).toBe(ErrorCategory.DATABASE);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.details).toEqual({ table: 'users' });
    });

    it('should convert to response format', () => {
      const error = new AppError('Test error', 'TEST_001');
      const response = error.toResponse('req-123');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('TEST_001');
      expect(response.error.message).toBe('Test error');
      expect(response.error.requestId).toBe('req-123');
      expect(response.error.timestamp).toBeDefined();
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new AppError('Test error', 'TEST_001');
      const response = error.toResponse();

      expect(response.error.stack).toBeDefined();
      process.env.NODE_ENV = 'test';
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new AppError('Test error', 'TEST_001');
      const response = error.toResponse();

      expect(response.error.stack).toBeUndefined();
      process.env.NODE_ENV = 'test';
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError', () => {
      const error = new NotFoundError('User not found', { id: '123' });
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.category).toBe(ErrorCategory.NOT_FOUND);
      expect(error.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('AuthenticationError', () => {
    it('should create AuthenticationError', () => {
      const error = new AuthenticationError('Invalid credentials');
      expect(error.message).toBe('Invalid credentials');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('AuthorizationError', () => {
    it('should create AuthorizationError', () => {
      const error = new AuthorizationError('Insufficient permissions');
      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('ConfigurationError', () => {
    it('should create ConfigurationError', () => {
      const error = new ConfigurationError('Missing config', {
        key: 'DB_HOST',
      });
      expect(error.message).toBe('Missing config');
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create ExternalServiceError', () => {
      const error = new ExternalServiceError('Service unavailable', {
        service: 'auth',
      });
      expect(error.message).toBe('Service unavailable');
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('asyncErrorBoundary', () => {
    it('should return result on success', async () => {
      const fn = async () => 'success';
      const wrapped = asyncErrorBoundary(fn);

      const result = await wrapped();
      expect(result).toBe('success');
    });

    it('should handle AppError', async () => {
      const fn = async () => {
        throw new ValidationError('Invalid');
      };
      const wrapped = asyncErrorBoundary(fn, { logErrors: false });

      const result = await wrapped();
      expect((result as ErrorResponse).success).toBe(false);
      expect((result as ErrorResponse).error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle standard Error', async () => {
      const fn = async () => {
        throw new Error('Standard error');
      };
      const wrapped = asyncErrorBoundary(fn, {
        defaultErrorCode: 'CUSTOM_ERROR',
        logErrors: false,
      });

      const result = await wrapped();
      expect((result as ErrorResponse).success).toBe(false);
      expect((result as ErrorResponse).error.code).toBe('CUSTOM_ERROR');
    });

    it('should handle unknown errors', async () => {
      const fn = async () => {
        throw 'string error';
      };
      const wrapped = asyncErrorBoundary(fn, { logErrors: false });

      const result = await wrapped();
      expect((result as ErrorResponse).success).toBe(false);
      expect((result as ErrorResponse).error.message).toBe(
        'An unknown error occurred',
      );
    });

    it('should call onError handler', async () => {
      const onError = jest.fn();
      const fn = async () => {
        throw new Error('Test');
      };
      const wrapped = asyncErrorBoundary(fn, { onError, logErrors: false });

      await wrapped();
      expect(onError).toHaveBeenCalled();
    });

    it('should include requestId in response', async () => {
      const fn = async () => {
        throw new Error('Test');
      };
      const wrapped = asyncErrorBoundary(fn, {
        requestId: 'req-123',
        logErrors: false,
      });

      const result = await wrapped();
      expect((result as ErrorResponse).error.requestId).toBe('req-123');
    });

    it('should pass arguments to wrapped function', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const wrapped = asyncErrorBoundary(fn);

      await wrapped('arg1', 123, true);
      expect(fn).toHaveBeenCalledWith('arg1', 123, true);
    });
  });

  describe('errorBoundary', () => {
    it('should return result on success', () => {
      const fn = () => 'success';
      const wrapped = errorBoundary(fn);

      const result = wrapped();
      expect(result).toBe('success');
    });

    it('should handle AppError', () => {
      const fn = () => {
        throw new ValidationError('Invalid');
      };
      const wrapped = errorBoundary(fn, { logErrors: false });

      const result = wrapped();
      expect((result as ErrorResponse).success).toBe(false);
      expect((result as ErrorResponse).error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle standard Error', () => {
      const fn = () => {
        throw new Error('Standard error');
      };
      const wrapped = errorBoundary(fn, { logErrors: false });

      const result = wrapped();
      expect((result as ErrorResponse).success).toBe(false);
    });

    it('should pass arguments to wrapped function', () => {
      const fn = jest.fn().mockReturnValue('result');
      const wrapped = errorBoundary(fn);

      wrapped('arg1', 123);
      expect(fn).toHaveBeenCalledWith('arg1', 123);
    });
  });

  describe('successResponse', () => {
    it('should create success response', () => {
      const result = successResponse({ id: 1, name: 'Test' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'Test' });
    });

    it('should include requestId if provided', () => {
      const result = successResponse('data', 'req-123');
      expect(result.requestId).toBe('req-123');
    });

    it('should not include requestId if not provided', () => {
      const result = successResponse('data');
      expect(result.requestId).toBeUndefined();
    });
  });

  describe('errorResponse', () => {
    it('should create error response', () => {
      const result = errorResponse('ERR_001', 'Something failed');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('ERR_001');
      expect(result.error.message).toBe('Something failed');
      expect(result.error.timestamp).toBeDefined();
    });

    it('should include details if provided', () => {
      const details = { field: 'email' };
      const result = errorResponse('ERR_001', 'Failed', details);
      expect(result.error.details).toEqual(details);
    });

    it('should include requestId if provided', () => {
      const result = errorResponse('ERR_001', 'Failed', undefined, 'req-123');
      expect(result.error.requestId).toBe('req-123');
    });
  });

  describe('extractErrorInfo', () => {
    it('should extract info from AppError', () => {
      const error = new AppError(
        'Test',
        'TEST_001',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        {
          field: 'email',
        },
      );
      const info = extractErrorInfo(error);

      expect(info.message).toBe('Test');
      expect(info.code).toBe('TEST_001');
      expect(info.details).toEqual({ field: 'email' });
      expect(info.stack).toBeDefined();
    });

    it('should extract info from standard Error', () => {
      const error = new Error('Standard error');
      const info = extractErrorInfo(error);

      expect(info.message).toBe('Standard error');
      expect(info.code).toBe('GENERIC_ERROR');
      expect(info.stack).toBeDefined();
    });

    it('should handle unknown errors', () => {
      const info = extractErrorInfo('string error');

      expect(info.message).toBe('An unknown error occurred');
      expect(info.code).toBe('UNKNOWN_ERROR');
      expect(info.details).toBe('string error');
    });
  });

  describe('isRetryableError', () => {
    it('should return true for external service errors', () => {
      const error = new ExternalServiceError('Service down');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for network errors', () => {
      const error = new AppError(
        'Network error',
        'NET_001',
        ErrorCategory.NETWORK,
      );
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for database errors', () => {
      const error = new AppError('DB error', 'DB_001', ErrorCategory.DATABASE);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for validation errors', () => {
      const error = new ValidationError('Invalid input');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should detect timeout errors', () => {
      const error = new Error('Request timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should detect connection errors', () => {
      const error = new Error('ECONNREFUSED');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should detect network errors', () => {
      const error = new Error('Network error occurred');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = new Error('Invalid syntax');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for unknown errors', () => {
      expect(isRetryableError('error')).toBe(false);
    });
  });
});
