# Error Handling Guide

This guide documents the standardized error handling patterns used across the AI Recruitment Clerk platform.

## Overview

The platform uses a comprehensive error handling system built on top of NestJS, providing consistent error responses, structured logging, and error correlation across all services.

## Architecture

The error handling system consists of several layers:

1. **Base Error Classes** (`@ai-recruitment-clerk/shared-dtos/common/error-handling.patterns`)
   - `AppException` - Base exception class for all application errors
   - Specific error types: `ValidationException`, `ResourceNotFoundException`, etc.

2. **Enhanced Error Types** (`@ai-recruitment-clerk/shared-dtos/errors/enhanced-error-types`)
   - `EnhancedAppException` - Extended error class with correlation support
   - Domain-specific errors: `NatsMessageException`, `MLModelException`, etc.

3. **Global Exception Filter** (`@ai-recruitment-clerk/shared-dtos/errors/global-exception.filter`)
   - `StandardizedGlobalExceptionFilter` - Catches and formats all exceptions
   - Automatic correlation ID generation
   - Structured logging integration

4. **Error Module** (`@ai-recruitment-clerk/shared-dtos/interceptors/error-handling.module`)
   - `ErrorHandlingModule` - Provides global error handling setup

## Installation

### For NestJS Services

Import the `ErrorHandlingModule` in your application module:

```typescript
import { ErrorHandlingModule } from '@ai-recruitment-clerk/shared-dtos';

@Module({
  imports: [
    ErrorHandlingModule.forService('your-service-name'),
    // ... other imports
  ],
})
export class AppModule {}
```

This automatically sets up:
- Global exception filter
- Error correlation manager
- Structured logging

### For Infrastructure Libraries

Use the utilities from `@ai-recruitment-clerk/infrastructure-shared`:

```typescript
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  errorBoundary,
  asyncErrorBoundary,
} from '@ai-recruitment-clerk/infrastructure-shared';
```

## Usage Patterns

### 1. Throwing Typed Errors

Use the appropriate error class for the situation:

```typescript
import {
  AppException,
  ValidationException,
  ResourceNotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  ExternalServiceException,
} from '@ai-recruitment-clerk/shared-dtos';

// Validation error
throw new ValidationException('Email is required', {
  field: 'email',
  value: undefined,
});

// Not found error
throw new ResourceNotFoundException('User', userId);

// Authorization error
throw new UnauthorizedException('Invalid credentials');

// Business logic conflict
throw new ConflictException('Email already registered', {
  email: dto.email,
});

// External service error
throw new ExternalServiceException('OpenAI', 'API rate limit exceeded', 429);
```

### 2. Enhanced Errors with Context

For more detailed error handling with correlation:

```typescript
import {
  EnhancedAppException,
  ErrorType,
  ErrorSeverity,
} from '@ai-recruitment-clerk/shared-dtos';

const error = new EnhancedAppException(
  ErrorType.EXTERNAL_SERVICE,
  'DATABASE_CONNECTION_FAILED',
  'Failed to connect to database',
  HttpStatus.SERVICE_UNAVAILABLE,
  { host: dbConfig.host },
)
  .withBusinessImpact('high')
  .withUserImpact('severe')
  .withRecoveryStrategies([
    'Retry connection',
    'Check database status',
    'Use cached data',
  ]);

throw error;
```

### 3. Domain-Specific Errors

Use pre-configured error classes for common scenarios:

```typescript
import {
  NatsMessageException,
  MLModelException,
  ParsingException,
  CacheException,
  QueueException,
  TemplateException,
} from '@ai-recruitment-clerk/shared-dtos';

// NATS messaging error
throw new NatsMessageException(
  'publish',
  'resume.submitted',
  'Connection timeout',
  originalError,
);

// ML model error
throw new MLModelException(
  'gemini-pro',
  'resume-analysis',
  'Prompt validation failed',
);

// File parsing error
throw new ParsingException(
  'pdf',
  'resume.pdf',
  'pdf-parse',
  'Encrypted PDF not supported',
  fileSize,
);
```

### 4. Error Handling in Services

Use the error boundary wrapper for service methods:

```typescript
import { asyncErrorBoundary } from '@ai-recruitment-clerk/infrastructure-shared';

class MyService {
  async processResume(data: Buffer) {
    // Automatically catches and formats errors
    return asyncErrorBoundary(async () => {
      // Your logic here
      return result;
    }, {
      defaultErrorCode: 'RESUME_PROCESSING_FAILED',
      logErrors: true,
    })();
  }
}
```

### 5. Adding Context to Errors

Enhance errors with additional context for debugging:

```typescript
import { ErrorHandler } from '@ai-recruitment-clerk/shared-dtos';

try {
  await someOperation();
} catch (error) {
  const appException = ErrorHandler.handleError(
    error as Error,
    'UserService.createUser',
  );

  // Add additional context
  appException
    .withTraceId(traceId)
    .withUserId(userId)
    .withContext({ operation: 'create', resource: 'user' });

  throw appException;
}
```

## Error Response Format

All errors are returned in a standardized format:

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "code": "VALIDATION_FAILED",
    "message": "Email is required",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "traceId": "trace_1234567890_abc123",
    "details": {
      "field": "email"
    },
    "requestId": "req_abc123"
  },
  "correlation": {
    "traceId": "trace_1234567890_abc123",
    "requestId": "req_abc123",
    "userId": "user_123"
  },
  "recovery": {
    "strategies": [
      "Check all required fields",
      "Verify data formats"
    ]
  }
}
```

## Error Types Reference

| Error Type | HTTP Status | Use Case |
|------------|-------------|----------|
| `VALIDATION_ERROR` | 400 | Input validation failures |
| `AUTHENTICATION_ERROR` | 401 | Missing/invalid credentials |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND_ERROR` | 404 | Resource not found |
| `CONFLICT_ERROR` | 409 | State conflicts |
| `RATE_LIMIT_ERROR` | 429 | Too many requests |
| `EXTERNAL_SERVICE_ERROR` | 502/503/504 | Third-party service failures |
| `DATABASE_ERROR` | 500 | Database operation failures |
| `SYSTEM_ERROR` | 500 | Unexpected system errors |

## Error Severity Levels

| Severity | Description | Example |
|----------|-------------|---------|
| `LOW` | Minor issues, expected failures | Validation errors |
| `MEDIUM` | Operational issues, service degradation | External service timeout |
| `HIGH` | Significant failures affecting users | Database connection lost |
| `CRITICAL` | System-wide failures | Complete service outage |

## Best Practices

1. **Use Typed Errors**: Always use specific error classes instead of generic `Error`
2. **Include Context**: Add relevant context (user ID, trace ID, operation details)
3. **Set Appropriate Severity**: Match severity to business impact
4. **Provide Recovery Strategies**: Help users/clients understand how to recover
5. **Never Expose Secrets**: Don't include passwords, API keys, or PII in error messages
6. **Log Enough Detail**: Include context for debugging in logs, not in responses
7. **Use Async Error Boundaries**: Wrap async operations that need standardized error handling

## Logging and Monitoring

Errors are automatically logged with correlation IDs. Configure log levels:

```typescript
// For production
process.env.NODE_ENV = 'production'; // Hides stack traces

// For development
process.env.NODE_ENV = 'development'; // Includes stack traces
```

Enable metrics collection:

```typescript
process.env.METRICS_ENABLED = 'true';
```

## Migration Guide

### From Generic Error

```typescript
// Before
throw new Error('User not found');

// After
throw new ResourceNotFoundException('User', userId);
```

### From NestJS HttpException

```typescript
// Before
throw new HttpException('Invalid input', HttpStatus.BAD_REQUEST);

// After
throw new ValidationException('Invalid input', validationErrors);
```

### From Custom Error Classes

```typescript
// Before
class MyCustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MyCustomError';
  }
}

// After - extend AppException
class MyCustomError extends AppException {
  constructor(message: string) {
    super(
      ErrorType.BUSINESS_LOGIC,
      'MY_CUSTOM_ERROR',
      message,
      HttpStatus.BAD_REQUEST,
    );
  }
}
```

## See Also

- [ARCHITECTURE_BASELINE.md](./ARCHITECTURE_BASELINE.md) - Module boundaries and dependencies
- [common/error-handling.patterns.ts](../libs/shared-dtos/src/common/error-handling.patterns.ts) - Base error handling implementation
- [errors/enhanced-error-types.ts](../libs/shared-dtos/src/errors/enhanced-error-types.ts) - Enhanced error types
