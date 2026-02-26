import { Injectable, Logger } from '@nestjs/common';
import type { JobRepository } from '../../repositories/job.repository';
import type { AppGatewayNatsService } from '../../nats/app-gateway-nats.service';
import type { CacheService } from '../../cache/cache.service';
import type { WebSocketGateway } from '../../websocket/websocket.gateway';
import type { JobsSemanticCacheService } from './jobs-semantic-cache.service';

interface JdAnalysisCompletedEvent {
  jobId: string;
  extractedData: Record<string, unknown>;
  processingTimeMs: number;
  confidence: number;
  extractionMethod: string;
  eventType: 'AnalysisJdExtractedEvent';
  timestamp: string;
  version: string;
  service: string;
  performance: {
    processingTimeMs: number;
    extractionMethod: string;
  };
  quality: {
    confidence: number;
    extractedFields: number;
  };
}

interface JdAnalysisFailedEvent {
  jobId: string;
  error: {
    message: string;
    stack?: string;
    name: string;
    type: string;
  };
  context: {
    service: string;
    stage: string;
    inputSize?: number;
    retryAttempt: number;
  };
  timestamp: string;
  eventType: 'JobJdFailedEvent';
  version: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Service for handling NATS event subscriptions and processing for jobs.
 * Manages JD analysis completion and failure events.
 */
@Injectable()
export class JobsEventService {
  private readonly logger = new Logger(JobsEventService.name);

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly natsClient: AppGatewayNatsService,
    private readonly cacheService: CacheService,
    private readonly webSocketGateway: WebSocketGateway,
    private readonly semanticCacheService: JobsSemanticCacheService,
  ) {}

  /**
   * Initializes NATS event subscriptions for job processing workflow.
   */
  public async initializeSubscriptions(): Promise<void> {
    try {
      await this.subscribeToAnalysisCompleted();
      await this.subscribeToAnalysisFailed();

      this.logger.log(
        'Successfully initialized NATS event subscriptions for job workflow',
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize NATS event subscriptions:',
        error,
      );
      // Continue startup even if NATS subscriptions fail (graceful degradation)
    }
  }

  /**
   * Sets up subscription to analysis.jd.extracted events.
   */
  private async subscribeToAnalysisCompleted(): Promise<void> {
    this.logger.log(
      'Setting up subscription to analysis.jd.extracted events',
    );

    await this.natsClient.subscribeToAnalysisCompleted(
      this.handleJdAnalysisCompleted.bind(this),
    );

    this.logger.log(
      'Successfully subscribed to analysis.jd.extracted events',
    );
  }

  /**
   * Sets up subscription to job.jd.failed events.
   */
  private async subscribeToAnalysisFailed(): Promise<void> {
    this.logger.log('Setting up subscription to job.jd.failed events');

    await this.natsClient.subscribeToAnalysisFailed(
      this.handleJdAnalysisFailed.bind(this),
    );

    this.logger.log('Successfully subscribed to job.jd.failed events');
  }

  /**
   * Handles successful JD analysis completion events.
   * Updates job status to 'completed' and stores analysis results in MongoDB.
   */
  private async handleJdAnalysisCompleted(
    event: JdAnalysisCompletedEvent,
    _metadata?: unknown,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Processing analysis.jd.extracted event for jobId: ${event.jobId}, confidence: ${event.quality?.confidence ?? event.confidence}, fields: ${event.quality?.extractedFields}`,
      );

      // Validate event payload
      if (!event.jobId) {
        this.logger.error(
          'Invalid analysis.jd.extracted event: missing jobId',
        );
        return;
      }

      // Check if job exists
      const job = await this.jobRepository.findById(event.jobId);
      if (!job) {
        this.logger.warn(
          `Job ${event.jobId} not found for analysis completion - job may have been deleted`,
        );
        return;
      }

      // Extract keywords from the analysis data
      const extractedKeywords: string[] = this.extractKeywordsFromAnalysis(
        event.extractedData,
      );
      const confidence = event.quality?.confidence ?? event.confidence ?? 0.85;

      // Update job with analysis results and set status to completed
      await Promise.all([
        this.jobRepository.updateJdAnalysis(
          event.jobId,
          extractedKeywords,
          confidence,
        ),
        this.jobRepository.updateStatus(event.jobId, 'completed'),
      ]);

      await this.semanticCacheService.registerSemanticCacheEntry(
        job,
        extractedKeywords,
        confidence,
      );

      // Clear related caches
      await this.cacheService.del(
        this.cacheService.generateKey('jobs', 'list'),
      );

      // Emit WebSocket event for real-time job status update
      await this.emitJobUpdatedEvent({
        jobId: event.jobId,
        title: job.title,
        status: 'completed',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        organizationId: (job as any).organizationId,
        metadata: {
          confidence,
          extractedKeywords,
          processingTime:
            event.performance?.processingTimeMs ?? event.processingTimeMs,
        },
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Successfully processed JD analysis completion for jobId: ${event.jobId} - Status: completed, Keywords: ${extractedKeywords.length}, Confidence: ${confidence}, Time: ${processingTime}ms`,
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Error processing JD analysis completion for jobId: ${event.jobId} (${processingTime}ms):`,
        error,
      );

      // On error processing the completion event, mark job as failed
      await this.markJobAsFailed(event.jobId);
    }
  }

  /**
   * Handles JD analysis failure events.
   * Updates job status to 'failed' in MongoDB.
   */
  private async handleJdAnalysisFailed(
    event: JdAnalysisFailedEvent,
    _metadata?: unknown,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Processing job.jd.failed event for jobId: ${event.jobId}, severity: ${event.severity}, stage: ${event.context.stage}`,
      );

      // Validate event payload
      if (!event.jobId) {
        this.logger.error('Invalid job.jd.failed event: missing jobId');
        return;
      }

      // Check if job exists
      const job = await this.jobRepository.findById(event.jobId);
      if (!job) {
        this.logger.warn(
          `Job ${event.jobId} not found for failure handling - job may have been deleted`,
        );
        return;
      }

      // Update job status to failed
      await this.jobRepository.updateStatus(event.jobId, 'failed');

      // Clear related caches
      await this.cacheService.del(
        this.cacheService.generateKey('jobs', 'list'),
      );

      // Emit WebSocket event for real-time job status update
      await this.emitJobUpdatedEvent({
        jobId: event.jobId,
        title: job.title,
        status: 'failed',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        organizationId: (job as any).organizationId,
        metadata: {
          errorMessage: event.error.message,
        },
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Successfully processed JD analysis failure for jobId: ${event.jobId} - Status: failed, Error: ${event.error.message}, Severity: ${event.severity}, Time: ${processingTime}ms`,
      );

      // Log detailed error for high/critical severity issues
      if (event.severity === 'high' || event.severity === 'critical') {
        this.logger.error(
          `High severity JD analysis failure for jobId: ${event.jobId}:`,
          {
            error: event.error,
            context: event.context,
            severity: event.severity,
            retryAttempt: event.context.retryAttempt,
          },
        );
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Error processing JD analysis failure for jobId: ${event.jobId} (${processingTime}ms):`,
        error,
      );

      // Even if we can't process the failure event, we should still try to mark the job as failed
      await this.markJobAsFailed(event.jobId);
    }
  }

  /**
   * Marks a job as failed, handling errors gracefully.
   */
  private async markJobAsFailed(jobId: string): Promise<void> {
    try {
      await this.jobRepository.updateStatus(jobId, 'failed');
      this.logger.log(
        `Updated job ${jobId} status to 'failed'`,
      );
    } catch (updateError) {
      this.logger.error(
        `Failed to update job ${jobId} status to failed:`,
        updateError,
      );
    }
  }

  /**
   * Emits a job updated event via WebSocket.
   */
  public async emitJobUpdatedEvent(payload: {
    jobId: string;
    title: string;
    status: 'processing' | 'completed' | 'failed' | 'active' | 'draft' | 'closed';
    organizationId?: string;
    updatedBy?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      this.webSocketGateway.emitJobUpdated({
        jobId: payload.jobId,
        title: payload.title,
        status: payload.status,
        timestamp: new Date(),
        organizationId: payload.organizationId,
        updatedBy: payload.updatedBy,
        metadata: payload.metadata,
      });

      this.logger.log(
        `Emitted WebSocket job_updated event for job ${payload.jobId} (status: ${payload.status})`,
      );
    } catch (wsError) {
      this.logger.error(
        `Failed to emit WebSocket event for job ${payload.jobId}:`,
        wsError,
      );
    }
  }

  /**
   * Extracts keywords from the analysis data structure.
   */
  private extractKeywordsFromAnalysis(analysisData: Record<string, unknown>): string[] {
    try {
      if (!analysisData || typeof analysisData !== 'object') {
        return [];
      }

      const keywords: string[] = [];

      // Extract skills if available
      if (Array.isArray(analysisData.skills)) {
        keywords.push(
          ...analysisData.skills.filter(
            (skill: unknown) => typeof skill === 'string',
          ),
        );
      }

      // Extract requirements/keywords if available
      if (Array.isArray(analysisData.requirements)) {
        analysisData.requirements.forEach((req: unknown) => {
          if (req && typeof req === 'object' && 'skill' in req && typeof (req as Record<string, unknown>).skill === 'string') {
            keywords.push((req as Record<string, unknown>).skill as string);
          }
        });
      }

      // Extract other keyword fields if available
      if (Array.isArray(analysisData.keywords)) {
        keywords.push(
          ...analysisData.keywords.filter(
            (keyword: unknown) => typeof keyword === 'string',
          ),
        );
      }

      if (Array.isArray(analysisData.extractedKeywords)) {
        keywords.push(
          ...analysisData.extractedKeywords.filter(
            (keyword: unknown) => typeof keyword === 'string',
          ),
        );
      }

      // Deduplicate and clean keywords
      const uniqueKeywords = [...new Set(keywords)]
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0)
        .slice(0, 20); // Limit to top 20 keywords

      return uniqueKeywords;
    } catch (error) {
      this.logger.warn('Error extracting keywords from analysis data:', error);
      return [];
    }
  }
}
