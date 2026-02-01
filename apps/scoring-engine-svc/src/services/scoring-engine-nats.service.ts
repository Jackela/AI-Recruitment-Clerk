import { Injectable, Logger } from '@nestjs/common';
import type { NatsPublishResult } from '@app/shared-nats-client';
import { NatsClientService } from '@app/shared-nats-client';
import type { AnalysisJdExtractedEvent } from '@ai-recruitment-clerk/job-management-domain';
import type { AnalysisResumeParsedEvent } from '@ai-recruitment-clerk/resume-processing-domain';
import { DeliverPolicy } from 'nats';

/**
 * Provides scoring engine nats functionality.
 */
@Injectable()
export class ScoringEngineNatsService extends NatsClientService {
  private readonly serviceLogger = new Logger(ScoringEngineNatsService.name);

  /**
   * Publish analysis.scoring.completed event when scoring processing is complete
   */
  async publishScoringCompleted(event: {
    jobId: string;
    resumeId: string;
    matchScore: number;
    processingTimeMs: number;
    enhancedMetrics?: {
      aiAnalysisTime?: number;
      confidenceLevel?: string;
      fallbacksUsed?: number;
      componentsProcessed?: string[];
    };
  }): Promise<NatsPublishResult> {
    const subject = 'analysis.scoring.completed';

    try {
      this.serviceLogger.log(
        `Publishing enhanced scoring completed event for resumeId: ${event.resumeId}`,
      );

      const enhancedEvent = {
        jobId: event.jobId,
        resumeId: event.resumeId,
        matchScore: event.matchScore,
        processingTimeMs: event.processingTimeMs,
        eventType: 'AnalysisScoringCompletedEvent',
        timestamp: new Date().toISOString(),
        version: '2.0', // Enhanced version
        service: 'scoring-engine-svc',
        performance: {
          totalProcessingTime: event.processingTimeMs,
          aiAnalysisTime: event.enhancedMetrics?.aiAnalysisTime || 0,
          efficiency: event.enhancedMetrics?.aiAnalysisTime
            ? Math.round(
                (event.enhancedMetrics.aiAnalysisTime /
                  event.processingTimeMs) *
                  100,
              )
            : 0,
          fallbackRate: event.enhancedMetrics?.fallbacksUsed || 0,
        },
        quality: {
          confidenceLevel: event.enhancedMetrics?.confidenceLevel || 'medium',
          componentsProcessed: event.enhancedMetrics?.componentsProcessed || [
            'skills',
            'experience',
            'education',
          ],
        },
      };

      const result = await this.publish(subject, enhancedEvent, {
        messageId: this.generateScoringMessageId(event.resumeId, 'completed'),
        timeout: 5000,
        headers: {
          'source-service': 'scoring-engine-svc',
          'event-type': 'AnalysisScoringCompletedEvent',
          'resume-id': event.resumeId,
          'job-id': event.jobId,
          score: event.matchScore.toString(),
        },
      });

      if (result.success) {
        this.serviceLogger.log(
          `Enhanced scoring completed event published successfully for resumeId: ${event.resumeId} with confidence: ${event.enhancedMetrics?.confidenceLevel || 'medium'}, messageId: ${result.messageId}`,
        );
      } else {
        this.serviceLogger.error(
          `Failed to publish enhanced scoring completed event for resumeId: ${event.resumeId}`,
          result.error,
        );
      }

      return result;
    } catch (error) {
      this.serviceLogger.error(
        `Error publishing enhanced scoring completed event for resumeId: ${event.resumeId}`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Publish analysis.scoring.failed event when scoring processing fails
   */
  async publishScoringError(
    jobId: string,
    resumeId: string,
    error: Error,
    context?: {
      stage?: string;
      retryAttempt?: number;
      processingTimeMs?: number;
      inputData?: Record<string, unknown>;
    },
  ): Promise<NatsPublishResult> {
    const subject = 'analysis.scoring.failed';

    try {
      this.serviceLogger.log(
        `Publishing scoring error event for resumeId: ${resumeId}`,
      );

      const errorEvent = {
        jobId,
        resumeId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        stage: context?.stage || 'unknown',
        retryAttempt: context?.retryAttempt || 1,
        processingTimeMs: context?.processingTimeMs,
        timestamp: new Date().toISOString(),
        service: 'scoring-engine-svc',
        eventType: 'AnalysisScoringFailedEvent',
      };

      const result = await this.publish(subject, errorEvent, {
        messageId: this.generateScoringMessageId(resumeId, 'failed'),
        timeout: 5000,
        headers: {
          'source-service': 'scoring-engine-svc',
          'event-type': 'AnalysisScoringFailedEvent',
          'resume-id': resumeId,
          'job-id': jobId,
          'error-stage': context?.stage || 'unknown',
        },
      });

      if (result.success) {
        this.serviceLogger.log(
          `Scoring error event published successfully for resumeId: ${resumeId}, messageId: ${result.messageId}`,
        );
      } else {
        this.serviceLogger.error(
          `Failed to publish scoring error event for resumeId: ${resumeId}`,
          result.error,
        );
      }

      return result;
    } catch (publishError) {
      this.serviceLogger.error(
        `Error publishing scoring error event for resumeId: ${resumeId}`,
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
   * Subscribe to analysis.jd.extracted events
   */
  async subscribeToJdExtracted(
    handler: (event: AnalysisJdExtractedEvent) => Promise<void>,
  ): Promise<void> {
    const subject = 'analysis.jd.extracted';
    const durableName = 'scoring-engine-jd-extracted';

    try {
      this.serviceLogger.log(
        `Setting up subscription to ${subject} with durable name: ${durableName}`,
      );

      await this.subscribe(subject, handler, {
        durableName,
        queueGroup: 'scoring-engine-group',
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
   * Subscribe to analysis.resume.parsed events
   */
  async subscribeToResumeParsed(
    handler: (event: AnalysisResumeParsedEvent) => Promise<void>,
  ): Promise<void> {
    const subject = 'analysis.resume.parsed';
    const durableName = 'scoring-engine-resume-parsed';

    try {
      this.serviceLogger.log(
        `Setting up subscription to ${subject} with durable name: ${durableName}`,
      );

      await this.subscribe(subject, handler, {
        durableName,
        queueGroup: 'scoring-engine-group',
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
   * Publish processing error event for general scoring errors
   */
  async publishProcessingError(
    jobId: string,
    resumeId: string,
    error: Error,
    context?: {
      stage?: string;
      retryAttempt?: number;
      processingTimeMs?: number;
    },
  ): Promise<NatsPublishResult> {
    const subject = 'scoring.processing.error';

    try {
      this.serviceLogger.log(
        `Publishing processing error event for resumeId: ${resumeId}`,
      );

      const errorEvent = {
        jobId,
        resumeId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        stage: context?.stage || 'unknown',
        retryAttempt: context?.retryAttempt || 1,
        processingTimeMs: context?.processingTimeMs,
        timestamp: new Date().toISOString(),
        service: 'scoring-engine-svc',
        eventType: 'ScoringProcessingErrorEvent',
      };

      const result = await this.publish(subject, errorEvent, {
        messageId: this.generateScoringMessageId(resumeId, 'error'),
        timeout: 5000,
        headers: {
          'source-service': 'scoring-engine-svc',
          'event-type': 'ScoringProcessingErrorEvent',
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
   * Generate scoring-specific message ID
   */
  private generateScoringMessageId(
    resumeId: string,
    eventType: string,
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `scoring-${eventType}-${resumeId}-${timestamp}-${random}`;
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
      service: 'scoring-engine-svc',
      lastActivity: baseHealth.lastOperationTime || new Date(),
      subscriptions: ['analysis.jd.extracted', 'analysis.resume.parsed'],
      messagesSent: (baseHealth as any).messagesSent ?? 0,
      messagesReceived: (baseHealth as any).messagesReceived ?? 0,
    };
  }
}
