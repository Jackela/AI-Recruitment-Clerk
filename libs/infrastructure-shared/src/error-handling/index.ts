// Error Handling Infrastructure

// Error handler utility with asyncErrorBoundary wrapper
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
} from './error-handler.util';

// Application error classes
export {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConfigurationError,
  ExternalServiceError,
} from './error-handler.util';

// TODO: Move additional error handling utilities from shared-dtos as needed
