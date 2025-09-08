import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NatsPublishResult } from '@app/shared-nats-client';

/**
 * JD Extractor NATS Service
 *
 * Service-specific extension of the shared NATS client for JD Extractor microservice.
 * Provides specialized event publishing methods for job description extraction operations.
 *
 * @author AI Recruitment Team
 * @since 1.0.0
 */
@Injectable()
export class JdExtractorNatsService extends NatsClientService {
  private readonly logger = new Logger(JdExtractorNatsService.name);

  /**
   * Initialize the JD Extractor NATS service with service-specific configuration
   */
  async onModuleInit() {
    await this.initialize({
      serviceName: 'jd-extractor-svc',
      timeout: 10000,
      maxReconnectAttempts: 10,
      reconnectTimeWait: 2000,
    });
  }

  /**
   * Publish analysis.jd.extracted event when job description extraction is completed
   *
   * @param event JD extraction completion event data
   * @returns Promise<NatsPublishResult>
   */
  async publishAnalysisJdExtracted(event: {
    jobId: string;
    extractedData: unknown;
    processingTimeMs: number;
    confidence?: number;
    extractionMethod?: string;
  }): Promise<NatsPublishResult> {
    const subject = 'analysis.jd.extracted';

    try {
      this.logger.log(
        `📤 Publishing analysis.jd.extracted event for jobId: ${event.jobId}`,
      );

      const enrichedEvent = {
        ...event,
        eventType: 'AnalysisJdExtractedEvent',
        timestamp: new Date().toISOString(),
        version: '2.0',
        service: 'jd-extractor-svc',
        performance: {
          processingTimeMs: event.processingTimeMs,
          extractionMethod: event.extractionMethod || 'llm-structured',
        },
        quality: {
          confidence: event.confidence || 0.85,
          extractedFields: this.countExtractedFields(event.extractedData),
        },
      };

      const result = await this.publish(subject, enrichedEvent);

      if (result.success) {
        this.logger.log(
          `✅ Analysis JD extracted event published successfully - JobId: ${event.jobId}, MessageId: ${result.messageId}, Confidence: ${enrichedEvent.quality.confidence}`,
        );
      } else {
        this.logger.error(
          `❌ Failed to publish analysis JD extracted event - JobId: ${event.jobId}, Error: ${result.error}`,
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Error publishing analysis JD extracted event for jobId: ${event.jobId}`,
        error,
      );

      return {
        success: false,
        error: errorMessage,
        metadata: {
          subject,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Publish job.jd.failed event when job description extraction fails
   *
   * @param jobId Job identifier
   * @param error Error that occurred during processing
   * @param context Additional context for debugging
   * @returns Promise<NatsPublishResult>
   */
  async publishProcessingError(
    jobId: string,
    error: Error,
    context?: {
      stage?: string;
      inputSize?: number;
      retryAttempt?: number;
    },
  ): Promise<NatsPublishResult> {
    const subject = 'job.jd.failed';

    try {
      this.logger.log(
        `📤 Publishing processing error event for jobId: ${jobId}`,
      );

      const errorEvent = {
        jobId,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          type: error.constructor.name,
        },
        context: {
          service: 'jd-extractor-svc',
          stage: context?.stage || 'extraction',
          inputSize: context?.inputSize,
          retryAttempt: context?.retryAttempt || 1,
        },
        timestamp: new Date().toISOString(),
        eventType: 'JobJdFailedEvent',
        version: '2.0',
        severity: this.categorizeErrorSeverity(error),
      };

      const result = await this.publish(subject, errorEvent);

      if (result.success) {
        this.logger.log(
          `✅ Processing error event published successfully - JobId: ${jobId}, MessageId: ${result.messageId}, Severity: ${errorEvent.severity}`,
        );
      } else {
        this.logger.error(
          `❌ Failed to publish processing error event - JobId: ${jobId}, Error: ${result.error}`,
        );
      }

      return result;
    } catch (publishError) {
      const errorMessage =
        publishError instanceof Error ? publishError.message : 'Unknown error';
      this.logger.error(
        `❌ Error publishing processing error event for jobId: ${jobId}`,
        publishError,
      );

      return {
        success: false,
        error: errorMessage,
        metadata: {
          subject,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Publish job.jd.started event when extraction processing begins
   *
   * @param event Job start event data
   * @returns Promise<NatsPublishResult>
   */
  async publishExtractionStarted(event: {
    jobId: string;
    inputSize?: number;
    expectedProcessingTime?: number;
  }): Promise<NatsPublishResult> {
    const subject = 'job.jd.started';

    try {
      this.logger.log(
        `📤 Publishing extraction started event for jobId: ${event.jobId}`,
      );

      const startedEvent = {
        ...event,
        eventType: 'JobJdStartedEvent',
        timestamp: new Date().toISOString(),
        service: 'jd-extractor-svc',
        version: '2.0',
      };

      const result = await this.publish(subject, startedEvent);

      if (result.success) {
        this.logger.log(
          `✅ Extraction started event published - JobId: ${event.jobId}, MessageId: ${result.messageId}`,
        );
      } else {
        this.logger.error(
          `❌ Failed to publish extraction started event - JobId: ${event.jobId}, Error: ${result.error}`,
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Error publishing extraction started event for jobId: ${event.jobId}`,
        error,
      );

      return {
        success: false,
        error: errorMessage,
        metadata: {
          subject,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Subscribe to job submission events
   *
   * @param handler Message handler function
   * @returns Promise<void>
   */
  async subscribeToJobSubmissions(
    handler: (event: any) => Promise<void>,
  ): Promise<void> {
    await this.subscribe('job.submitted', handler, {
      durableName: 'jd-extractor-job-submissions',
      queueGroup: 'jd-extraction',
    });
  }

  /**
   * Count the number of extracted fields in the data
   *
   * @param data Extracted job description data
   * @returns Number of non-null/non-empty fields
   */
  private countExtractedFields(data: any): number {
    if (!data || typeof data !== 'object') {
      return 0;
    }

    let count = 0;
    for (const [key, value] of Object.entries(data)) {
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

  /**
   * Categorize error severity for monitoring and alerting
   *
   * @param error Error object
   * @returns Severity level
   */
  private categorizeErrorSeverity(
    error: Error,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Critical errors that require immediate attention
    if (
      message.includes('connection') ||
      message.includes('timeout') ||
      errorName.includes('connection') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'critical';
    }

    // High severity errors that affect functionality
    if (
      message.includes('parsing') ||
      message.includes('invalid') ||
      errorName.includes('validation') ||
      message.includes('malformed')
    ) {
      return 'high';
    }

    // Medium severity errors that may affect quality
    if (
      message.includes('extraction') ||
      message.includes('incomplete') ||
      message.includes('warning')
    ) {
      return 'medium';
    }

    // Default to low severity
    return 'low';
  }
}
