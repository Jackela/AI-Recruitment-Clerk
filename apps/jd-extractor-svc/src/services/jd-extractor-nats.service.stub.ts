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

@Injectable()
export class JdExtractorNatsService {
  private readonly logger = new Logger('JdExtractorNatsServiceStub');

  async onModuleInit() {
    // no-op in tests
  }

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

  async publishProcessingError(
    jobId: string,
    error: Error,
    _context?: { stage?: string; inputSize?: number; retryAttempt?: number },
  ): Promise<NatsPublishResult> {
    this.logger.debug(`Stub publish job.jd.failed for ${jobId}: ${error?.message}`);
    return {
      success: true,
      messageId: `err-${jobId}`,
      metadata: { subject: 'job.jd.failed', timestamp: new Date() },
    };
  }

  async publishExtractionStarted(event: { jobId: string }): Promise<NatsPublishResult> {
    this.logger.debug(`Stub publish job.jd.started for ${event.jobId}`);
    return {
      success: true,
      messageId: `started-${event.jobId}`,
      metadata: { subject: 'job.jd.started', timestamp: new Date() },
    };
  }

  async subscribeToJobSubmissions(
    _handler: (event: any) => Promise<void>,
  ): Promise<void> {
    // no-op in unit tests
  }
}

