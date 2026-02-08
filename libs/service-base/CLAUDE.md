# Service Base Library

## Overview

The `@ai-recruitment-clerk/service-base` library provides `BaseMicroserviceService`, an abstract base class that extends `NatsClientService` with common patterns used across all microservices.

## Purpose

This base class eliminates duplicated NATS communication code by providing:
- Service-specific logging with consistent naming
- Standardized event publishing with error handling
- Common message ID generation patterns
- Consistent health status reporting
- Error event publishing with severity categorization

## Usage

### Extending BaseMicroserviceService

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseMicroserviceService } from '@ai-recruitment-clerk/service-base';
import { NatsConnectionManager, NatsStreamManager } from '@ai-recruitment-clerk/shared-nats-client';

@Injectable()
export class MyServiceNatsService extends BaseMicroserviceService {
  constructor(
    configService: ConfigService,
    connectionManager: NatsConnectionManager,
    streamManager: NatsStreamManager,
  ) {
    // Pass the service name as the fourth argument
    super(configService, connectionManager, streamManager, 'my-service-name');
  }

  // Add domain-specific event publishing methods
  async publishMyDomainEvent(data: MyEventData): Promise<NatsPublishResult> {
    return this.publishEvent('domain.event.subject', data, {
      headers: { 'event-type': 'MyDomainEvent' },
    });
  }
}
```

### Protected Methods

#### `publishEvent(subject, payload, options)`

Publish an event with standard metadata. Automatically adds:
- `eventType` (derived from subject if not provided)
- `timestamp` (current time if not provided)
- `service` (microservice name)
- Standard headers

```typescript
await this.publishEvent('my.subject', { myData: 'value' }, {
  messageId: 'custom-id',  // Optional
  timeout: 10000,           // Optional, defaults to 5000ms
  headers: {                // Optional additional headers
    'custom-header': 'value',
  },
});
```

#### `publishErrorEvent(subject, entityId, error, context)`

Publish a standardized error event with severity categorization.

```typescript
await this.publishErrorEvent(
  'job.processing.failed',
  entityId,
  error,
  {
    stage: 'parsing',
    retryAttempt: 2,
    processingTimeMs: 1500,
  },
);
```

#### `subscribeToEvents(subject, handler, options)`

Subscribe to events with standardized error handling.

```typescript
await this.subscribeToEvents(
  'events.source',
  async (event) => {
    // Handle event
  },
  {
    durableName: 'my-consumer',
    queueGroup: 'my-queue',
    maxDeliver: 3,
    ackWaitMs: 30000,
  },
);
```

#### `generateMessageId(subject, type)`

Generate a service-specific message ID.

```typescript
const messageId = this.generateMessageId('job.submitted', 'event');
// Returns: 'my-service-name-submitted-event-1234567890-abc123def'
```

#### `getServiceHealthStatus()`

Get service-specific health status. Override to add custom health information.

```typescript
const health = await this.getServiceHealthStatus();
// Returns: { connected, service, lastActivity, subscriptions, messagesSent, messagesReceived }
```

### Protected Properties

- `serviceLogger: Logger` - Service-specific logger instance
- `microserviceName: string` - The service name passed to constructor

### Inherited from NatsClientService

The base class also inherits all methods from `NatsClientService`:
- `publish(subject, payload, options)`
- `subscribe(subject, handler, options)`
- `getHealthStatus()`
- `isConnected` property

## Error Severity Categorization

The `categorizeErrorSeverity()` method automatically categorizes errors:
- **critical**: Connection, timeout, unauthorized, forbidden errors
- **high**: Parsing, validation, malformed errors
- **medium**: Extraction, incomplete, warning errors
- **low**: All other errors

## Migration from NatsClientService

When migrating from `NatsClientService` to `BaseMicroserviceService`:

1. Change `extends NatsClientService` to `extends BaseMicroserviceService`
2. Add `serviceName` parameter to `super()` call
3. Replace direct `publish()` calls with `publishEvent()` for standard events
4. Replace error publishing with `publishErrorEvent()`
5. Use `serviceLogger` instead of creating a new Logger instance
6. Remove duplicated try-catch patterns (handled by base class)
