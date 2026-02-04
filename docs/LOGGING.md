# Logging Guide

This document describes the shared logger wrapper used across AI Recruitment Clerk services.

## Overview

The `Logger` class from `@ai-recruitment-clerk/infrastructure-shared` provides a consistent logging interface for all microservices. It wraps NestJS's built-in Logger with standardized formatting and context management.

## Import

```typescript
import { Logger, createLogger } from '@ai-recruitment-clerk/infrastructure-shared';
```

## Basic Usage

### Creating a Logger

```typescript
// For a service or component
const logger = new Logger('MyService');
// or
const logger = createLogger('MyService');
```

### Log Levels

```typescript
logger.error('Critical error occurred');
logger.warn('Warning: resource running low');
logger.log('Service started successfully');  // info level
logger.debug('Debugging variable value: x');
```

### Logging with Errors

```typescript
try {
  // some operation
} catch (error) {
  logger.error('Operation failed', error);
  // or with custom trace
  logger.error('Operation failed', 'Custom stack trace');
}
```

## Contextual Logging

### Adding Context to Logs

```typescript
logger.log('Processing resume', {
  operation: 'resume-parse',
  traceId: 'abc-123',
  requestId: 'req-456',
  userId: 'user-789',
});

// Output: Processing resume [resume-parse] trace:abc-123 req:req-456 user:user-789
```

### Creating Child Loggers with Context

```typescript
const baseLogger = createLogger('MyService');
const requestLogger = baseLogger.child({
  traceId: 'abc-123',
  requestId: 'req-456',
});

// All logs from requestLogger include traceId and requestId
requestLogger.log('Processing request');
```

### Setting Context for Subsequent Logs

```typescript
const logger = createLogger('MyService');
const contextLogger = logger.setContext({
  operation: 'batch-process',
  traceId: 'xyz-789',
});

contextLogger.log('Starting batch'); // Includes operation and traceId
```

## Log Context Structure

```typescript
interface LogContext {
  service?: string;    // Service or component name
  operation?: string;  // Operation being performed
  traceId?: string;    // Correlation/trace ID
  requestId?: string;  // Request ID
  userId?: string;     // User ID
  [key: string]: unknown; // Additional fields
}
```

## Best Practices

1. **Use appropriate log levels**:
   - `error`: Critical errors requiring attention
   - `warn`: Potentially harmful situations
   - `log`: Informational messages about normal operation
   - `debug`: Detailed debugging information

2. **Include context for traceability**:
   ```typescript
   logger.log('User logged in', { userId: user.id, traceId: req.id });
   ```

3. **Create service-specific loggers**:
   ```typescript
   export class MyService {
     private readonly logger = new Logger(MyService.name);
   }
   ```

4. **Use child loggers for requests**:
   ```typescript
   // In an interceptor or middleware
   const requestLogger = this.logger.child({
     traceId: req.headers['x-trace-id'],
     requestId: req.headers['x-request-id'],
   });
   ```

5. **Avoid logging sensitive data**:
   - Don't log passwords, tokens, or PII
   - Use log context to reference data by ID instead

## Logger Configuration

```typescript
const logger = createLogger('MyService', {
  service: 'my-service-name',  // Override context name
  timestamps: true,             // Include timestamps (default: true)
  colors: true,                 // Enable colored output (default: true)
});
```

## Default Logger

A pre-configured default logger is available for quick use:

```typescript
import { logger } from '@ai-recruitment-clerk/infrastructure-shared';

logger.log('Application started');
logger.error('Something went wrong');
```

## Log Format

Logs follow this standardized format:

```
[LOG_LEVEL] ServiceName: Message [operation] trace:xxx req:yyy user:zzz
```

Example:
```
[LOG] ResumeParser: Processing resume [parse-resume] trace:abc123 req:xyz789
```

## Migration from Console

Replace console calls with logger calls:

| Before | After |
|--------|-------|
| `console.log(msg)` | `logger.log(msg)` |
| `console.error(msg)` | `logger.error(msg)` |
| `console.warn(msg)` | `logger.warn(msg)` |
| `console.debug(msg)` | `logger.debug(msg)` |
