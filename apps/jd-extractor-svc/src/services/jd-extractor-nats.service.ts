import type { ConfigService } from '@nestjs/config';
import type { NatsConnectionManager } from '@ai-recruitment-clerk/shared-nats-client';
import type { NatsStreamManager } from '@ai-recruitment-clerk/shared-nats-client';
import type { NatsPublishResult } from '@ai-recruitment-clerk/shared-nats-client';
import { BaseMicroserviceService } from '@ai-recruitment-clerk/service-base';
import { Injectable } from '@nestjs/common';

/**
 * JD Extractor NATS Service
 *
 * Service-specific extension of the base microservice service for JD Extractor.
 * Provides specialized event publishing methods for job description extraction operations.
 *
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 2.0.0 - Refactored to extend BaseMicroserviceService
 */
@Injectable()
export class JdExtractorNatsService extends BaseMicroserviceService {
  /**
   * Initialize the JD Extractor NATS service with service-specific configuration
   */
  constructor(
    configService: ConfigService,
    connectionManager: NatsConnectionManager,
    streamManager: NatsStreamManager,
  ) {
    super(configService, connectionManager, streamManager, 'jd-extractor-svc');
  }

  /**
   * Publish analysis.jd.extracted event when job description extraction is completed
   *
   * @param event JD extraction completion event data
   * @returns Promise<NatsPublishResult>
   */
  public async publishAnalysisJdExtracted(event: {
    jobId: string;
    extractedData: unknown;
    processingTimeMs: number;
    confidence?: number;
    extractionMethod?: string;
  }): Promise<NatsPublishResult> {
    const enrichedPayload = {
      ...event,
      performance: {
        processingTimeMs: event.processingTimeMs,
        extractionMethod: event.extractionMethod || 'llm-structured',
      },
      quality: {
        confidence: event.confidence || 0.85,
        extractedFields: this.countExtractedFields(event.extractedData),
      },
    };

    return this.publishEvent('analysis.jd.extracted', enrichedPayload, {
      messageId: this.generateMessageId('jd-extracted', event.jobId),
      headers: {
        'job-id': event.jobId,
        'confidence': String(enrichedPayload.quality.confidence),
      },
    });
  }

  /**
   * Publish job.jd.failed event when job description extraction fails
   *
   * @param jobId Job identifier
   * @param error Error that occurred during processing
   * @param context Additional context for debugging
   * @returns Promise<NatsPublishResult>
   */
  public async publishProcessingError(
    jobId: string,
    error: Error,
    context?: {
      stage?: string;
      inputSize?: number;
      retryAttempt?: number;
    },
  ): Promise<NatsPublishResult> {
    return this.publishErrorEvent('job.jd.failed', jobId, error, {
      service: 'jd-extractor-svc',
      ...context,
    });
  }

  /**
   * Publish job.jd.started event when extraction processing begins
   *
   * @param event Job start event data
   * @returns Promise<NatsPublishResult>
   */
  public async publishExtractionStarted(event: {
    jobId: string;
    inputSize?: number;
    expectedProcessingTime?: number;
  }): Promise<NatsPublishResult> {
    return this.publishEvent('job.jd.started', event, {
      messageId: this.generateMessageId('jd-started', event.jobId),
      headers: {
        'job-id': event.jobId,
      },
    });
  }

  /**
   * Subscribe to job submission events
   *
   * @param handler Message handler function
   * @returns Promise<void>
   */
  public async subscribeToJobSubmissions(
    handler: (event: unknown) => Promise<void>,
  ): Promise<void> {
    return this.subscribeToEvents(
      'job.submitted',
      handler,
      {
        durableName: 'jd-extractor-job-submissions',
        queueGroup: 'jd-extraction',
      },
    );
  }

  /**
   * Count the number of extracted fields in the data
   *
   * @param data Extracted job description data
   * @returns Number of non-null/non-empty fields
   */
  private countExtractedFields(data: unknown): number {
    if (!data || typeof data !== 'object') {
      return 0;
    }

    let count = 0;
    for (const [_key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          count++;
        } else if (!Array.isArray(value)) {
          count++;
        }
      }
    }

    return count;
  }
}
