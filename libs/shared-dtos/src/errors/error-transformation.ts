import { HttpStatus } from '@nestjs/common';
import { EnhancedAppException } from './enhanced-error-types';
import { ErrorSeverity, ErrorType } from '../common/error-handling.patterns';

export interface FieldValidationError {
  field: string;
  message: string;
  value?: unknown;
  children?: FieldValidationError[];
}

export class ErrorTransformer {
  public static fromHttpStatus(
    status: number,
    message = 'HTTP error',
    details?: unknown,
  ): EnhancedAppException {
    const error = new EnhancedAppException(
      this.mapHttpStatusToErrorType(status),
      this.mapHttpStatusToCode(status),
      message,
      status,
      details,
    );

    return error.withSeverity(this.mapHttpStatusToSeverity(status));
  }

  public static fromDatabaseError(error: Error): EnhancedAppException {
    const message = error.message.toLowerCase();

    if (message.includes('unique') || message.includes('duplicate')) {
      return new EnhancedAppException(
        ErrorType.VALIDATION,
        'DATABASE_UNIQUE_CONSTRAINT',
        'A record with this value already exists',
        HttpStatus.CONFLICT,
        { originalError: error.message },
      ).withSeverity(ErrorSeverity.MEDIUM);
    }

    if (message.includes('foreign key') || message.includes('fk_')) {
      return new EnhancedAppException(
        ErrorType.VALIDATION,
        'DATABASE_FOREIGN_KEY_CONSTRAINT',
        'Referenced data is invalid or missing',
        HttpStatus.BAD_REQUEST,
        { originalError: error.message },
      ).withSeverity(ErrorSeverity.MEDIUM);
    }

    if (message.includes('serialization') || message.includes('serialize')) {
      return new EnhancedAppException(
        ErrorType.DATABASE,
        'DATABASE_SERIALIZATION_FAILURE',
        'Database transaction conflict, retry the operation',
        HttpStatus.CONFLICT,
        { originalError: error.message },
      )
        .withSeverity(ErrorSeverity.HIGH)
        .withRecoveryStrategies(['Retry transaction', 'Use backoff']);
    }

    const code = message.includes('timeout')
      ? 'DATABASE_QUERY_TIMEOUT'
      : 'DATABASE_CONNECTION_ERROR';

    return new EnhancedAppException(
      ErrorType.DATABASE,
      code,
      message.includes('timeout')
        ? 'Database query timed out'
        : 'Database connection failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { originalError: error.message },
    ).withSeverity(ErrorSeverity.HIGH);
  }

  public static fromValidationErrors(
    validationErrors: FieldValidationError[],
  ): EnhancedAppException {
    return new EnhancedAppException(
      ErrorType.VALIDATION,
      'VALIDATION_FAILED',
      'Request validation failed',
      HttpStatus.BAD_REQUEST,
      {
        fields: validationErrors,
      },
    ).withSeverity(ErrorSeverity.MEDIUM);
  }

  public static fromUnknown(thrown: unknown): EnhancedAppException {
    if (thrown instanceof Error) {
      const transformed = new EnhancedAppException(
        ErrorType.SYSTEM,
        'UNKNOWN_ERROR',
        'An unexpected error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { originalError: thrown.message },
      ).withSeverity(ErrorSeverity.CRITICAL);

      transformed.stack = thrown.stack;
      return transformed;
    }

    return new EnhancedAppException(
      ErrorType.SYSTEM,
      'UNKNOWN_ERROR',
      'An unexpected error occurred',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { originalError: thrown },
    ).withSeverity(ErrorSeverity.CRITICAL);
  }

  private static mapHttpStatusToErrorType(status: number): ErrorType {
    const statusMap: Record<number, ErrorType> = {
      400: ErrorType.VALIDATION,
      401: ErrorType.AUTHENTICATION,
      403: ErrorType.AUTHORIZATION,
      404: ErrorType.NOT_FOUND,
      409: ErrorType.CONFLICT,
      422: ErrorType.VALIDATION,
      429: ErrorType.RATE_LIMIT,
      500: ErrorType.SYSTEM,
      502: ErrorType.EXTERNAL_SERVICE,
      503: ErrorType.EXTERNAL_SERVICE,
      504: ErrorType.EXTERNAL_SERVICE,
    };

    return statusMap[status] || ErrorType.SYSTEM;
  }

  private static mapHttpStatusToCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return codeMap[status] || 'UNKNOWN_HTTP_ERROR';
  }

  private static mapHttpStatusToSeverity(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }
}
