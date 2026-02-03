/**
 * @fileoverview Shared Error Handler Utility
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 1.0.0
 * @module ErrorHandlerUtil
 */

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId?: string;
    stack?: string;
  };
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for better error classification
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  UNKNOWN = 'unknown',
}

/**
 * Application error base class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly category: ErrorCategory = ErrorCategory.UNKNOWN,
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to standardized error response
   */
  toResponse(requestId?: string): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
        requestId,
        stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
      },
    };
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', ErrorCategory.VALIDATION, ErrorSeverity.LOW, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'NOT_FOUND', ErrorCategory.NOT_FOUND, ErrorSeverity.LOW, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Authentication error for failed authentication
 */
export class AuthenticationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHENTICATION_ERROR', ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error for insufficient permissions
 */
export class AuthorizationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHORIZATION_ERROR', ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Configuration error for misconfiguration
 */
export class ConfigurationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIGURATION_ERROR', ErrorCategory.UNKNOWN, ErrorSeverity.CRITICAL, details);
    this.name = 'ConfigurationError';
  }
}

/**
 * External service error for third-party service failures
 */
export class ExternalServiceError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'EXTERNAL_SERVICE_ERROR', ErrorCategory.EXTERNAL_SERVICE, ErrorSeverity.MEDIUM, details);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Options for asyncErrorBoundary
 */
export interface ErrorBoundaryOptions {
  /** Custom error handler function */
  onError?: (error: Error) => void;
  /** Request ID for error correlation */
  requestId?: string;
  /** Default error code if not specified */
  defaultErrorCode?: string;
  /** Whether to log errors */
  logErrors?: boolean;
  /** Logger instance (defaults to console) */
  logger?: Pick<Console, 'error' | 'warn' | 'info'>;
}

/**
 * Default error handler that logs errors
 */
function defaultErrorHandler(error: Error): void {
  console.error('[ErrorBoundary]', error);
}

/**
 * Wraps an async function with standardized error handling
 *
 * @param fn - The async function to wrap
 * @param options - Error boundary options
 * @returns Wrapped function with error handling
 *
 * @example
 * ```typescript
 * const handler = asyncErrorBoundary(async (req, res) => {
 *   // Your async logic here
 *   return result;
 * }, {
 *   defaultErrorCode: 'OPERATION_FAILED',
 *   logErrors: true
 * });
 * ```
 */
export function asyncErrorBoundary<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: ErrorBoundaryOptions = {},
): (...args: T) => Promise<R | ErrorResponse> {
  const {
    onError = defaultErrorHandler,
    requestId,
    defaultErrorCode = 'INTERNAL_ERROR',
    logErrors = true,
    logger = console,
  } = options;

  return async (...args: T): Promise<R | ErrorResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Log error if enabled
      if (logErrors) {
        logger.error(`[asyncErrorBoundary] ${error instanceof Error ? error.message : 'Unknown error'}`, error);
      }

      // Call custom error handler
      onError(error as Error);

      // Convert to standardized error response
      if (error instanceof AppError) {
        return error.toResponse(requestId);
      }

      // Handle standard Error objects
      if (error instanceof Error) {
        return {
          success: false,
          error: {
            code: defaultErrorCode,
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
        };
      }

      // Handle unknown errors
      return {
        success: false,
        error: {
          code: defaultErrorCode,
          message: 'An unknown error occurred',
          timestamp: new Date().toISOString(),
          requestId,
        },
      };
    }
  };
}

/**
 * Wraps a synchronous function with standardized error handling
 *
 * @param fn - The function to wrap
 * @param options - Error boundary options
 * @returns Wrapped function with error handling
 */
export function errorBoundary<T extends unknown[], R>(
  fn: (...args: T) => R,
  options: ErrorBoundaryOptions = {},
): (...args: T) => R | ErrorResponse {
  const {
    onError = defaultErrorHandler,
    requestId,
    defaultErrorCode = 'INTERNAL_ERROR',
    logErrors = true,
    logger = console,
  } = options;

  return (...args: T): R | ErrorResponse => {
    try {
      return fn(...args);
    } catch (error) {
      // Log error if enabled
      if (logErrors) {
        logger.error(`[errorBoundary] ${error instanceof Error ? error.message : 'Unknown error'}`, error);
      }

      // Call custom error handler
      onError(error as Error);

      // Convert to standardized error response
      if (error instanceof AppError) {
        return error.toResponse(requestId);
      }

      // Handle standard Error objects
      if (error instanceof Error) {
        return {
          success: false,
          error: {
            code: defaultErrorCode,
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
        };
      }

      // Handle unknown errors
      return {
        success: false,
        error: {
          code: defaultErrorCode,
          message: 'An unknown error occurred',
          timestamp: new Date().toISOString(),
          requestId,
        },
      };
    }
  };
}

/**
 * Creates a success response (for type consistency)
 */
export function successResponse<T>(data: T, requestId?: string): { success: true; data: T; requestId?: string } {
  return {
    success: true,
    data,
    ...(requestId && { requestId }),
  };
}

/**
 * Creates a standardized error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
  requestId?: string,
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}

/**
 * Extracts error information from unknown error type
 */
export function extractErrorInfo(error: unknown): {
  message: string;
  code: string;
  stack?: string;
  details?: unknown;
} {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      stack: error.stack,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'GENERIC_ERROR',
      stack: error.stack,
      details: undefined,
    };
  }

  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    stack: undefined,
    details: error,
  };
}

/**
 * Determines if an error is retryable based on its type/message
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return [
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.NETWORK,
      ErrorCategory.DATABASE,
    ].includes(error.category);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('network') ||
      message.includes('connection reset')
    );
  }

  return false;
}
