/**
 * Shared API Error Response DTO
 *
 * Provides a consistent error response shape across all services.
 * This is the canonical DTO for API error responses.
 *
 * Backward compatible fields are preserved to ensure existing clients
 * continue to work without modification.
 */

/**
 * Core error information in the response
 */
export interface ErrorResponse {
  /** Error type/category (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  type: string;
  /** Machine-readable error code (e.g., 'RESUME_PARSE_FAILED') */
  code: string;
  /** Developer-friendly error message */
  message: string;
  /** User-friendly error message (localized when possible) */
  userMessage: string;
  /** ISO 8601 timestamp when the error occurred */
  timestamp: string;
  /** Error severity level: 'low' | 'medium' | 'high' | 'critical' */
  severity: string;
  /** Distributed tracing identifier for correlation */
  traceId?: string;
  /** Request identifier for tracking */
  requestId?: string;
}

/**
 * Request context information
 */
export interface ErrorResponseContext {
  /** Request path that caused the error */
  path?: string;
  /** HTTP method of the request */
  method?: string;
  /** Service name that generated the error */
  serviceName?: string;
  /** Operation name within the service */
  operationName?: string;
  /** Client IP address */
  ip?: string;
}

/**
 * Distributed correlation information
 */
export interface ErrorCorrelation {
  /** Distributed trace identifier */
  traceId?: string;
  /** Request identifier */
  requestId?: string;
  /** Span identifier for tracing */
  spanId?: string;
  /** Parent span identifier */
  parentSpanId?: string;
}

/**
 * Recovery information for clients
 */
export interface ErrorRecovery {
  /** Suggested recovery strategies */
  strategies: string[];
  /** User-friendly suggestions */
  suggestions: string[];
  /** Whether the request is safely retryable */
  retryable: boolean;
}

/**
 * Business impact assessment
 */
export interface ErrorImpact {
  /** Business impact level: 'low' | 'medium' | 'high' */
  business: string;
  /** User impact level: 'minimal' | 'moderate' | 'severe' */
  user: string;
}

/**
 * Monitoring and observability data
 */
export interface ErrorMonitoring {
  /** Tags for metrics and alerting */
  tags: Record<string, string>;
  /** Metrics for monitoring */
  metrics: Record<string, number>;
}

/**
 * Standardized API error response DTO
 *
 * This is the main error response shape returned by all services.
 * All fields are optional at the top level to support partial responses.
 */
export interface ErrorResponseDto {
  /** Always false for error responses */
  success: false;
  /** Core error information */
  error: ErrorResponse;
  /** Request context */
  context: ErrorResponseContext;
  /** Distributed tracing correlation */
  correlation?: ErrorCorrelation;
  /** Recovery guidance for clients */
  recovery?: ErrorRecovery;
  /** Business impact assessment */
  impact?: ErrorImpact;
  /** Additional error details (development only) */
  details?: unknown;
  /** Stack trace (development only) */
  stack?: string;
  /** Monitoring and observability data */
  monitoring?: ErrorMonitoring;
}

/**
 * Minimal error response for health checks and simple scenarios
 */
export interface MinimalErrorResponseDto {
  /** Always false for error responses */
  success: false;
  /** Error message */
  error: string;
  /** Error code */
  code: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Optional trace identifier */
  traceId?: string;
}
