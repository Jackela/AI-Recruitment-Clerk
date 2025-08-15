import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connect, NatsConnection, JetStreamClient, PubAck, StringCodec, RetentionPolicy, DiscardPolicy } from 'nats';
import { JobJdSubmittedEvent, ResumeSubmittedEvent } from '../../../../libs/shared-dtos/src';

export interface NatsPublishResult {
  success: boolean;
  messageId?: string;
  error?: string;
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
    // 检查是否配置了NATS URL
    const natsUrl = process.env.NATS_URL;
    const natsOptional = process.env.NATS_OPTIONAL === 'true';
    
    if (!natsUrl && natsOptional) {
      this.logger.warn('NATS_URL未配置且NATS_OPTIONAL=true，跳过NATS连接');
      return;
    }
    
    try {
      await this.connect();
    } catch (error) {
      this.logger.warn('NATS JetStream is not available, application will continue without messaging capabilities');
      this.logger.debug(`NATS connection error: ${error.message}`);
      // Don't throw error, let the application continue
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      this.logger.log('Connecting to NATS JetStream...');
      
      const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
      this.logger.log(`Connecting to NATS at: ${natsUrl}`);
      
      this.connection = await connect({
        servers: natsUrl,
        maxReconnectAttempts: this.maxReconnectAttempts,
        reconnectTimeWait: this.reconnectTimeWait,
        name: 'app-gateway',
        timeout: 5000, // 5秒连接超时（减少等待时间）
        
        // 性能优化配置
        maxPingOut: 2,          // 最大未响应ping数（修正属性名）
        pingInterval: 30000,    // 30秒ping间隔
        reconnect: true,        // 启用自动重连
        
        // 连接池优化
        noRandomize: false,     // 启用服务器随机化以实现负载均衡
        
        // 调试和监控
        debug: process.env.NODE_ENV === 'development',
        verbose: process.env.NODE_ENV === 'development',
      });
      
      this.jetstream = this.connection.jetstream();
      
      // Setup connection event handlers
      this.setupConnectionHandlers();
      
      // Ensure JetStream streams exist
      await this.ensureStreamsExist();
      
      this.logger.log('Successfully connected to NATS JetStream');
    } catch (error) {
      this.logger.error('Failed to connect to NATS JetStream', error);
      // Don't throw error to prevent application crash
      this.connection = null;
      this.jetstream = null;
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

  async publish(subject: string, payload: unknown): Promise<NatsPublishResult> {
    try {
      if (!this.jetstream) {
        this.logger.warn(`NATS not available, skipping message publication to subject: ${subject}`);
        return {
          success: false,
          error: 'NATS connection not available'
        };
      }

      this.logger.log(`Publishing message to subject: ${subject}`);
      
      const data = JSON.stringify(payload);
      const publishAck: PubAck = await this.jetstream!.publish(
        subject, 
        this.codec.encode(data),
        {
          msgID: this.generateMessageId(),
          timeout: 3000,     // 3秒发布超时（减少等待时间）
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

  async publishJobJdSubmitted(event: JobJdSubmittedEvent): Promise<NatsPublishResult> {
    const subject = 'job.jd.submitted';
    
    try {
      this.logger.log(`Publishing job.jd.submitted event for jobId: ${event.jobId}`);
      
      const result = await this.publish(subject, {
        ...event,
        eventType: 'JobJdSubmittedEvent',
        timestamp: new Date().toISOString(),
      });
      
      if (result.success) {
        this.logger.log(`Job JD submitted event published successfully for jobId: ${event.jobId}`);
      } else {
        this.logger.error(`Failed to publish job JD submitted event for jobId: ${event.jobId}`, result.error);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error publishing job JD submitted event for jobId: ${event.jobId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async publishResumeSubmitted(event: ResumeSubmittedEvent): Promise<NatsPublishResult> {
    const subject = 'job.resume.submitted';
    
    try {
      this.logger.log(`Publishing job.resume.submitted event for resumeId: ${event.resumeId} on jobId: ${event.jobId}`);
      
      const result = await this.publish(subject, {
        ...event,
        eventType: 'ResumeSubmittedEvent',
        timestamp: new Date().toISOString(),
      });
      
      if (result.success) {
        this.logger.log(`Resume submitted event published successfully for resumeId: ${event.resumeId}`);
      } else {
        this.logger.error(`Failed to publish resume submitted event for resumeId: ${event.resumeId}`, result.error);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error publishing resume submitted event for resumeId: ${event.resumeId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async disconnect(): Promise<void> {
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

  private generateMessageId(): string {
    return `gateway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  get isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }
}