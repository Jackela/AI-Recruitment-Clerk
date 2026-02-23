// Infrastructure Shared Types
// Note: Avoid cross-library re-exports to keep build boundaries clean

// Common types (enums and base interfaces)
export * from './common';

// Exception filter components
export * from './filters';

// Interceptor types and factory
export * from './interceptors';

// Validation utilities
export * from './validation';

// Encryption service
export * from './encryption';

// Design-by-Contract decorators and validators
export * from './contracts';

// Resilience patterns (retry, circuit breaker)
export * from './resilience';

// Domain-specific exceptions and error correlation
export * from './errors';

// Database performance monitoring
export * from './monitoring';

// Re-export error handling utilities for convenience
export {
  asyncErrorBoundary,
  errorBoundary,
  successResponse,
  errorResponse,
  extractErrorInfo,
  isRetryableError,
  type ErrorResponse,
  type ErrorBoundaryOptions,
  type ErrorCategory,
  type ErrorSeverity,
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConfigurationError,
  ExternalServiceError,
} from './error-handling';

// Re-export validation utilities for convenience
export {
  EmailValidator,
  PhoneValidator,
  IdValidator,
  SchemaValidator,
  Validator,
  type ValidationResult,
  type ValidationOptions,
  type EmailValidationOptions,
  type PhoneValidationOptions,
  type IdValidationOptions,
  type SchemaDefinition,
} from './utilities';

// Re-export pipes for convenience
export {
  DtoValidationPipe,
  createDtoValidationPipe,
  type DtoValidationPipeOptions,
  type FormattedValidationError,
} from './pipes';

// Re-export bootstrap utilities for convenience
export {
  bootstrapNestJsMicroservice,
  bootstrapNestJsGateway,
  bootstrapWithErrorHandling,
  type MicroserviceBootstrapOptions,
  type GatewayBootstrapOptions,
} from './bootstrap';

// Re-export logger for convenience
export {
  Logger,
  createLogger,
  logger,
  sharedLogger,
  type LogContext,
  type LogEntry,
  type LoggerOptions,
} from './logging';
