import { Injectable, Logger } from '@nestjs/common';

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
  private connection: any = null;

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
    options?: NatsSubscriptionOptions
  ): Promise<void> {
    try {
      this.logger.log(`Subscribing to subject: ${subject}`);
      
      if (!this.connected) {
        await this.connect();
      }
      
      // Mock subscription - in production would use actual NATS subscription
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
        error: error.message,
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
        error: error.message,
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