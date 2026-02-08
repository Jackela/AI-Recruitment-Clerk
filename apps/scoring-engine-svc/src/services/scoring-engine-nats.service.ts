import type { ConfigService } from '@nestjs/config';
import type { NatsConnectionManager } from '@ai-recruitment-clerk/shared-nats-client';
import type { NatsStreamManager } from '@ai-recruitment-clerk/shared-nats-client';
import type { NatsPublishResult } from '@ai-recruitment-clerk/shared-nats-client';
import { BaseMicroserviceService } from '@ai-recruitment-clerk/service-base';
import { Injectable } from '@nestjs/common';
import type { AnalysisJdExtractedEvent } from '@ai-recruitment-clerk/job-management-domain';
import type { AnalysisResumeParsedEvent } from '@ai-recruitment-clerk/resume-processing-domain';

/**
 * Scoring Engine NATS Service
 *
 * Service-specific extension of the base microservice service for Scoring Engine.
 * Provides specialized event publishing and subscription methods for scoring operations.
 *
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 2.0.0 - Refactored to extend BaseMicroserviceService
 */
@Injectable()
export class ScoringEngineNatsService extends BaseMicroserviceService {
  constructor(
    configService: ConfigService,
    connectionManager: NatsConnectionManager,
    streamManager: NatsStreamManager,
  ) {
    super(configService, connectionManager, streamManager, 'scoring-engine-svc');
  }

  /**
   * Publish analysis.scoring.completed event when scoring processing is complete
   */
  public async publishScoringCompleted(event: {
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
    const enhancedPayload = {
      ...event,
      performance: {
        totalProcessingTime: event.processingTimeMs,
        aiAnalysisTime: event.enhancedMetrics?.aiAnalysisTime || 0,
        efficiency:
          event.enhancedMetrics?.aiAnalysisTime &&
          event.processingTimeMs > 0
            ? Math.round(
                (event.enhancedMetrics.aiAnalysisTime /
                  event.processingTimeMs) *
                  100,
              )
            : 0,
        fallbackRate: event.enhancedMetrics?.fallbacksUsed || 0,
      },
      quality: {
        confidenceLevel:
          event.enhancedMetrics?.confidenceLevel || 'medium',
        componentsProcessed:
          event.enhancedMetrics?.componentsProcessed || [
            'skills',
            'experience',
            'education',
          ],
      },
    };

    return this.publishEvent('analysis.scoring.completed', enhancedPayload, {
      messageId: this.generateMessageId('scoring-completed', event.resumeId),
      headers: {
        'resume-id': event.resumeId,
        'job-id': event.jobId,
        score: event.matchScore.toString(),
      },
    });
  }

  /**
   * Publish analysis.scoring.failed event when scoring processing fails
   */
  public async publishScoringError(
    _jobId: string,
    resumeId: string,
    error: Error,
    context?: {
      stage?: string;
      retryAttempt?: number;
      processingTimeMs?: number;
      inputData?: Record<string, unknown>;
    },
  ): Promise<NatsPublishResult> {
    return this.publishErrorEvent('analysis.scoring.failed', resumeId, error, {
      ...context,
      inputData: context?.inputData,
    });
  }

  /**
   * Subscribe to analysis.jd.extracted events
   */
  public async subscribeToJdExtracted(
    handler: (event: AnalysisJdExtractedEvent) => Promise<void>,
  ): Promise<void> {
    return this.subscribeToEvents(
      'analysis.jd.extracted',
      handler,
      {
        durableName: 'scoring-engine-jd-extracted',
        queueGroup: 'scoring-engine-group',
      },
    );
  }

  /**
   * Subscribe to analysis.resume.parsed events
   */
  public async subscribeToResumeParsed(
    handler: (event: AnalysisResumeParsedEvent) => Promise<void>,
  ): Promise<void> {
    return this.subscribeToEvents(
      'analysis.resume.parsed',
      handler,
      {
        durableName: 'scoring-engine-resume-parsed',
        queueGroup: 'scoring-engine-group',
      },
    );
  }

  /**
   * Publish processing error event for general scoring errors
   */
  public async publishProcessingError(
    _jobId: string,
    resumeId: string,
    error: Error,
    context?: {
      stage?: string;
      retryAttempt?: number;
      processingTimeMs?: number;
    },
  ): Promise<NatsPublishResult> {
    return this.publishErrorEvent('scoring.processing.error', resumeId, error, context);
  }
}
