import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { NatsConnectionManager, NatsStreamManager } from '@ai-recruitment-clerk/shared-nats-client';
import type { NatsPublishResult } from '@ai-recruitment-clerk/shared-nats-client';
import { BaseMicroserviceService } from '@ai-recruitment-clerk/service-base';

/**
 * Event payload for resume parsing completion
 */
export interface AnalysisResumeParsedEvent {
  jobId: string;
  resumeId: string;
  resumeDto: unknown;
  processingTimeMs: number;
  confidence?: number;
  parsingMethod?: string;
}

/**
 * Event payload for job resume failure
 */
export interface JobResumeFailedEvent {
  jobId: string;
  resumeId: string;
  error: Error;
  stage: string;
  retryAttempt?: number;
}

/**
 * Provides resume parser NATS functionality.
 *
 * Extends BaseMicroserviceService to use common patterns for event publishing,
 * error handling, and subscription management.
 */
@Injectable()
export class ResumeParserNatsService extends BaseMicroserviceService {
  constructor(
    configService: ConfigService,
    connectionManager: NatsConnectionManager,
    streamManager: NatsStreamManager,
  ) {
    super(configService, connectionManager, streamManager, 'resume-parser-svc');
  }

  /**
   * Publish analysis.resume.parsed event when resume processing is complete
   */
  public async publishAnalysisResumeParsed(
    event: AnalysisResumeParsedEvent,
  ): Promise<NatsPublishResult> {
    const subject = 'analysis.resume.parsed';

    return this.publishEvent(
      subject,
      {
        ...event,
        confidence: event.confidence ?? 0.85,
        parsingMethod: event.parsingMethod ?? 'ai-vision-llm',
      },
      {
        messageId: this.generateResumeMessageId(event.resumeId, 'parsed'),
        headers: {
          'resume-id': event.resumeId,
          'job-id': event.jobId,
        },
      },
    );
  }

  /**
   * Publish job.resume.failed event when resume processing fails
   */
  public async publishJobResumeFailed(
    event: JobResumeFailedEvent,
  ): Promise<NatsPublishResult> {
    const subject = 'job.resume.failed';

    // Use publishErrorEvent for standardized error publishing
    return this.publishErrorEvent(
      subject,
      `${event.jobId}:${event.resumeId}`,
      event.error,
      {
        jobId: event.jobId,
        resumeId: event.resumeId,
        stage: event.stage,
        retryAttempt: event.retryAttempt,
      },
    );
  }

  /**
   * Publish resume.processing.error event for general processing errors
   */
  public async publishProcessingError(
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

    return this.publishErrorEvent(subject, `${jobId}:${resumeId}`, error, {
      jobId,
      resumeId,
      ...context,
    });
  }

  /**
   * Subscribe to job.resume.submitted events
   */
  public async subscribeToResumeSubmissions(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (event: any) => Promise<void>,
  ): Promise<void> {
    const subject = 'job.resume.submitted';

    return this.subscribeToEvents(subject, handler, {
      durableName: 'resume-parser-job-resume-submitted',
      queueGroup: 'resume-parser-group',
      maxDeliver: 3,
      ackWaitMs: 30000,
    });
  }

  /**
   * Generate resume-specific message ID
   * Uses the base class pattern but with resume-specific prefix
   */
  private generateResumeMessageId(resumeId: string, eventType: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `resume-${eventType}-${resumeId}-${timestamp}-${random}`;
  }

  /**
   * Get service-specific health information
   * Extends base health status with resume-parser subscriptions
   */
  public async getServiceHealthStatus(): Promise<{
    connected: boolean;
    service: string;
    lastActivity: Date;
    subscriptions: string[];
    messagesSent: number;
    messagesReceived: number;
  }> {
    const baseHealth = await super.getServiceHealthStatus();

    return {
      ...baseHealth,
      subscriptions: ['job.resume.submitted'],
    };
  }
}
