/**
 * Shared API Type Definitions
 *
 * This library provides centralized type definitions for API responses,
 * requests with context, and error handling. These types are used across
 * all services to ensure consistency and type safety.
 */

/**
 * Standard API response wrapper
 * @template T - The type of data returned on success
 */
export interface ApiResponse<T = unknown> {
  /** Indicates whether the request was successful */
  success: boolean;
  /** The response data (present on success) */
  data?: T;
  /** Error details (present on failure) */
  error?: ServiceError;
  /** Optional message describing the result */
  message?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Timestamp of the response */
  timestamp?: string;
}

/**
 * Paginated API response wrapper
 * @template T - The type of items in the page
 */
export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  /** Pagination metadata */
  pagination?: {
    /** Current page number (1-indexed) */
    page: number;
    /** Number of items per page */
    pageSize: number;
    /** Total number of items across all pages */
    totalItems: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there is a next page */
    hasNext: boolean;
    /** Whether there is a previous page */
    hasPrevious: boolean;
  };
}

/**
 * Request with additional context
 * Extends the Express Request type with user and metadata context
 */
export interface RequestWithContext {
  /** Authenticated user information */
  user?: {
    /** Unique user identifier */
    id: string;
    /** User's email address */
    email: string;
    /** User's role for authorization */
    role?: string;
    /** Array of user permissions */
    permissions?: string[];
  };
  /** Request correlation ID for tracing */
  correlationId?: string;
  /** Device ID for mobile clients */
  deviceId?: string;
  /** Request timestamp */
  requestTime?: number;
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
}

/**
 * Service error details
 */
export interface ServiceError {
  /** Machine-readable error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Additional error context */
  details?: Record<string, unknown>;
  /** Stack trace (development only) */
  stack?: string;
  /** Error severity level */
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Error response type for API endpoints
 */
export type ErrorResponse = Omit<ApiResponse<never>, 'data'> & {
  error: ServiceError;
};

/**
 * Result type for operations that can fail
 * Similar to Rust's Result<T, E> or TypeScript's Result pattern
 * @template T - Success type
 * @template E - Error type (defaults to ServiceError)
 */
export type Result<T, E = ServiceError> =
  | { success: true; data: T; error?: undefined }
  | { success: false; data?: undefined; error: E };

/**
 * Helper function to create a successful result
 */
export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Helper function to create an error result
 */
export function err<E extends ServiceError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Helper function to create a success API response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode = 200,
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper function to create an error API response
 */
export function errorResponse(
  code: string,
  message: string,
  statusCode = 500,
  details?: Record<string, unknown>,
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      statusCode,
      details,
    },
    statusCode,
    timestamp: new Date().toISOString(),
  };
}
