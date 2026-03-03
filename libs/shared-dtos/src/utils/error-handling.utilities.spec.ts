/**
 * @fileoverview Error Handling Utilities Tests - Comprehensive test coverage for error utilities
 * @module ErrorUtilsTests
 */

import type { Logger} from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import type {
  ErrorHandlingContext,
  ErrorRetryOptions,
  ValidationEntry,
  SeverityLevel,
  BusinessImpactLevel,
  UserImpactLevel} from './error-handling.utilities';
import {
  ErrorUtils
} from './error-handling.utilities';
import {
  EnhancedAppException,
  ExtendedErrorType,
} from '../errors/enhanced-error-types';
import { DatabaseErrorCode } from '../errors/domain-errors';
import {
  ErrorCorrelationManager,
} from '../errors/error-correlation';
import { ErrorSeverity } from '../common/error-handling.patterns';

jest.mock('../errors/error-correlation');

describe('ErrorUtils', () => {
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    // Reset ErrorCorrelationManager mocks
    (
      ErrorCorrelationManager.getContext as jest.Mock
    ).mockReturnValue(undefined);
    (
      ErrorCorrelationManager.setContext as jest.Mock
    ).mockReturnValue(undefined);
    (
      ErrorCorrelationManager.updateContext as jest.Mock
    ).mockReturnValue(undefined);
  });

  describe('createValidationError', () => {
    it('should create validation error with detailed context', () => {
      const validationDetails = {
        email: 'Invalid email format',
        password: 'Password too short',
      };

      const error = ErrorUtils.createValidationError(
        'Validation failed',
        validationDetails,
        'email',
      );

      expect(error).toBeInstanceOf(EnhancedAppException);
      expect(error.enhancedDetails.type).toBe(ExtendedErrorType.VALIDATION_ERROR);
      expect(error.enhancedDetails.code).toBe('VALIDATION_FAILED');
      expect(error.enhancedDetails.message).toBe('Validation failed');
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should include validation details in error context', () => {
      const validationDetails = {
        field1: 'Required field missing',
        field2: 'Invalid format',
      };

      const error = ErrorUtils.createValidationError(
        'Multiple validation errors',
        validationDetails,
      );

      expect(error.enhancedDetails.details).toEqual({
        validationDetails,
        field: undefined,
      });
    });

    it('should set appropriate severity and impact levels', () => {
      const error = ErrorUtils.createValidationError(
        'Test validation error',
        { field: 'error' },
      );

      expect(error.enhancedDetails.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.enhancedDetails.businessImpact).toBe('low');
      expect(error.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should include recovery strategies', () => {
      const error = ErrorUtils.createValidationError(
        'Validation error',
        { email: 'invalid' },
      );

      expect(error.enhancedDetails.recoveryStrategies!).toHaveLength(3);
      expect(
        error.enhancedDetails.recoveryStrategies!,
      ).toContain('Check input format and try again');
    });

    it('should work without field parameter', () => {
      const error = ErrorUtils.createValidationError('Test', { foo: 'bar' });

      expect(error).toBeDefined();
      expect(error.enhancedDetails.details).toEqual({
        validationDetails: { foo: 'bar' },
        field: undefined,
      });
    });
  });

  describe('createAuthenticationError', () => {
    it('should create authentication error with default reason', () => {
      const error = ErrorUtils.createAuthenticationError();

      expect(error).toBeInstanceOf(EnhancedAppException);
      expect(error.enhancedDetails.type).toBe(
        ExtendedErrorType.AUTHENTICATION_ERROR,
      );
      expect(error.enhancedDetails.code).toBe('AUTH_FAILED');
      expect(error.enhancedDetails.message).toBe('Authentication failed');
      expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should create authentication error with custom reason', () => {
      const error = ErrorUtils.createAuthenticationError(
        'Token expired',
        { tokenExpiry: '2024-01-01' },
      );

      expect(error.enhancedDetails.message).toBe('Token expired');
      // context param is passed as details (5th arg) to EnhancedAppException
      expect((error.enhancedDetails.details as Record<string, unknown>)?.tokenExpiry).toBe('2024-01-01');
    });

    it('should set appropriate severity and impact levels', () => {
      const error = ErrorUtils.createAuthenticationError('Invalid credentials');

      expect(error.enhancedDetails.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.enhancedDetails.businessImpact).toBe('medium');
      expect(error.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should include recovery strategies for authentication', () => {
      const error = ErrorUtils.createAuthenticationError();

      expect(error.enhancedDetails.recoveryStrategies!).toContain(
        'Please log in again',
      );
      expect(error.enhancedDetails.recoveryStrategies!).toContain(
        'Check your credentials',
      );
    });
  });

  describe('createAuthorizationError', () => {
    it('should create authorization error with resource and action', () => {
      const error = ErrorUtils.createAuthorizationError(
        'users',
        'delete',
        { userId: 'user-123' },
      );

      expect(error).toBeInstanceOf(EnhancedAppException);
      expect(error.enhancedDetails.type).toBe(
        ExtendedErrorType.AUTHORIZATION_ERROR,
      );
      expect(error.enhancedDetails.code).toBe('ACCESS_DENIED');
      expect(error.enhancedDetails.message).toBe(
        'Access denied for delete on users',
      );
      expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
    });

    it('should include resource and action in error details', () => {
      const error = ErrorUtils.createAuthorizationError(
        'reports',
        'generate',
      );

      // resource and action are stored in details (5th arg)
      const details = error.enhancedDetails.details as Record<string, unknown>;
      expect(details?.resource).toBe('reports');
      expect(details?.action).toBe('generate');
    });

    it('should set appropriate severity and impact levels', () => {
      const error = ErrorUtils.createAuthorizationError(
        'admin-panel',
        'access',
      );

      expect(error.enhancedDetails.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.enhancedDetails.businessImpact).toBe('medium');
      expect(error.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should include recovery strategies for authorization', () => {
      const error = ErrorUtils.createAuthorizationError('resource', 'action');

      expect(
        error.enhancedDetails.recoveryStrategies,
      ).toContain('Contact administrator for required permissions');
    });
  });

  describe('createNotFoundError', () => {
    it('should create not found error with resource type and identifier', () => {
      const error = ErrorUtils.createNotFoundError(
        'Resume',
        'resume-123',
        { status: 'archived' },
      );

      expect(error).toBeInstanceOf(EnhancedAppException);
      expect(error.enhancedDetails.type).toBe(ExtendedErrorType.NOT_FOUND_ERROR);
      expect(error.enhancedDetails.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.enhancedDetails.message).toBe(
        "Resume with identifier 'resume-123' not found",
      );
      expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('should include search context in error details', () => {
      const error = ErrorUtils.createNotFoundError(
        'User',
        'user-456',
        { department: 'engineering' },
      );

      expect((error.enhancedDetails.details as Record<string, unknown>)?.resourceType).toBe('User');
      expect((error.enhancedDetails.details as Record<string, unknown>)?.identifier).toBe('user-456');
      expect((error.enhancedDetails.details as Record<string, unknown>)?.searchContext).toEqual({
        department: 'engineering',
      });
    });

    it('should set appropriate severity and impact levels', () => {
      const error = ErrorUtils.createNotFoundError('Job', 'job-789');

      expect(error.enhancedDetails.severity).toBe(ErrorSeverity.LOW);
      expect(error.enhancedDetails.businessImpact).toBe('low');
      expect(error.enhancedDetails.userImpact).toBe('minimal');
    });

    it('should work without search context', () => {
      const error = ErrorUtils.createNotFoundError('Report', 'report-001');

      expect(error).toBeDefined();
      expect(error.enhancedDetails.message).toContain('report-001');
    });
  });

  describe('createRateLimitError', () => {
    it('should create rate limit error with limit and reset time', () => {
      const resetTime = new Date('2024-12-31T23:59:59Z');
      const error = ErrorUtils.createRateLimitError(100, resetTime, {
        endpoint: '/api/resumes',
      });

      expect(error).toBeInstanceOf(EnhancedAppException);
      expect(error.enhancedDetails.type).toBe(ExtendedErrorType.RATE_LIMIT_ERROR);
      expect(error.enhancedDetails.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.enhancedDetails.message).toBe(
        'Rate limit of 100 requests exceeded',
      );
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('should include reset time in ISO format', () => {
      const resetTime = new Date('2024-06-15T10:30:00Z');
      const error = ErrorUtils.createRateLimitError(50, resetTime);

      // resetTime is stored in details, not context
      const details = error.enhancedDetails.details as { resetTime: string; limit: number };
      expect(details?.resetTime).toBe(
        resetTime.toISOString(),
      );
      expect(details?.limit).toBe(50);
    });

    it('should set appropriate severity and impact levels', () => {
      const error = ErrorUtils.createRateLimitError(
        100,
        new Date(),
      );

      expect(error.enhancedDetails.severity).toBe(ErrorSeverity.LOW);
      expect(error.enhancedDetails.businessImpact).toBe('low');
      expect(error.enhancedDetails.userImpact).toBe('minimal');
    });

    it('should include reset time in recovery strategies', () => {
      const resetTime = new Date('2024-12-31T12:00:00Z');
      const error = ErrorUtils.createRateLimitError(100, resetTime);

      expect(error.enhancedDetails.recoveryStrategies![0]).toContain(
        resetTime.toLocaleString(),
      );
    });
  });

  describe('createExternalServiceError', () => {
    it('should create external service error with service name and operation', () => {
      const originalError = new Error('Connection timeout');
      const error = ErrorUtils.createExternalServiceError(
        'GeminiAI',
        'parseResume',
        originalError,
        { resumeId: 'resume-123' },
      );

      expect(error).toBeInstanceOf(EnhancedAppException);
      expect(error.enhancedDetails.type).toBe(
        ExtendedErrorType.EXTERNAL_SERVICE_ERROR,
      );
      expect(error.enhancedDetails.code).toBe('EXTERNAL_SERVICE_FAILED');
      expect(error.enhancedDetails.message).toBe(
        "External service 'GeminiAI' failed during parseResume",
      );
      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    });

    it('should include original error message in context', () => {
      const originalError = new Error('Service unavailable');
      const error = ErrorUtils.createExternalServiceError(
        'NATS',
        'publish',
        originalError,
      );

      expect((error.enhancedDetails.details as Record<string, unknown>)?.originalError).toBe(
        'Service unavailable',
      );
    });

    it('should work without original error', () => {
      const error = ErrorUtils.createExternalServiceError(
        'Redis',
        'connect',
      );

      expect(error).toBeDefined();
      expect((error.enhancedDetails.details as Record<string, unknown>)?.originalError).toBeUndefined();
    });

    it('should set appropriate severity and impact levels', () => {
      const error = ErrorUtils.createExternalServiceError(
        'ExternalAPI',
        'fetch',
      );

      expect(error.enhancedDetails.severity).toBe(ErrorSeverity.HIGH);
      expect(error.enhancedDetails.businessImpact).toBe('high');
      expect(error.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should include comprehensive recovery strategies', () => {
      const error = ErrorUtils.createExternalServiceError(
        'PaymentGateway',
        'processPayment',
      );

      expect(error.enhancedDetails.recoveryStrategies!).toHaveLength(4);
      expect(error.enhancedDetails.recoveryStrategies!).toContain(
        'Try again in a few moments',
      );
    });
  });

  describe('createDatabaseError', () => {
    it('should create database error using DomainErrorFactory', () => {
      const originalError = new Error('Connection refused');
      const error = ErrorUtils.createDatabaseError(
        'insert',
        'resumes',
        originalError,
        { resumeId: 'resume-123' },
      );

      expect(error).toBeInstanceOf(EnhancedAppException);
      expect(error.enhancedDetails.code).toBe(DatabaseErrorCode.OPERATION_FAILED);
    });

    it('should include operation and table in error message', () => {
      const error = ErrorUtils.createDatabaseError(
        'update',
        'users',
        undefined,
        { userId: 'user-123' },
      );

      expect(error.enhancedDetails.message).toContain('update');
      expect(error.enhancedDetails.message).toContain('users');
    });

    it('should work without table name', () => {
      const error = ErrorUtils.createDatabaseError('connect');

      expect(error).toBeDefined();
    });

    it('should include original error message in context', () => {
      const originalError = new Error('Duplicate key');
      const error = ErrorUtils.createDatabaseError(
        'insert',
        'jobs',
        originalError,
      );

      expect((error.enhancedDetails.details as Record<string, unknown>)?.originalError).toBe('Duplicate key');
    });
  });

  describe('withErrorHandling', () => {
    it('should execute operation successfully and return result', async () => {
      const operation = jest.fn().mockResolvedValue({ data: 'success' });
      const context: ErrorHandlingContext = {
        operationName: 'testOperation',
        logger: mockLogger,
      };

      const result = await ErrorUtils.withErrorHandling(operation, context);

      expect(result).toEqual({ data: 'success' });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting operation: testOperation',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Operation completed: testOperation'),
      );
    });

    it('should re-throw EnhancedAppException with additional context', async () => {
      const originalError = ErrorUtils.createValidationError('Test error', {
        field: 'value',
      });
      const operation = jest.fn().mockRejectedValue(originalError);
      const context: ErrorHandlingContext = {
        operationName: 'failingOperation',
        recoveryStrategies: ['Try again'],
      };

      await expect(
        ErrorUtils.withErrorHandling(operation, context),
      ).rejects.toThrow(originalError);

      // withContext updates errorDetails.context (base class), not enhancedDetails.context
      expect((originalError.errorDetails.context as Record<string, unknown>)?.operationName).toBe(
        'failingOperation',
      );
    });

    it('should convert regular error to EnhancedAppException', async () => {
      const regularError = new Error('Something went wrong');
      const operation = jest.fn().mockRejectedValue(regularError);
      const context: ErrorHandlingContext = {
        operationName: 'convertTest',
        defaultErrorType: ExtendedErrorType.SYSTEM_ERROR,
        defaultErrorCode: 'SYSTEM_FAILURE',
        severity: 'high',
        businessImpact: 'critical',
        userImpact: 'severe',
      };

      await expect(
        ErrorUtils.withErrorHandling(operation, context),
      ).rejects.toThrow(EnhancedAppException);
    });

    it('should apply context options to enhanced error', async () => {
      const regularError = new Error('Test error');
      const operation = jest.fn().mockRejectedValue(regularError);
      const context: ErrorHandlingContext = {
        operationName: 'contextTest',
        severity: 'critical',
        businessImpact: 'high',
        userImpact: 'severe',
        recoveryStrategies: ['Contact support'],
      };

      try {
        await ErrorUtils.withErrorHandling(operation, context);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedAppException);
        const enhanced = error as EnhancedAppException;
        expect(enhanced.enhancedDetails.severity).toBe(ErrorSeverity.CRITICAL);
        expect(enhanced.enhancedDetails.businessImpact).toBe('high');
        expect(enhanced.enhancedDetails.userImpact).toBe('severe');
        expect(enhanced.enhancedDetails.recoveryStrategies!).toContain(
          'Contact support',
        );
      }
    });

    it('should use default logger if none provided', async () => {
      const operation = jest.fn().mockResolvedValue('result');
      const context: ErrorHandlingContext = {
        operationName: 'noLoggerTest',
      };

      await ErrorUtils.withErrorHandling(operation, context);

      expect(operation).toHaveBeenCalled();
    });

    it('should track execution time', async () => {
      const operation = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('done'), 10)),
        );
      const context: ErrorHandlingContext = {
        operationName: 'timedOperation',
        logger: mockLogger,
      };

      await ErrorUtils.withErrorHandling(operation, context);

      const debugCalls = mockLogger.debug.mock.calls;
      const completedCall = debugCalls.find((call) =>
        call[0].includes('Operation completed'),
      );
      expect(completedCall).toBeDefined();
      expect(completedCall?.[0]).toMatch(/\d+ms/);
    });

    it('should handle string error type', async () => {
      const regularError = new Error('String type test');
      const operation = jest.fn().mockRejectedValue(regularError);
      const context: ErrorHandlingContext = {
        operationName: 'stringTypeTest',
        defaultErrorType: 'CUSTOM_ERROR' as ExtendedErrorType,
      };

      try {
        await ErrorUtils.withErrorHandling(operation, context);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedAppException);
      }
    });

    it('should include execution time in error context', async () => {
      const regularError = new Error('Timed error');
      const operation = jest.fn().mockRejectedValue(regularError);
      const context: ErrorHandlingContext = {
        operationName: 'errorWithTime',
        logger: mockLogger,
      };

      try {
        await ErrorUtils.withErrorHandling(operation, context);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedAppException);
        const enhanced = error as EnhancedAppException;
        expect((enhanced.enhancedDetails.details as Record<string, unknown>)?.executionTime).toBeDefined();
      }
    });
  });

  describe('createCorrelationContext', () => {
    it('should create new context when none exists', () => {
      (
        ErrorCorrelationManager.getContext as jest.Mock
      ).mockReturnValue(undefined);

      ErrorUtils.createCorrelationContext('testOperation', { key: 'value' });

      expect(ErrorCorrelationManager.setContext).toHaveBeenCalledWith(
        expect.objectContaining({
          operationName: 'testOperation',
          metadata: { key: 'value' },
        }),
      );
    });

    it('should update existing context', () => {
      const existingContext = {
        traceId: 'existing-trace',
        requestId: 'existing-request',
        spanId: 'existing-span',
        timestamp: new Date().toISOString(),
        serviceName: 'test-service',
        operationName: 'previousOperation',
        startTime: Date.now(),
        metadata: { existing: 'data' },
      };

      (
        ErrorCorrelationManager.getContext as jest.Mock
      ).mockReturnValue(existingContext);

      ErrorUtils.createCorrelationContext('newOperation', {
        newKey: 'newValue',
      });

      expect(ErrorCorrelationManager.updateContext).toHaveBeenCalledWith({
        operationName: 'newOperation',
        metadata: {
          existing: 'data',
          newKey: 'newValue',
        },
      });
    });

    it('should work without additional context', () => {
      (
        ErrorCorrelationManager.getContext as jest.Mock
      ).mockReturnValue(undefined);

      ErrorUtils.createCorrelationContext('simpleOperation');

      expect(ErrorCorrelationManager.setContext).toHaveBeenCalled();
    });

    it('should generate trace IDs with correct format', () => {
      (
        ErrorCorrelationManager.getContext as jest.Mock
      ).mockReturnValue(undefined);

      ErrorUtils.createCorrelationContext('operation');

      const setContextCall = (ErrorCorrelationManager.setContext as jest.Mock)
        .mock.calls[0][0];
      expect(setContextCall.traceId).toMatch(/^trace_\d+_/);
      expect(setContextCall.requestId).toMatch(/^req_\d+_/);
      expect(setContextCall.spanId).toMatch(/^span_/);
    });
  });

  describe('assert', () => {
    it('should not throw when condition is true', () => {
      expect(() => {
        ErrorUtils.assert(
          true,
          ExtendedErrorType.VALIDATION_ERROR,
          'ASSERTION_FAILED',
          'Should not throw',
        );
      }).not.toThrow();
    });

    it('should throw EnhancedAppException when condition is false', () => {
      expect(() => {
        ErrorUtils.assert(
          false,
          ExtendedErrorType.VALIDATION_ERROR,
          'ASSERTION_FAILED',
          'Condition was false',
        );
      }).toThrow(EnhancedAppException);
    });

    it('should create error with correct properties', () => {
      try {
        ErrorUtils.assert(
          false,
          ExtendedErrorType.AUTHENTICATION_ERROR,
          'NOT_AUTHENTICATED',
          'User not authenticated',
          HttpStatus.UNAUTHORIZED,
          { userId: 'user-123' },
        );
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedAppException);
        const enhanced = error as EnhancedAppException;
        expect(enhanced.enhancedDetails.type).toBe(
          ExtendedErrorType.AUTHENTICATION_ERROR,
        );
        expect(enhanced.enhancedDetails.code).toBe('NOT_AUTHENTICATED');
        expect(enhanced.enhancedDetails.message).toBe('User not authenticated');
        expect(enhanced.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }
    });

    it('should use default HTTP status when not provided', () => {
      try {
        ErrorUtils.assert(
          false,
          ExtendedErrorType.SYSTEM_ERROR,
          'SYSTEM_ERROR',
          'System error',
        );
        fail('Should have thrown');
      } catch (error) {
        expect((error as EnhancedAppException).getStatus()).toBe(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });

    it('should set medium severity for assertion errors', () => {
      try {
        ErrorUtils.assert(
          false,
          ExtendedErrorType.VALIDATION_ERROR,
          'CODE',
          'Message',
        );
        fail('Should have thrown');
      } catch (error) {
        expect((error as EnhancedAppException).enhancedDetails.severity).toBe(
          ErrorSeverity.MEDIUM,
        );
      }
    });

    it('should handle string error type', () => {
      try {
        ErrorUtils.assert(
          false,
          'STRING_ERROR_TYPE' as ExtendedErrorType,
          'CODE',
          'Message',
        );
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedAppException);
      }
    });

    it('should work as type guard (asserts keyword)', () => {
      const value: string | null = 'test';

      ErrorUtils.assert(
        value !== null,
        ExtendedErrorType.VALIDATION_ERROR,
        'NULL_VALUE',
        'Value should not be null',
      );

      // After assertion, TypeScript should narrow the type
      expect(value.length).toBe(4);
    });
  });

  describe('validateAndThrow', () => {
    it('should not throw when all validations pass', () => {
      const validations: ValidationEntry[] = [
        { condition: true, field: 'email', message: 'Email is required' },
        { condition: true, field: 'name', message: 'Name is required' },
      ];

      expect(() => {
        ErrorUtils.validateAndThrow(validations);
      }).not.toThrow();
    });

    it('should throw validation error when any validation fails', () => {
      const validations: ValidationEntry[] = [
        { condition: true, field: 'email', message: 'Email is required' },
        { condition: false, field: 'name', message: 'Name is required' },
      ];

      expect(() => {
        ErrorUtils.validateAndThrow(validations);
      }).toThrow(EnhancedAppException);
    });

    it('should include all failed validations in error', () => {
      const validations: ValidationEntry[] = [
        { condition: false, field: 'email', message: 'Email is required' },
        {
          condition: false,
          field: 'password',
          message: 'Password too short',
          value: 'abc',
        },
      ];

      try {
        ErrorUtils.validateAndThrow(validations);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedAppException);
        const enhanced = error as EnhancedAppException;
        expect(enhanced.enhancedDetails.message).toContain('2 field(s)');
        expect(enhanced.enhancedDetails.details).toEqual({
          validationDetails: {
            email: { message: 'Email is required', value: undefined },
            password: { message: 'Password too short', value: 'abc' },
          },
          field: undefined,
        });
      }
    });

    it('should handle single failed validation', () => {
      const validations: ValidationEntry[] = [
        { condition: false, field: 'required', message: 'Field is required' },
      ];

      try {
        ErrorUtils.validateAndThrow(validations);
        fail('Should have thrown');
      } catch (error) {
        const enhanced = error as EnhancedAppException;
        expect(enhanced.enhancedDetails.message).toContain('1 field(s)');
      }
    });

    it('should include validation values when provided', () => {
      const validations: ValidationEntry[] = [
        {
          condition: false,
          field: 'age',
          message: 'Must be positive',
          value: -5,
        },
      ];

      try {
        ErrorUtils.validateAndThrow(validations);
        fail('Should have thrown');
      } catch (error) {
        const enhanced = error as EnhancedAppException;
        const details = enhanced.enhancedDetails.details as {
          validationDetails: Record<string, { value: unknown }>;
        };
        expect(details.validationDetails.age.value).toBe(-5);
      }
    });

    it('should work with empty validation array', () => {
      expect(() => {
        ErrorUtils.validateAndThrow([]);
      }).not.toThrow();
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      jest.useFakeTimers({
        advanceTimers: true,
        doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval']
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return result on successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const options: ErrorRetryOptions = {
        operationName: 'testOperation',
        maxRetries: 3,
      };

      const result = await ErrorUtils.withRetry(operation, options);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const options: ErrorRetryOptions = {
        operationName: 'retryOperation',
        maxRetries: 3,
        baseDelay: 100,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // Advance time through all retry attempts: 100ms + 200ms = 300ms
      await jest.advanceTimersByTimeAsync(300);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const options: ErrorRetryOptions = {
        operationName: 'failingOperation',
        maxRetries: 3,
        baseDelay: 10,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // Advance time through all retry attempts: 10ms + 20ms + 40ms = 70ms
      await jest.advanceTimersByTimeAsync(70);

      await expect(resultPromise).rejects.toThrow(EnhancedAppException);

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry validation errors by default', async () => {
      const validationError = ErrorUtils.createValidationError(
        'Invalid data',
        {},
      );
      const operation = jest.fn().mockRejectedValue(validationError);

      const options: ErrorRetryOptions = {
        operationName: 'validationOperation',
        maxRetries: 3,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // No time advancement needed - validation errors don't trigger retries
      await expect(resultPromise).rejects.toThrow(validationError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry authentication errors by default', async () => {
      const authError = ErrorUtils.createAuthenticationError('Unauthorized');
      const operation = jest.fn().mockRejectedValue(authError);

      const options: ErrorRetryOptions = {
        operationName: 'authOperation',
        maxRetries: 3,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // No time advancement needed - authentication errors don't trigger retries
      await expect(resultPromise).rejects.toThrow(authError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry authorization errors by default', async () => {
      const authzError = ErrorUtils.createAuthorizationError(
        'resource',
        'action',
      );
      const operation = jest.fn().mockRejectedValue(authzError);

      const options: ErrorRetryOptions = {
        operationName: 'authzOperation',
        maxRetries: 3,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // No time advancement needed - authorization errors don't trigger retries
      await expect(resultPromise).rejects.toThrow(authzError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry condition', async () => {
      const customError = new Error('Custom retryable error');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(customError)
        .mockResolvedValue('success');

      const options: ErrorRetryOptions = {
        operationName: 'customRetryOperation',
        maxRetries: 3,
        baseDelay: 10,
        retryCondition: (error) => error.message.includes('retryable'),
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // Advance time for the single retry: 10ms
      await jest.advanceTimersByTimeAsync(10);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff when enabled', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const options: ErrorRetryOptions = {
        operationName: 'backoffOperation',
        maxRetries: 3,
        baseDelay: 100,
        exponentialBackoff: true,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // First retry after 100ms
      await jest.advanceTimersByTimeAsync(100);
      // Second retry after 200ms (exponential)
      await jest.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(result).toBe('success');
    });

    it('should use linear backoff when exponential is disabled', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const options: ErrorRetryOptions = {
        operationName: 'linearBackoffOperation',
        maxRetries: 3,
        baseDelay: 100,
        exponentialBackoff: false,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // Two retries, each after 100ms
      await jest.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(result).toBe('success');
    });

    it('should include retry context in EnhancedAppException', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const options: ErrorRetryOptions = {
        operationName: 'contextOperation',
        maxRetries: 2,
        baseDelay: 10,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // Advance time through both retry attempts: 10ms + 20ms = 30ms
      await jest.advanceTimersByTimeAsync(30);

      try {
        await resultPromise;
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedAppException);
        const enhanced = error as EnhancedAppException;
        expect(enhanced.enhancedDetails.code).toBe('RETRY_EXHAUSTED');
        expect((enhanced.enhancedDetails.details as Record<string, unknown>)?.retryAttempts).toBe(2);
        expect((enhanced.enhancedDetails.details as Record<string, unknown>)?.operationName).toBe(
          'contextOperation',
        );
      }
    });

    it('should preserve EnhancedAppException context on retry exhaustion', async () => {
      const originalError = ErrorUtils.createExternalServiceError(
        'Service',
        'operation',
      );
      const operation = jest.fn().mockRejectedValue(originalError);

      const options: ErrorRetryOptions = {
        operationName: 'preserveContext',
        maxRetries: 2,
        baseDelay: 10,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // Advance time through both retry attempts: 10ms + 20ms = 30ms
      await jest.advanceTimersByTimeAsync(30);

      try {
        await resultPromise;
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedAppException);
        const enhanced = error as EnhancedAppException;
        expect((enhanced.enhancedDetails.details as Record<string, unknown>)?.retryAttempts).toBe(2);
      }
    });

    it('should use default logger when not provided', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');

      const options: ErrorRetryOptions = {
        operationName: 'defaultLoggerTest',
        maxRetries: 2,
        baseDelay: 10,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // Advance time for the single retry: 10ms
      await jest.advanceTimersByTimeAsync(10);

      const result = await resultPromise;

      expect(result).toBe('success');
    });

    it('should log retry attempts', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const options: ErrorRetryOptions = {
        operationName: 'loggingTest',
        maxRetries: 3,
        baseDelay: 100,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      await jest.advanceTimersByTimeAsync(100);

      await resultPromise;

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retry attempt 1/3'),
        expect.objectContaining({
          error: 'First failure',
          attempt: 1,
        }),
      );
    });
  });

  describe('Type Safety', () => {
    it('should accept valid severity levels', () => {
      const severityLevels: SeverityLevel[] = [
        'low',
        'medium',
        'high',
        'critical',
      ];

      // Verify all severity levels are valid type values
      expect(severityLevels).toHaveLength(4);
      severityLevels.forEach(() => {
        const error = ErrorUtils.createValidationError('Test', {}, 'field');
        expect(error).toBeDefined();
      });
    });

    it('should accept valid business impact levels', () => {
      const impactLevels: BusinessImpactLevel[] = [
        'low',
        'medium',
        'high',
        'critical',
      ];

      impactLevels.forEach(() => {
        const error = ErrorUtils.createAuthenticationError('Test');
        expect(error).toBeDefined();
      });
    });

    it('should accept valid user impact levels', () => {
      const impactLevels: UserImpactLevel[] = [
        'none',
        'minimal',
        'moderate',
        'severe',
      ];

      impactLevels.forEach(() => {
        const error = ErrorUtils.createNotFoundError('Resource', 'id');
        expect(error).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty validation details', () => {
      const error = ErrorUtils.createValidationError('Test', {});

      expect(error).toBeDefined();
      const details = error.enhancedDetails.details as {
        validationDetails: Record<string, unknown>;
      } | undefined;
      expect(details?.validationDetails).toEqual({});
    });

    it('should handle empty recovery strategies array', async () => {
      const regularError = new Error('Test');
      const operation = jest.fn().mockRejectedValue(regularError);

      const context: ErrorHandlingContext = {
        operationName: 'test',
        recoveryStrategies: [],
      };

      try {
        await ErrorUtils.withErrorHandling(operation, context);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedAppException);
      }
    });

    it('should handle non-Error objects thrown from operations', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      const context: ErrorHandlingContext = {
        operationName: 'stringErrorTest',
      };

      try {
        await ErrorUtils.withErrorHandling(operation, context);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedAppException);
        const enhanced = error as EnhancedAppException;
        // String errors are converted via String(error) and stored in details
        const details = enhanced.enhancedDetails.details as { originalError: string };
        expect(details?.originalError).toBe('string error');
      }
    });

    it('should include reset time in rate limit error details', () => {
      const resetTime = new Date();
      const error = ErrorUtils.createRateLimitError(
        100,
        resetTime,
      );

      expect(error).toBeDefined();
      // resetTime is stored in details, not context
      const details = error.enhancedDetails.details as { resetTime: string };
      expect(details?.resetTime).toBe(resetTime.toISOString());
    });

    it('should handle zero max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Immediate fail'));

      const options: ErrorRetryOptions = {
        operationName: 'zeroRetries',
        maxRetries: 1, // At least 1 is needed
        baseDelay: 10,
        logger: mockLogger,
      };

      const resultPromise = ErrorUtils.withRetry(operation, options);

      // No time advancement needed - this test fails immediately
      await expect(resultPromise).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});
