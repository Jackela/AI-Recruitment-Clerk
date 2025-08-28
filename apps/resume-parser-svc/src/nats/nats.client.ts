import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connect, NatsConnection, JetStreamClient, PubAck, StringCodec, JsMsg, RetentionPolicy, DiscardPolicy, DeliverPolicy, AckPolicy } from 'nats';

export interface NatsPublishResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NatsSubscriptionOptions {
  subject: string;
  queueGroup?: string;
  durableName?: string;
}

@Injectable()
export class NatsClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsClient.name);
  private connection: NatsConnection | null = null;
  private jetstream: JetStreamClient | null = null;
  private readonly codec = StringCodec();
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectTimeWait = 2000;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      this.logger.log('Connecting to NATS JetStream...');
      
      const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
      this.logger.log(`Connecting to NATS at: ${natsUrl}`);
      
      this.connection = await connect({
        servers: natsUrl,
        maxReconnectAttempts: this.maxReconnectAttempts,
        reconnectTimeWait: this.reconnectTimeWait,
        name: 'resume-parser-svc',
        timeout: 10000, // 10 seconds connection timeout
      });
      
      this.jetstream = this.connection.jetstream();
      
      // Setup connection event handlers
      this.setupConnectionHandlers();
      
      // Ensure JetStream streams exist
      await this.ensureStreamsExist();
      
      this.logger.log('Successfully connected to NATS JetStream');
    } catch (error) {
      this.logger.error('Failed to connect to NATS', error);
      throw error;
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.closed().then((err) => {
      if (err) {
        this.logger.error('NATS connection closed with error', err);
      } else {
        this.logger.log('NATS connection closed');
      }
    });

    // Handle reconnection events
    (async () => {
      for await (const status of this.connection!.status()) {
        this.logger.log(`NATS connection status: ${status.type}: ${status.data}`);
      }
    })().catch((err) => {
      this.logger.error('Error monitoring connection status', err);
    });
  }

  private async ensureStreamsExist(): Promise<void> {
    try {
      if (!this.jetstream) {
        throw new Error('JetStream client not initialized');
      }

      const jsm = await this.connection!.jetstreamManager();
      
      // Ensure the JOB_EVENTS stream exists
      try {
        await jsm.streams.info('JOB_EVENTS');
        this.logger.log('JOB_EVENTS stream already exists');
      } catch (error) {
        // Stream doesn't exist, create it
        await jsm.streams.add({
          name: 'JOB_EVENTS',
          subjects: ['job.*', 'analysis.*'],
          retention: RetentionPolicy.Limits,
          max_age: 7 * 24 * 60 * 60 * 1000 * 1000000, // 7 days in nanoseconds
          max_msgs: 10000,
          discard: DiscardPolicy.Old,
          duplicate_window: 2 * 60 * 1000 * 1000000, // 2 minutes for deduplication
        });
        this.logger.log('Created JOB_EVENTS stream');
      }
    } catch (error) {
      this.logger.error('Failed to ensure streams exist', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection && !this.connection.isClosed()) {
        this.logger.log('Disconnecting from NATS...');
        await this.connection.close();
        this.connection = null;
        this.jetstream = null;
        this.logger.log('Disconnected from NATS');
      }
    } catch (error) {
      this.logger.error('Error during NATS disconnect', error);
    }
  }

  async publish(subject: string, data: any): Promise<NatsPublishResult> {
    try {
      if (!this.jetstream) {
        await this.connect();
      }

      this.logger.log(`Publishing message to subject: ${subject}`);
      
      const payload = JSON.stringify(data);
      const publishAck: PubAck = await this.jetstream!.publish(
        subject, 
        this.codec.encode(payload),
        {
          msgID: this.generateMessageId(),
          timeout: 5000, // 5 seconds publish timeout
        }
      );

      const messageId = publishAck.seq.toString();
      this.logger.log(`Message published successfully. Subject: ${subject}, Sequence: ${messageId}`);
      
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to publish message to ${subject}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async subscribe(
    subject: string, 
    handler: (event: any) => Promise<void>,
    options?: NatsSubscriptionOptions
  ): Promise<void> {
    try {
      if (!this.jetstream) {
        await this.connect();
      }

      this.logger.log(`Subscribing to subject: ${subject}`);
      
      const jsm = await this.connection!.jetstreamManager();
      
      // Create consumer using JetStreamManager
      const consumerName = options?.durableName || `resume-parser-${subject.replace(/\./g, '-')}`;
      
      try {
        await jsm.consumers.add('JOB_EVENTS', {
          durable_name: consumerName,
          filter_subject: subject,
          deliver_policy: DeliverPolicy.New,
          ack_policy: AckPolicy.Explicit,
          max_deliver: 3,
          ack_wait: 30 * 1000 * 1000000, // 30 seconds in nanoseconds
        });
      } catch (error) {
        // Consumer might already exist, that's ok
        this.logger.log(`Consumer ${consumerName} might already exist: ${error}`);
      }
      
      const consumer = await this.jetstream!.consumers.get('JOB_EVENTS', consumerName);

      const subscription = await consumer.consume();

      // Process messages
      (async () => {
        for await (const msg of subscription) {
          try {
            const data = JSON.parse(this.codec.decode(msg.data));
            this.logger.log(`Received message on ${subject}:`, data);
            
            await handler(data);
            msg.ack();
            
            this.logger.log(`Message processed and acknowledged for subject: ${subject}`);
          } catch (error) {
            this.logger.error(`Error processing message on ${subject}:`, error);
            msg.nak(5000); // Negative acknowledge with 5 second delay
          }
        }
      })().catch((err) => {
        this.logger.error(`Error in subscription handler for ${subject}:`, err);
      });
      
      this.logger.log(`Successfully subscribed to ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${subject}`, error);
      throw error;
    }
  }

  async publishAnalysisResumeParsed(event: any): Promise<NatsPublishResult> {
    const subject = 'analysis.resume.parsed';
    
    try {
      this.logger.log(`Publishing analysis.resume.parsed event for resumeId: ${event.resumeId}`);
      
      const result = await this.publish(subject, {
        ...event,
        eventType: 'AnalysisResumeParsedEvent',
        timestamp: event.timestamp || new Date().toISOString(),
      });
      
      if (result.success) {
        this.logger.log(`Analysis resume parsed event published successfully for resumeId: ${event.resumeId}`);
      } else {
        this.logger.error(`Failed to publish analysis resume parsed event for resumeId: ${event.resumeId}`, result.error);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error publishing analysis resume parsed event for resumeId: ${event.resumeId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async publishJobResumeFailed(event: any): Promise<NatsPublishResult> {
    const subject = 'job.resume.failed';
    
    try {
      this.logger.log(`Publishing job.resume.failed event for resumeId: ${event.resumeId}`);
      
      const result = await this.publish(subject, {
        ...event,
        eventType: 'JobResumeFailedEvent',
        timestamp: event.timestamp || new Date().toISOString(),
      });
      
      if (result.success) {
        this.logger.log(`Job resume failed event published successfully for resumeId: ${event.resumeId}`);
      } else {
        this.logger.error(`Failed to publish job resume failed event for resumeId: ${event.resumeId}`, result.error);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error publishing job resume failed event for resumeId: ${event.resumeId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async publishProcessingError(jobId: string, resumeId: string, error: Error): Promise<NatsPublishResult> {
    const subject = 'resume.processing.error';
    
    try {
      this.logger.log(`Publishing processing error event for resumeId: ${resumeId}`);
      
      const errorEvent = {
        jobId,
        resumeId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        timestamp: new Date().toISOString(),
        service: 'resume-parser-svc',
        eventType: 'ResumeProcessingErrorEvent',
      };
      
      const result = await this.publish(subject, errorEvent);
      
      if (result.success) {
        this.logger.log(`Processing error event published successfully for resumeId: ${resumeId}`);
      } else {
        this.logger.error(`Failed to publish processing error event for resumeId: ${resumeId}`, result.error);
      }
      
      return result;
    } catch (publishError) {
      this.logger.error(`Error publishing processing error event for resumeId: ${resumeId}`, publishError);
      return {
        success: false,
        error: publishError instanceof Error ? publishError.message : 'Unknown error',
      };
    }
  }

  private generateMessageId(): string {
    return `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  get isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }
}