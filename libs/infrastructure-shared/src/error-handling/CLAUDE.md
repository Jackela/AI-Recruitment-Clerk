# Infrastructure Shared - Error Handling

This directory contains centralized error handling utilities for the AI Recruitment Clerk application.

## Overview

The error handling utilities provide:
- **asyncErrorBoundary**: Wrapper for async functions with standardized error handling
- **errorBoundary**: Wrapper for sync functions with standardized error handling
- **Standardized error classes**: AppError, ValidationError, NotFoundError, etc.
- **Error response format**: Consistent error response structure
- **Error correlation**: Request ID tracking for debugging

## Usage

### Basic Error Handling with asyncErrorBoundary

```typescript
import { asyncErrorBoundary } from '@ai-recruitment-clerk/infrastructure-shared';

// Wrap an async function
const safeHandler = asyncErrorBoundary(async (userId: string) => {
  // Your logic here
  return await fetchUserData(userId);
}, {
  defaultErrorCode: 'FETCH_USER_FAILED',
  logErrors: true,
  requestId: 'req-123',
});

// Use the wrapped function
const result = await safeHandler('user-456');
if (!result.success) {
  // Handle error
  console.error(result.error.message);
}
```

### Using Custom Error Classes

```typescript
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  errorResponse,
} from '@ai-recruitment-clerk/infrastructure-shared';

async function updateUser(userId: string, data: unknown) {
  if (!userId) {
    throw new ValidationError('User ID is required', { field: 'userId' });
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found', { userId });
  }

  return user;
}
```

### Creating Error Responses

```typescript
import { errorResponse } from '@ai-recruitment-clerk/infrastructure-shared';

function handleError(error: unknown, requestId?: string) {
  return errorResponse(
    'OPERATION_FAILED',
    'Failed to process request',
    error instanceof Error ? { stack: error.stack } : undefined,
    requestId,
  );
}
```

### Checking if Error is Retryable

```typescript
import { isRetryableError, RetryUtility } from '@ai-recruitment-clerk/infrastructure-shared';

async function fetchDataWithRetry(url: string) {
  try {
    return await fetch(url);
  } catch (error) {
    if (isRetryableError(error)) {
      return await RetryUtility.withExponentialBackoff(
        () => fetch(url),
        { maxAttempts: 3 },
      );
    }
    throw error;
  }
}
```

### NestJS Controller Example

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { asyncErrorBoundary, ValidationError, successResponse } from '@ai-recruitment-clerk/infrastructure-shared';

@Controller('users')
export class UsersController {
  @Post()
  async createUser(@Body() body: unknown) {
    return asyncErrorBoundary(async () => {
      // Validate input
      if (!body.email) {
        throw new ValidationError('Email is required');
      }

      // Create user
      const user = await this.usersService.create(body);

      return successResponse(user, body.requestId);
    }, {
      defaultErrorCode: 'CREATE_USER_FAILED',
      logErrors: true,
    })();
  }
}
```

## Error Classes

| Class | Usage | Severity |
|-------|-------|----------|
| `AppError` | Base application error | Medium |
| `ValidationError` | Input validation failures | Low |
| `NotFoundError` | Resource not found | Low |
| `AuthenticationError` | Failed authentication | High |
| `AuthorizationError` | Insufficient permissions | High |
| `ConfigurationError` | Misconfiguration | Critical |
| `ExternalServiceError` | Third-party service failure | Medium |

## Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;          // Error code (e.g., 'VALIDATION_ERROR')
    message: string;       // Human-readable error message
    details?: unknown;     // Additional error details
    timestamp: string;     // ISO 8601 timestamp
    requestId?: string;    // Request correlation ID
    stack?: string;        // Stack trace (development only)
  };
}
```
