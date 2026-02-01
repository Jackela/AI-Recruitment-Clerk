import { Injectable, Logger } from '@nestjs/common';
import type { NatsPublishResult } from '@app/shared-nats-client';
import { NatsClientService } from '@app/shared-nats-client';
import { DeliverPolicy } from 'nats';

/**
 * Provides resume parser nats functionality.
 */
@Injectable()
export class ResumeParserNatsService extends NatsClientService {
  private readonly serviceLogger = new Logger(ResumeParserNatsService.name);

  /**
   * Publish analysis.resume.parsed event when resume processing is complete
   */
  async publishAnalysisResumeParsed(event: {
    jobId: string;
    resumeId: string;
    resumeDto: unknown;
    processingTimeMs: number;
    confidence?: number;
    parsingMethod?: string;
  }): Promise<NatsPublishResult> {
    const subject = 'analysis.resume.parsed';

    try {
      this.serviceLogger.log(
        `Publishing analysis.resume.parsed event for resumeId: ${event.resumeId}`,
      );

      const eventPayload = {
        jobId: event.jobId,
        resumeId: event.resumeId,
        resumeDto: event.resumeDto,
        processingTimeMs: event.processingTimeMs,
        confidence: event.confidence || 0.85, // Default confidence for resume parsing
        parsingMethod: event.parsingMethod || 'ai-vision-llm',
        eventType: 'AnalysisResumeParsedEvent',
        timestamp: new Date().toISOString(),
        service: 'resume-parser-svc',
      };

      const result = await this.publish(subject, eventPayload, {
        messageId: this.generateResumeMessageId(event.resumeId, 'parsed'),
        timeout: 5000,
        headers: {
          'source-service': 'resume-parser-svc',
          'event-type': 'AnalysisResumeParsedEvent',
          'resume-id': event.resumeId,
          'job-id': event.jobId,
        },
      });

      if (result.success) {
        this.serviceLogger.log(
          `Analysis resume parsed event published successfully for resumeId: ${event.resumeId}, messageId: ${result.messageId}`,
        );
      } else {
        this.serviceLogger.error(
          `Failed to publish analysis resume parsed event for resumeId: ${event.resumeId}`,
          result.error,
        );
      }

      return result;
    } catch (error) {
      this.serviceLogger.error(
        `Error publishing analysis resume parsed event for resumeId: ${event.resumeId}`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Publish job.resume.failed event when resume processing fails
   */
  async publishJobResumeFailed(event: {
    jobId: string;
    resumeId: string;
    error: Error;
    stage: string;
    retryAttempt?: number;
  }): Promise<NatsPublishResult> {
    const subject = 'job.resume.failed';

    try {
      this.serviceLogger.log(
        `Publishing job.resume.failed event for resumeId: ${event.resumeId}`,
      );

      const eventPayload = {
        jobId: event.jobId,
        resumeId: event.resumeId,
        error: {
          message: event.error.message,
          stack: event.error.stack,
          name: event.error.name,
        },
        stage: event.stage,
        retryAttempt: event.retryAttempt || 1,
        eventType: 'JobResumeFailedEvent',
        timestamp: new Date().toISOString(),
        service: 'resume-parser-svc',
      };

      const result = await this.publish(subject, eventPayload, {
        messageId: this.generateResumeMessageId(event.resumeId, 'failed'),
        timeout: 5000,
        headers: {
          'source-service': 'resume-parser-svc',
          'event-type': 'JobResumeFailedEvent',
          'resume-id': event.resumeId,
          'job-id': event.jobId,
          'error-stage': event.stage,
        },
      });

      if (result.success) {
        this.serviceLogger.log(
          `Job resume failed event published successfully for resumeId: ${event.resumeId}, messageId: ${result.messageId}`,
        );
      } else {
        this.serviceLogger.error(
          `Failed to publish job resume failed event for resumeId: ${event.resumeId}`,
          result.error,
        );
      }

      return result;
    } catch (error) {
      this.serviceLogger.error(
        `Error publishing job resume failed event for resumeId: ${event.resumeId}`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Publish resume.processing.error event for general processing errors
   */
  async publishProcessingError(
    jobId: string,
    resumeId: string,
    error: Error,
    context?: {
      stage?: string;
      retryAttempt?: number;
      inputSize?: number;
      processingTimeMs?: number;
    },
  ): Promise<NatsPublishResult> {
    const subject = 'resume.processing.error';

    try {
      this.serviceLogger.log(
        `Publishing processing error event for resumeId: ${resumeId}`,
      );

      const eventPayload = {
        jobId,
        resumeId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        stage: context?.stage || 'unknown',
        retryAttempt: context?.retryAttempt || 1,
        inputSize: context?.inputSize,
        processingTimeMs: context?.processingTimeMs,
        timestamp: new Date().toISOString(),
        service: 'resume-parser-svc',
        eventType: 'ResumeProcessingErrorEvent',
      };

      const result = await this.publish(subject, eventPayload, {
        messageId: this.generateResumeMessageId(resumeId, 'error'),
        timeout: 5000,
        headers: {
          'source-service': 'resume-parser-svc',
          'event-type': 'ResumeProcessingErrorEvent',
          'resume-id': resumeId,
          'job-id': jobId,
          'error-stage': context?.stage || 'unknown',
        },
      });

      if (result.success) {
        this.serviceLogger.log(
          `Processing error event published successfully for resumeId: ${resumeId}, messageId: ${result.messageId}`,
        );
      } else {
        this.serviceLogger.error(
          `Failed to publish processing error event for resumeId: ${resumeId}`,
          result.error,
        );
      }

      return result;
    } catch (publishError) {
      this.serviceLogger.error(
        `Error publishing processing error event for resumeId: ${resumeId}`,
        publishError,
      );
      return {
        success: false,
        error:
          publishError instanceof Error
            ? publishError.message
            : 'Unknown error',
      };
    }
  }

  /**
   * Subscribe to job.resume.submitted events
   */
  async subscribeToResumeSubmissions(
    handler: (event: any) => Promise<void>,
  ): Promise<void> {
    const subject = 'job.resume.submitted';
    const durableName = 'resume-parser-job-resume-submitted';

    try {
      this.serviceLogger.log(
        `Setting up subscription to ${subject} with durable name: ${durableName}`,
      );

      await this.subscribe(subject, handler, {
        durableName,
        queueGroup: 'resume-parser-group',
        maxDeliver: 3,
        ackWait: 30000, // 30 seconds
        deliverPolicy: DeliverPolicy.New,
      });

      this.serviceLogger.log(`Successfully subscribed to ${subject}`);
    } catch (error) {
      this.serviceLogger.error(`Failed to subscribe to ${subject}`, error);
      throw error;
    }
  }

  /**
   * Generate resume-specific message ID
   */
  private generateResumeMessageId(resumeId: string, eventType: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `resume-${eventType}-${resumeId}-${timestamp}-${random}`;
  }

  /**
   * Get service-specific health information
   */
  async getServiceHealthStatus(): Promise<{
    connected: boolean;
    service: string;
    lastActivity: Date;
    subscriptions: string[];
    messagesSent: number;
    messagesReceived: number;
  }> {
    const baseHealth = await this.getHealthStatus();

    return {
      connected: baseHealth.connected,
      service: 'resume-parser-svc',
      lastActivity:
        (baseHealth as any).lastActivity ||
        (baseHealth as any).lastOperationTime ||
        new Date(),
      subscriptions: ['job.resume.submitted'],
      messagesSent: (baseHealth as any).messagesSent ?? 0,
      messagesReceived: (baseHealth as any).messagesReceived ?? 0,
    };
  }
}
