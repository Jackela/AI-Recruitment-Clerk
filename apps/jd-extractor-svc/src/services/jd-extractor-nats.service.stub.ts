import { Injectable, Logger } from '@nestjs/common';

interface NatsPublishResult {
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: {
    subject?: string;
    timestamp?: Date;
  };
}

/**
 * Provides jd extractor nats functionality.
 */
@Injectable()
export class JdExtractorNatsService {
  private readonly logger = new Logger('JdExtractorNatsServiceStub');

  /**
   * Performs the on module init operation.
   * @returns The result of the operation.
   */
  async onModuleInit() {
    // no-op in tests
  }

  /**
   * Performs the publish analysis jd extracted operation.
   * @param event - The event.
   * @returns A promise that resolves to NatsPublishResult.
   */
  async publishAnalysisJdExtracted(event: {
    jobId: string;
    extractedData: unknown;
    processingTimeMs: number;
    confidence?: number;
    extractionMethod?: string;
  }): Promise<NatsPublishResult> {
    this.logger.debug(`Stub publish analysis.jd.extracted for ${event.jobId}`);
    return {
      success: true,
      messageId: `test-${event.jobId}`,
      metadata: { subject: 'analysis.jd.extracted', timestamp: new Date() },
    };
  }

  /**
   * Performs the publish processing error operation.
   * @param jobId - The job id.
   * @param error - The error.
   * @param _context - The context.
   * @returns A promise that resolves to NatsPublishResult.
   */
  async publishProcessingError(
    jobId: string,
    error: Error,
    _context?: { stage?: string; inputSize?: number; retryAttempt?: number },
  ): Promise<NatsPublishResult> {
    this.logger.debug(
      `Stub publish job.jd.failed for ${jobId}: ${error?.message}`,
    );
    return {
      success: true,
      messageId: `err-${jobId}`,
      metadata: { subject: 'job.jd.failed', timestamp: new Date() },
    };
  }

  /**
   * Performs the publish extraction started operation.
   * @param event - The event.
   * @returns A promise that resolves to NatsPublishResult.
   */
  async publishExtractionStarted(event: {
    jobId: string;
  }): Promise<NatsPublishResult> {
    this.logger.debug(`Stub publish job.jd.started for ${event.jobId}`);
    return {
      success: true,
      messageId: `started-${event.jobId}`,
      metadata: { subject: 'job.jd.started', timestamp: new Date() },
    };
  }

  /**
   * Performs the subscribe to job submissions operation.
   * @param _handler - The handler.
   * @returns A promise that resolves when the operation completes.
   */
  async subscribeToJobSubmissions(
    _handler: (event: any) => Promise<void>,
  ): Promise<void> {
    // no-op in unit tests
  }
}
