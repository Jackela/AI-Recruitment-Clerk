import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliverPolicy, AckPolicy, PubAck, MsgHdrs, headers, ConsumerMessages } from 'nats';
import {
  NatsConnectionConfig,
  StreamConfig,
  ConsumerConfig,
  MessageHandler,
  SubscriptionOptions,
  MessageMetadata,
  NatsPublishResult,
  NatsHealthResult,
} from '../interfaces';
import { NatsConnectionManager } from './nats-connection-manager.service';
import { NatsStreamManager } from './nats-stream-manager.service';
import { DEFAULT_STREAMS } from '../config/stream-configs';

/**
 * Base NATS Client Service
 * Provides high-level API for NATS messaging operations
 */
@Injectable()
export class NatsClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsClientService.name);
  private readonly activeSubscriptions = new Map<string, ConsumerMessages>();
  private serviceName = 'nats-client';

  constructor(
    private readonly configService: ConfigService,
    private readonly connectionManager: NatsConnectionManager,
    private readonly streamManager: NatsStreamManager
  ) {}

  async onModuleInit() {
    await this.initialize();
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  /**
   * Initialize the NATS client with connection and streams
   */
  async initialize(
    customConfig?: Partial<NatsConnectionConfig>,
    customStreams?: StreamConfig[]
  ): Promise<void> {
    try {
      // Build connection configuration
      const config: NatsConnectionConfig = {
        url: this.configService.get<string>('NATS_URL') || 'nats://localhost:4222',
        serviceName: customConfig?.serviceName || this.serviceName,
        optional: this.configService.get<boolean>('NATS_OPTIONAL') || customConfig?.optional || false,
        timeout: customConfig?.timeout || 10000,
        maxReconnectAttempts: customConfig?.maxReconnectAttempts || 10,
        reconnectTimeWait: customConfig?.reconnectTimeWait || 2000,
        ...customConfig,
      };

      this.serviceName = config.serviceName;
      
      // Establish connection
      await this.connectionManager.connect(config);
      
      // If connection failed but is optional, skip stream setup
      if (!this.connectionManager.isConnected) {
        this.logger.warn('⚠️ NATS connection not available - skipping stream initialization');
        return;
      }

      // Setup streams
      const streamsToCreate = customStreams || DEFAULT_STREAMS;
      await this.streamManager.ensureStreamsExist(streamsToCreate);

      this.logger.log(`✅ NATS client '${this.serviceName}' initialized successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize NATS client '${this.serviceName}'`, error);
      throw error;
    }
  }

  /**
   * Shutdown the NATS client and clean up resources
   */
  async shutdown(): Promise<void> {
    try {
      // Close all active subscriptions
      for (const [subject, subscription] of this.activeSubscriptions) {
        try {
          if (subscription && typeof subscription.unsubscribe === 'function') {
            await subscription.unsubscribe();
          }
        } catch (error) {
          this.logger.warn(`Warning during subscription cleanup for ${subject}:`, error);
        }
      }
      
      this.activeSubscriptions.clear();
      
      // Disconnect from NATS
      await this.connectionManager.disconnect();
      
      this.logger.log(`✅ NATS client '${this.serviceName}' shutdown completed`);
    } catch (error) {
      this.logger.error(`❌ Error during NATS client '${this.serviceName}' shutdown`, error);
    }
  }

  /**
   * Publish a message to a NATS subject
   */
  async publish(
    subject: string,
    payload: unknown,
    options?: {
      messageId?: string;
      timeout?: number;
      headers?: Record<string, string>;
    }
  ): Promise<NatsPublishResult> {
    const startTime = Date.now();

    try {
      const jetstream = this.connectionManager.getJetStream();
      if (!jetstream) {
        const error = 'JetStream not available - cannot publish message';
        this.logger.error(error);
        return {
          success: false,
          error,
        };
      }

      this.logger.log(`📤 Publishing message to subject: ${subject}`);
      
      const codec = this.connectionManager.getCodec();
      const data = JSON.stringify(payload);
      const messageId = options?.messageId || 
        this.connectionManager.generateMessageId(this.serviceName);

      // Convert headers if provided
      let msgHeaders: MsgHdrs | undefined;
      if (options?.headers) {
        msgHeaders = headers();
        for (const [key, value] of Object.entries(options.headers)) {
          msgHeaders.set(key, value);
        }
      }

      const publishAck: PubAck = await jetstream.publish(
        subject,
        codec.encode(data),
        {
          msgID: messageId,
          timeout: options?.timeout || 5000,
          headers: msgHeaders,
        }
      );

      const sequence = publishAck.seq;
      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `✅ Message published successfully - Subject: ${subject}, Sequence: ${sequence}, Time: ${processingTimeMs}ms`
      );

      return {
        success: true,
        messageId,
        sequence,
        metadata: {
          subject,
          timestamp: new Date(),
          processingTimeMs,
        },
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error(`❌ Failed to publish message to ${subject} (${processingTimeMs}ms)`, error);
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          subject,
          timestamp: new Date(),
          processingTimeMs,
        },
      };
    }
  }

  /**
   * Subscribe to messages from a NATS subject
   */
  async subscribe<T = unknown>(
    subject: string,
    handler: MessageHandler<T>,
    options?: SubscriptionOptions
  ): Promise<void> {
    try {
      const jetstream = this.connectionManager.getJetStream();
      if (!jetstream) {
        throw new Error('JetStream not available - cannot create subscription');
      }

      this.logger.log(`📥 Setting up subscription to subject: ${subject}`);

      // Create consumer configuration
      const consumerConfig: ConsumerConfig = {
        durableName: options?.durableName || `${this.serviceName}-${subject.replace(/\./g, '-')}`,
        filterSubject: subject,
        deliverPolicy: options?.deliverPolicy || DeliverPolicy.New,
        ackPolicy: options?.ackPolicy || AckPolicy.Explicit,
        maxDeliver: options?.maxDeliver || 3,
        ackWait: options?.ackWait || 30 * 1000 * 1000000, // 30 seconds in nanoseconds
        queueGroup: options?.queueGroup,
      };

      // Ensure consumer exists
      await this.streamManager.ensureConsumerExists('JOB_EVENTS', consumerConfig);

      // Get consumer and start consuming
      const consumer = await jetstream.consumers.get('JOB_EVENTS', consumerConfig.durableName);
      const subscription = await consumer.consume();

      // Store subscription for cleanup
      this.activeSubscriptions.set(subject, subscription);

      // Process messages
      this.processMessages(subscription, subject, handler, options);

      this.logger.log(`✅ Successfully subscribed to ${subject} with consumer: ${consumerConfig.durableName}`);
    } catch (error) {
      this.logger.error(`❌ Failed to subscribe to ${subject}`, error);
      throw error;
    }
  }

  /**
   * Emit alias for publish (for compatibility)
   */
  async emit(subject: string, payload: unknown): Promise<NatsPublishResult> {
    return this.publish(subject, payload);
  }

  /**
   * Check if NATS is connected
   */
  get isConnected(): boolean {
    return this.connectionManager.isConnected;
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<NatsHealthResult> {
    return this.connectionManager.getHealthStatus();
  }

  /**
   * Get service name
   */
  getServiceName(): string {
    return this.serviceName;
  }

  /**
   * Process incoming messages from a subscription
   */
  private async processMessages<T>(
    subscription: ConsumerMessages,
    subject: string,
    handler: MessageHandler<T>,
    options?: SubscriptionOptions
  ): Promise<void> {
    const codec = this.connectionManager.getCodec();

    (async () => {
      for await (const msg of subscription) {
        const startTime = Date.now();
        
        try {
          // Decode message
          const data: T = JSON.parse(codec.decode(msg.data));
          
          // Create metadata
          const metadata: MessageMetadata = {
            subject: msg.subject,
            sequence: msg.seq,
            timestamp: new Date(msg.info.timestampNanos / 1000000),
            deliveryAttempt: msg.info.redelivered ? msg.info.redeliveryCount + 1 : 1,
            messageId: msg.headers?.get('Nats-Msg-Id') || undefined,
          };

          this.logger.log(
            `📨 Processing message on ${subject} - Seq: ${metadata.sequence}, Attempt: ${metadata.deliveryAttempt}`
          );

          // Handle message with timeout
          const handlerTimeout = options?.handlerTimeout || 30000;
          await Promise.race([
            handler(data, metadata),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Handler timeout')), handlerTimeout)
            ),
          ]);

          // Acknowledge successful processing
          msg.ack();
          
          const processingTime = Date.now() - startTime;
          this.logger.log(
            `✅ Message processed successfully on ${subject} - Seq: ${metadata.sequence}, Time: ${processingTime}ms`
          );

        } catch (error) {
          const processingTime = Date.now() - startTime;
          
          this.logger.error(
            `❌ Error processing message on ${subject} - Seq: ${msg.seq}, Time: ${processingTime}ms`,
            error
          );

          // Negative acknowledge with delay for retry
          const nakDelay = options?.retryDelay || 5000;
          msg.nak(nakDelay);
        }
      }
    })().catch((error) => {
      this.logger.error(`❌ Error in subscription handler for ${subject}:`, error);
      // Remove failed subscription from active subscriptions
      this.activeSubscriptions.delete(subject);
    });
  }
}