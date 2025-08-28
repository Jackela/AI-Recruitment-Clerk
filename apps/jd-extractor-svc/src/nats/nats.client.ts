import { Injectable, Logger } from '@nestjs/common';
import { JobJdSubmittedEvent, AnalysisJdExtractedEvent } from '../dto/events.dto';

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
export class NatsClient {
  private readonly logger = new Logger(NatsClient.name);
  private connected = false;
  private connection: any = null; // In production would use actual NATS connection

  async connect(): Promise<void> {
    try {
      this.logger.log('Connecting to NATS JetStream...');
      
      // Mock connection - in production would use actual NATS client
      // const nc = await connect({
      //   servers: process.env.NATS_URL || 'nats://localhost:4222'
      // });
      // this.connection = nc;
      
      this.connected = true;
      this.logger.log('Successfully connected to NATS JetStream');
    } catch (error) {
      this.logger.error('Failed to connect to NATS', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.logger.log('Disconnecting from NATS...');
      
      if (this.connection) {
        // await this.connection.close();
        this.connection = null;
      }
      
      this.connected = false;
      this.logger.log('Disconnected from NATS');
    } catch (error) {
      this.logger.error('Error during NATS disconnect', error);
      throw error;
    }
  }

  async publish(subject: string, data: any): Promise<NatsPublishResult> {
    try {
      this.logger.log(`Publishing message to subject: ${subject}`);
      
      if (!this.connected) {
        await this.connect();
      }
      
      // Mock publish - in production would use actual NATS publish
      // const publishAck = await this.connection.publish(subject, JSON.stringify(data));
      
      const messageId = this.generateMessageId();
      this.logger.log(`Message published successfully. MessageId: ${messageId}`);
      
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to publish message to ${subject}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async subscribe(
    subject: string, 
    handler: (event: any) => Promise<void>,
    options?: { durableName?: string; queueGroup?: string }
  ): Promise<void> {
    try {
      this.logger.log(`Subscribing to subject: ${subject}`);
      
      if (!this.connected) {
        await this.connect();
      }
      
      // Mock subscription - in production would use actual NATS subscription
      // const sub = this.connection.subscribe(subject, {
      //   queue: options?.queueGroup,
      //   durable_name: options?.durableName
      // });
      
      // (async () => {
      //   for await (const m of sub) {
      //     try {
      //       const data = JSON.parse(m.data);
      //       await handler(data);
      //       m.ack();
      //     } catch (error) {
      //       this.logger.error(`Error processing message from ${subject}`, error);
      //       m.nak();
      //     }
      //   }
      // })();
      
      this.logger.log(`Successfully subscribed to ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${subject}`, error);
      throw error;
    }
  }

  async publishAnalysisExtracted(event: AnalysisJdExtractedEvent): Promise<NatsPublishResult> {
    const subject = 'job.analysis.extracted';
    
    try {
      this.logger.log(`Publishing analysis extracted event for jobId: ${event.jobId}`);
      
      const result = await this.publish(subject, {
        ...event,
        eventType: 'AnalysisJdExtractedEvent',
        timestamp: new Date().toISOString(),
      });
      
      if (result.success) {
        this.logger.log(`Analysis extracted event published successfully for jobId: ${event.jobId}`);
      } else {
        this.logger.error(`Failed to publish analysis extracted event for jobId: ${event.jobId}`, result.error);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error publishing analysis extracted event for jobId: ${event.jobId}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async publishProcessingError(jobId: string, error: Error): Promise<NatsPublishResult> {
    const subject = 'job.analysis.error';
    
    try {
      this.logger.log(`Publishing processing error event for jobId: ${jobId}`);
      
      const errorEvent = {
        jobId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        timestamp: new Date().toISOString(),
        service: 'jd-extractor-svc',
      };
      
      const result = await this.publish(subject, errorEvent);
      
      if (result.success) {
        this.logger.log(`Processing error event published successfully for jobId: ${jobId}`);
      } else {
        this.logger.error(`Failed to publish processing error event for jobId: ${jobId}`, result.error);
      }
      
      return result;
    } catch (publishError) {
      this.logger.error(`Error publishing processing error event for jobId: ${jobId}`, publishError);
      return {
        success: false,
        error: publishError.message,
      };
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  get isConnected(): boolean {
    return this.connected;
  }
}