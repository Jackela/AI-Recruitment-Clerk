import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ConfigService } from '@nestjs/config';
import type { NatsPublishResult } from '@ai-recruitment-clerk/shared-nats-client';
import { NatsClientService } from '@ai-recruitment-clerk/shared-nats-client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { NatsConnectionManager } from '@ai-recruitment-clerk/shared-nats-client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { NatsStreamManager } from '@ai-recruitment-clerk/shared-nats-client';

/**
 * Configuration for microservice initialization
 */
export interface MicroserviceConfig {
  /** Service name used for logging and NATS identification */
  serviceName: string;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Time to wait between reconnection attempts in milliseconds */
  reconnectTimeWait?: number;
}

/**
 * Options for publishing events with standard metadata
 */
export interface PublishEventOptions {
  /** Unique message identifier (auto-generated if not provided) */
  messageId?: string;
  /** Publish timeout in milliseconds */
  timeout?: number;
  /** Additional headers to include with the message */
  headers?: Record<string, string>;
}

/**
 * Health status information for the microservice
 */
export interface MicroserviceHealthStatus {
  /** Whether the service is connected to NATS */
  connected: boolean;
  /** Service name */
  service: string;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Active subscription subjects */
  subscriptions: string[];
  /** Total messages sent */
  messagesSent: number;
  /** Total messages received */
  messagesReceived: number;
}

/**
 * Base Microservice NATS Service
 *
 * Provides common functionality for all microservices that communicate via NATS:
 * - Service-specific logging with consistent naming
 * - Standardized event publishing with error handling
 * - Common message ID generation patterns
 * - Consistent health status reporting
 *
 * Extend this class in your microservice to add domain-specific events.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyServiceNatsService extends BaseMicroserviceService {
 *   constructor(
 *     configService: ConfigService,
 *     connectionManager: NatsConnectionManager,
 *     streamManager: NatsStreamManager,
 *   ) {
 *     super(configService, connectionManager, streamManager, 'my-service');
 *   }
 *
 *   async publishMyEvent(data: MyEventData): Promise<NatsPublishResult> {
 *     return this.publishEvent('my.event.subject', data, {
 *       headers: { 'event-type': 'MyEvent' },
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseMicroserviceService extends NatsClientService implements OnModuleInit {
  protected readonly serviceLogger: Logger;
  protected readonly microserviceName: string;

  /**
   * Creates a new base microservice instance
   *
   * @param configService - NestJS ConfigService for environment configuration
   * @param connectionManager - NATS connection manager
   * @param streamManager - NATS stream manager
   * @param serviceName - Unique name for this microservice
   */
  constructor(
    configService: ConfigService,
    connectionManager: NatsConnectionManager,
    streamManager: NatsStreamManager,
    serviceName: string,
  ) {
    super(configService, connectionManager, streamManager);
    this.microserviceName = serviceName;
    this.serviceLogger = new Logger(serviceName);
  }

  /**
   * Initialize the microservice with NATS connection
   * Override to provide custom initialization logic
   */
  public async onModuleInit(): Promise<void> {
    await this.initialize({
      serviceName: this.microserviceName,
      timeout: 10000,
      maxReconnectAttempts: 10,
      reconnectTimeWait: 2000,
    });
  }

  /**
   * Publish an event with standard metadata and error handling
   *
   * This method wraps the base publish() call with:
   * - Consistent event metadata (eventType, timestamp, service, version)
   * - Standardized logging
   * - Error handling that always returns NatsPublishResult
   *
   * @param subject - NATS subject to publish to
   * @param payload - Event data to publish
   * @param options - Optional publish settings
   * @returns Promise resolving to publish result
   */
  protected async publishEvent<T extends Record<string, unknown>>(
    subject: string,
    payload: T,
    options?: PublishEventOptions,
  ): Promise<NatsPublishResult> {
    try {
      this.serviceLogger.log(`📤 Publishing event to ${subject}`);

      // Enrich payload with standard metadata
      const enrichedPayload = {
        ...payload,
        eventType: payload.eventType || this.deriveEventType(subject),
        timestamp: payload.timestamp || new Date().toISOString(),
        service: this.microserviceName,
      };

      // Generate message ID if not provided
      const messageId =
        options?.messageId || this.generateMessageId(subject, 'event');

      const result = await this.publish(
        subject,
        enrichedPayload,
        {
          messageId,
          timeout: options?.timeout || 5000,
          headers: {
            'source-service': this.microserviceName,
            'event-type': enrichedPayload.eventType as string,
            ...options?.headers,
          },
        },
      );

      if (result.success) {
        this.serviceLogger.log(
          `✅ Event published successfully - Subject: ${subject}, MessageId: ${result.messageId}`,
        );
      } else {
        this.serviceLogger.error(
          `❌ Failed to publish event - Subject: ${subject}, Error: ${result.error}`,
        );
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.serviceLogger.error(
        `❌ Error publishing event to ${subject}`,
        error,
      );

      return {
        success: false,
        error: errorMessage,
        metadata: {
          subject,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Publish a processing error event with standardized format
   *
   * @param subject - Error subject (e.g., 'job.resume.failed')
   * @param entityId - ID of the entity that failed (jobId, resumeId, etc.)
   * @param error - The error that occurred
   * @param context - Additional error context
   * @returns Promise resolving to publish result
   */
  protected async publishErrorEvent(
    subject: string,
    entityId: string,
    error: Error,
    context?: {
      stage?: string;
      retryAttempt?: number;
      processingTimeMs?: number;
      [key: string]: unknown;
    },
  ): Promise<NatsPublishResult> {
    try {
      this.serviceLogger.log(
        `📤 Publishing error event to ${subject} for entity: ${entityId}`,
      );

      const errorPayload = {
        entityId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          type: error.constructor.name,
        },
        stage: context?.stage || 'unknown',
        retryAttempt: context?.retryAttempt || 1,
        processingTimeMs: context?.processingTimeMs,
        timestamp: new Date().toISOString(),
        service: this.microserviceName,
        eventType: this.deriveEventType(subject),
        severity: this.categorizeErrorSeverity(error),
        ...context,
      };

      return this.publishEvent(subject, errorPayload as Record<string, unknown>);
    } catch (publishError) {
      const errorMessage =
        publishError instanceof Error ? publishError.message : 'Unknown error';
      this.serviceLogger.error(
        `❌ Error publishing error event to ${subject}`,
        publishError,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Subscribe to events with standardized error handling
   *
   * @param subject - Subject to subscribe to
   * @param handler - Message handler function
   * @param durableName - Durable consumer name
   * @param queueGroup - Queue group name
   */
  protected async subscribeToEvents<T = unknown>(
    subject: string,
    handler: (event: T) => Promise<void>,
    options: {
      durableName: string;
      queueGroup: string;
      maxDeliver?: number;
      ackWaitMs?: number;
    },
  ): Promise<void> {
    try {
      this.serviceLogger.log(
        `📥 Setting up subscription to ${subject} with durable: ${options.durableName}`,
      );

      await this.subscribe(
        subject,
        handler,
        {
          durableName: options.durableName,
          queueGroup: options.queueGroup,
          maxDeliver: options.maxDeliver || 3,
          ackWait: options.ackWaitMs
            ? options.ackWaitMs * 1000000
            : 30 * 1000000,
        },
      );

      this.serviceLogger.log(`✅ Successfully subscribed to ${subject}`);
    } catch (error) {
      this.serviceLogger.error(`❌ Failed to subscribe to ${subject}`, error);
      throw error;
    }
  }

  /**
   * Generate a service-specific message ID
   *
   * @param subject - Subject being published to
   * @param type - Event type identifier
   * @returns Generated message ID
   */
  protected generateMessageId(subject: string, type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    const subjectShort = subject.split('.').pop() || 'event';
    return `${this.microserviceName}-${subjectShort}-${type}-${timestamp}-${random}`;
  }

  /**
   * Get service-specific health status
   *
   * Override this method to add service-specific health information
   *
   * @returns Promise resolving to health status
   */
  public async getServiceHealthStatus(): Promise<MicroserviceHealthStatus> {
    const baseHealth = await this.getHealthStatus();

    return {
    return {
      connected: baseHealth.connected,
      service: this.microserviceName,
      lastActivity: baseHealth.lastOperationTime || new Date(),
      subscriptions: [],
      messagesSent: (baseHealth as { messagesSent: number } | undefined).messagesSent ?? 0,
      messagesReceived: (baseHealth as { messagesReceived: number } | undefined).messagesReceived ?? 0,
    };
  }
  }

  /**
   * Derive event type from subject name
   *
   * @param subject - NATS subject
   * @returns Derived event type name
   */
  protected deriveEventType(subject: string): string {
    // Convert 'job.resume.submitted' to 'JobResumeSubmittedEvent'
    return subject
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Event';
  }

  /**
   * Categorize error severity for monitoring and alerting
   *
   * @param error - Error object to categorize
   * @returns Severity level
   */
  protected categorizeErrorSeverity(
    error: Error,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Critical errors that require immediate attention
    if (
      message.includes('connection') ||
      message.includes('timeout') ||
      errorName.includes('connection') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'critical';
    }

    // High severity errors that affect functionality
    if (
      message.includes('parsing') ||
      message.includes('invalid') ||
      errorName.includes('validation') ||
      message.includes('malformed')
    ) {
      return 'high';
    }

    // Medium severity errors that may affect quality
    if (
      message.includes('extraction') ||
      message.includes('incomplete') ||
      message.includes('warning')
    ) {
      return 'medium';
    }

    // Default to low severity
    return 'low';
  }
}
