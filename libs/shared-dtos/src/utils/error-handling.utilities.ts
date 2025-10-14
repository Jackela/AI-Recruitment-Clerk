/**
 * Error Handling Utilities - Helper functions for consistent error management
 * Provides utility functions for common error handling patterns
 */

import { Logger, HttpStatus } from '@nestjs/common';
import {
  EnhancedAppException,
  ExtendedErrorType,
} from '../errors/enhanced-error-types';
import { DomainErrorFactory, DatabaseErrorCode } from '../errors/domain-errors';
import { ErrorCorrelationManager } from '../errors/error-correlation';

/**
 * Error creation utilities for different scenarios
 */
export class ErrorUtils {
  private static readonly logger = new Logger(ErrorUtils.name);

  /**
   * Create a validation error with detailed context
   */
  static createValidationError(
    message: string,
    validationDetails: Record<string, any>,
    field?: string,
  ): EnhancedAppException {
    const error = new EnhancedAppException(
      ExtendedErrorType.VALIDATION_ERROR,
      'VALIDATION_FAILED',
      message,
      HttpStatus.BAD_REQUEST,
      { validationDetails, field },
    );

    return error
      .withSeverity('medium' as any)
      .withUserImpact('moderate')
      .withBusinessImpact('low')
      .withRecoveryStrategies([
        'Check input format and try again',
        'Verify all required fields are provided',
        'Ensure data types match expected format',
      ]);
  }

  /**
   * Create an authentication error
   */
  static createAuthenticationError(
    reason: string = 'Authentication failed',
    context?: Record<string, any>,
  ): EnhancedAppException {
    const error = new EnhancedAppException(
      ExtendedErrorType.AUTHENTICATION_ERROR,
      'AUTH_FAILED',
      reason,
      HttpStatus.UNAUTHORIZED,
      context,
    );

    return error
      .withSeverity('medium' as any)
      .withUserImpact('moderate')
      .withBusinessImpact('medium')
      .withRecoveryStrategies([
        'Please log in again',
        'Check your credentials',
        'Contact support if problem persists',
      ]);
  }

  /**
   * Create an authorization error
   */
  static createAuthorizationError(
    resource: string,
    action: string,
    context?: Record<string, any>,
  ): EnhancedAppException {
    const error = new EnhancedAppException(
      ExtendedErrorType.AUTHORIZATION_ERROR,
      'ACCESS_DENIED',
      `Access denied for ${action} on ${resource}`,
      HttpStatus.FORBIDDEN,
      { resource, action, ...context },
    );

    return error
      .withSeverity('medium' as any)
      .withUserImpact('moderate')
      .withBusinessImpact('medium')
      .withRecoveryStrategies([
        'Contact administrator for required permissions',
        'Verify your account has appropriate access level',
        'Try accessing a different resource',
      ]);
  }

  /**
   * Create a resource not found error
   */
  static createNotFoundError(
    resourceType: string,
    identifier: string,
    searchContext?: Record<string, any>,
  ): EnhancedAppException {
    const error = new EnhancedAppException(
      ExtendedErrorType.NOT_FOUND_ERROR,
      'RESOURCE_NOT_FOUND',
      `${resourceType} with identifier '${identifier}' not found`,
      HttpStatus.NOT_FOUND,
      { resourceType, identifier, searchContext },
    );

    return error
      .withSeverity('low' as any)
      .withUserImpact('minimal')
      .withBusinessImpact('low')
      .withRecoveryStrategies([
        'Check the identifier and try again',
        'Verify the resource exists',
        'Use search to find available resources',
      ]);
  }

  /**
   * Create a rate limit error
   */
  static createRateLimitError(
    limit: number,
    resetTime: Date,
    context?: Record<string, any>,
  ): EnhancedAppException {
    const error = new EnhancedAppException(
      ExtendedErrorType.RATE_LIMIT_ERROR,
      'RATE_LIMIT_EXCEEDED',
      `Rate limit of ${limit} requests exceeded`,
      HttpStatus.TOO_MANY_REQUESTS,
      { limit, resetTime: resetTime.toISOString(), ...context },
    );

    return error
      .withSeverity('low' as any)
      .withUserImpact('minimal')
      .withBusinessImpact('low')
      .withRecoveryStrategies([
        `Wait until ${resetTime.toLocaleString()} and try again`,
        'Reduce request frequency',
        'Consider upgrading your plan for higher limits',
      ]);
  }

  /**
   * Create an external service error
   */
  static createExternalServiceError(
    serviceName: string,
    operation: string,
    originalError?: Error,
    context?: Record<string, any>,
  ): EnhancedAppException {
    const error = new EnhancedAppException(
      ExtendedErrorType.EXTERNAL_SERVICE_ERROR,
      'EXTERNAL_SERVICE_FAILED',
      `External service '${serviceName}' failed during ${operation}`,
      HttpStatus.BAD_GATEWAY,
      {
        serviceName,
        operation,
        originalError: originalError?.message,
        ...context,
      },
    );

    return error
      .withSeverity('high' as any)
      .withUserImpact('moderate')
      .withBusinessImpact('high')
      .withRecoveryStrategies([
        'Try again in a few moments',
        'Check service status page',
        'Contact support if issue persists',
        'Use alternative service if available',
      ]);
  }

  /**
   * Create a database error
   */
  static createDatabaseError(
    operation: string,
    table?: string,
    originalError?: Error,
    context?: Record<string, any>,
  ): EnhancedAppException {
    return DomainErrorFactory.databaseError(
      DatabaseErrorCode.OPERATION_FAILED,
      operation,
      table,
      { originalError: originalError?.message, ...context },
    );
  }

  /**
   * Wrap an async operation with standardized error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorContext: {
      operationName: string;
      defaultErrorType?: ExtendedErrorType | string;
      defaultErrorCode?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      businessImpact?: 'low' | 'medium' | 'high' | 'critical';
      userImpact?: 'none' | 'minimal' | 'moderate' | 'severe';
      recoveryStrategies?: string[];
      logger?: Logger;
    },
  ): Promise<T> {
    const logger = errorContext.logger || this.logger;
    const startTime = Date.now();

    try {
      logger.debug(`Starting operation: ${errorContext.operationName}`);

      const result = await operation();

      const executionTime = Date.now() - startTime;
      logger.debug(
        `Operation completed: ${errorContext.operationName} (${executionTime}ms)`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(
        `Operation failed: ${errorContext.operationName} (${executionTime}ms)`,
        {
          error: error instanceof Error ? error.message : String(error),
          executionTime,
        },
      );

      // If already an enhanced error, just add context and re-throw
      if (error instanceof EnhancedAppException) {
        error.withContext({
          operationName: errorContext.operationName,
          executionTime,
        });

        if (errorContext.recoveryStrategies) {
          error.withRecoveryStrategies(errorContext.recoveryStrategies);
        }

        throw error;
      }

      // Create enhanced error from regular error
      const enhancedError = new EnhancedAppException(
        (errorContext.defaultErrorType as any) ||
          ExtendedErrorType.SYSTEM_ERROR,
        errorContext.defaultErrorCode || 'OPERATION_FAILED',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          originalError: error instanceof Error ? error.message : String(error),
          operationName: errorContext.operationName,
          executionTime,
        },
      );

      // Apply context
      if (errorContext.severity) {
        enhancedError.withSeverity(errorContext.severity as any);
      }
      if (errorContext.businessImpact) {
        enhancedError.withBusinessImpact(errorContext.businessImpact);
      }
      if (errorContext.userImpact) {
        enhancedError.withUserImpact(errorContext.userImpact);
      }
      if (errorContext.recoveryStrategies) {
        enhancedError.withRecoveryStrategies(errorContext.recoveryStrategies);
      }

      throw enhancedError;
    }
  }

  /**
   * Create correlation context for operations
   */
  static createCorrelationContext(
    operationName: string,
    additionalContext?: Record<string, any>,
  ): void {
    const existingContext = ErrorCorrelationManager.getContext();

    if (existingContext) {
      ErrorCorrelationManager.updateContext({
        operationName,
        metadata: {
          ...existingContext.metadata,
          ...additionalContext,
        },
      });
    } else {
      ErrorCorrelationManager.setContext({
        traceId: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        spanId: `span_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        serviceName: 'shared-utilities',
        operationName,
        startTime: Date.now(),
        metadata: additionalContext,
      });
    }
  }

  /**
   * Assert condition and throw enhanced error if false
   */
  static assert(
    condition: boolean,
    errorType: ExtendedErrorType | string,
    errorCode: string,
    message: string,
    httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    context?: Record<string, any>,
  ): asserts condition {
    if (!condition) {
      const error = new EnhancedAppException(
        typeof errorType === 'string' ? (errorType as any) : errorType,
        errorCode,
        message,
        httpStatus,
        context,
      );

      error.withSeverity('medium' as any);
      throw error;
    }
  }

  /**
   * Validate and throw detailed validation error
   */
  static validateAndThrow(
    validations: Array<{
      condition: boolean;
      field: string;
      message: string;
      value?: any;
    }>,
  ): void {
    const failures = validations.filter((v) => !v.condition);

    if (failures.length > 0) {
      const validationDetails = failures.reduce(
        (acc, failure) => {
          acc[failure.field] = {
            message: failure.message,
            value: failure.value,
          };
          return acc;
        },
        {} as Record<string, any>,
      );

      throw this.createValidationError(
        `Validation failed for ${failures.length} field(s)`,
        validationDetails,
      );
    }
  }

  /**
   * Execute operation with automatic retry and error handling
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      exponentialBackoff?: boolean;
      retryCondition?: (error: Error) => boolean;
      operationName: string;
      logger?: Logger;
    },
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      exponentialBackoff = true,
      retryCondition = (error) =>
        !(
          error instanceof EnhancedAppException &&
          [
            'VALIDATION_ERROR',
            'AUTHENTICATION_ERROR',
            'AUTHORIZATION_ERROR',
          ].includes(error.enhancedDetails.type)
        ),
      operationName,
      logger = this.logger,
    } = options;

    let lastError: Error | undefined;
    let delay = baseDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries || !retryCondition(lastError)) {
          break;
        }

        logger.warn(
          `Retry attempt ${attempt}/${maxRetries} for ${operationName}`,
          {
            error: lastError.message,
            attempt,
            nextRetryIn: delay,
          },
        );

        await new Promise((resolve) => setTimeout(resolve, delay));

        if (exponentialBackoff) {
          delay *= 2;
        }
      }
    }

    // Enhance final error
    if (lastError instanceof EnhancedAppException) {
      throw lastError.withContext({
        retryAttempts: maxRetries,
        operationName,
      });
    }

    throw new EnhancedAppException(
      ExtendedErrorType.SYSTEM_ERROR,
      'RETRY_EXHAUSTED',
      `Operation ${operationName} failed after ${maxRetries} retries`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        originalError: lastError?.message || 'Unknown error',
        retryAttempts: maxRetries,
        operationName,
      },
    ).withSeverity('high' as any);
  }
}
