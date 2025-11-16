import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateJobDto } from './dto/create-job.dto';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import type { MulterFile } from './types/multer.types';
import { JobListDto, JobDetailDto } from './dto/job-response.dto';
import { ResumeListItemDto, ResumeDetailDto } from './dto/resume-response.dto';
import { AnalysisReportDto, ReportsListDto } from './dto/report-response.dto';
import { JobRepository } from '../repositories/job.repository';
import {
  UserDto,
  UserRole,
} from '@ai-recruitment-clerk/user-management-domain';
import { JobJdSubmittedEvent } from '@ai-recruitment-clerk/job-management-domain';
import type { ResumeSubmittedEvent } from '@ai-recruitment-clerk/resume-processing-domain';
import {
  AppGatewayNatsService,
  AnalysisJdExtractedEvent,
  AnalysisFailedEvent,
} from '../nats/app-gateway-nats.service';
import {
  CacheService,
  SemanticCacheOptions,
} from '../cache/cache.service';
import { Job, JobDocument } from '../schemas/job.schema';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { ConfigService } from '@nestjs/config';
import type { MessageMetadata } from '@ai-recruitment-clerk/shared-nats-client';

type JobUpdateStatus =
  | 'processing'
  | 'completed'
  | 'failed'
  | 'active'
  | 'draft'
  | 'closed';

interface SemanticJobCacheEntry {
  cacheKey: string;
  jobId: string;
  jobTitle: string;
  organizationId?: string;
  status: JobUpdateStatus;
  extractedKeywords: string[];
  jdExtractionConfidence: number;
  jdProcessedAt: string;
  source: 'semantic-cache';
  semanticSimilarity?: number;
  lastUsedAt?: string;
}

type UserWithRawRole = UserDto & { rawRole?: string };

type KeywordSource = {
  skills?: unknown[];
  requirements?: Array<{ skill?: string } | string | null | undefined>;
  keywords?: unknown[];
  extractedKeywords?: unknown[];
};


/**
 * Provides jobs functionality.
 */
@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);
  private readonly semanticCacheEnabled: boolean;
  private readonly semanticCacheThreshold: number;
  private readonly semanticCacheTtlMs: number;
  private readonly semanticCacheMaxResults: number;

  /**
   * Initializes a new instance of the Jobs Service.
   * @param jobRepository - The job repository for MongoDB persistence.
   * @param natsClient - The nats client.
   * @param cacheService - The cache service.
   * @param webSocketGateway - The WebSocket gateway for real-time updates.
   */
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly natsClient: AppGatewayNatsService,
    private readonly cacheService: CacheService,
    private readonly webSocketGateway: WebSocketGateway,
    private readonly configService: ConfigService,
  ) {
    this.semanticCacheEnabled =
      (this.configService.get<string>('SEMANTIC_CACHE_ENABLED') ?? 'true') !==
      'false';
    this.semanticCacheThreshold = this.normalizeThreshold(
      this.configService.get<string | number>(
        'SEMANTIC_CACHE_SIMILARITY_THRESHOLD',
      ),
    );
    this.semanticCacheTtlMs = this.normalizePositiveNumber(
      this.configService.get<string | number>('SEMANTIC_CACHE_TTL_MS'),
      1000 * 60 * 60 * 24,
    );
    this.semanticCacheMaxResults = Math.max(
      1,
      Math.floor(
        this.normalizePositiveNumber(
          this.configService.get<string | number>(
            'SEMANTIC_CACHE_MAX_RESULTS',
          ),
          5,
        ),
      ),
    );
  }

  /**
   * Initializes NATS event subscriptions for job processing workflow.
   */
  async onModuleInit() {
    try {
      // Subscribe to analysis.jd.extracted events (successful JD extraction)
      await this.subscribeToAnalysisCompleted();

      // Subscribe to job.jd.failed events (JD extraction failures)
      await this.subscribeToAnalysisFailed();

      this.logger.log(
        '✅ Successfully initialized NATS event subscriptions for job workflow',
      );
    } catch (error) {
      this.logger.error(
        '❌ Failed to initialize NATS event subscriptions:',
        error,
      );
      // Continue startup even if NATS subscriptions fail (graceful degradation)
    }
  }

  private hasAccessToResource(
    user: UserDto,
    resourceOrganizationId?: string,
  ): boolean {
    // Admins have access to all resources
    const normalizedRole = String(
      (user as UserWithRawRole)?.rawRole ?? user.role ?? '',
    ).toLowerCase();

    if (normalizedRole === UserRole.ADMIN) {
      return true;
    }

    // Other users can only access resources in their organization
    return user.organizationId === resourceOrganizationId;
  }


  /**
   * Creates job.
   * @param dto - The dto.
   * @param user - The user.
   * @returns A promise that resolves to { jobId: string }.
   */
  async createJob(
    dto: CreateJobDto,
    user: UserDto,
  ): Promise<{ jobId: string }> {
    const baseJobData: Partial<Job> = {
      title: dto.jobTitle,
      description: dto.jdText,
      status: 'processing',
      createdBy: user.id,
      company: user.organizationId || 'Unknown', // Use organizationId as company for now
      // Set organization context for multi-tenant access control
      organizationId: user.organizationId,
    };

    if (this.semanticCacheEnabled) {
      const reusedJobId = await this.tryCreateJobWithSemanticCache(
        dto,
        user,
        baseJobData,
      );
      if (reusedJobId) {
        return { jobId: reusedJobId };
      }
    }

    const jobId = await this.createJobWithProcessingPipeline(
      dto,
      user,
      baseJobData,
    );

    return { jobId };
  }

  private async tryCreateJobWithSemanticCache(
    dto: CreateJobDto,
    user: UserDto,
    baseJobData: Partial<Job>,
  ): Promise<string | null> {
    let cacheEntry: SemanticJobCacheEntry | null = null;
    try {
      cacheEntry =
        await this.cacheService.wrapSemantic<SemanticJobCacheEntry | null>(
          dto.jdText,
          async () => null,
          this.buildSemanticCacheOptions(),
        );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Semantic cache lookup failed for JD reuse (fallback to pipeline): ${message}`,
      );
      return null;
    }

    if (!cacheEntry || !this.canReuseSemanticEntry(cacheEntry, user)) {
      return null;
    }

    const jobData: Partial<Job> = {
      ...baseJobData,
      status: 'completed',
      extractedKeywords: cacheEntry.extractedKeywords ?? [],
      jdExtractionConfidence: cacheEntry.jdExtractionConfidence ?? 0.9,
      jdProcessedAt: new Date(),
    };

    try {
      const savedJob = await this.jobRepository.create(jobData);
      const actualJobId = this.getJobId(savedJob);

      this.logger.log(
        `♻️ Reused semantic analysis from job ${cacheEntry.jobId} for new job ${actualJobId} (similarity ${(cacheEntry.semanticSimilarity ?? 0).toFixed(3)})`,
      );

      await this.refreshSemanticCacheEntry(cacheEntry);

      await this.emitJobUpdateEvent({
        jobId: actualJobId,
        title: dto.jobTitle,
        status: 'completed',
        organizationId: user.organizationId,
        updatedBy: user.id,
        metadata: {
          semanticReuse: true,
          reusedFromJobId: cacheEntry.jobId,
          similarityScore: cacheEntry.semanticSimilarity,
        },
      });

      return actualJobId;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Semantic cache reuse failed (falling back to pipeline): ${message}`,
      );
      return null;
    }
  }

  private canReuseSemanticEntry(
    entry: SemanticJobCacheEntry,
    user: UserDto,
  ): boolean {
    if (!entry || entry.status !== 'completed') {
      return false;
    }

    if (
      !Array.isArray(entry.extractedKeywords) ||
      entry.extractedKeywords.length === 0
    ) {
      return false;
    }

    if (
      entry.organizationId &&
      user.organizationId &&
      entry.organizationId !== user.organizationId
    ) {
      this.logger.debug(
        `Semantic cache entry ${entry.jobId} belongs to organization ${entry.organizationId}, skipping reuse for ${user.organizationId}`,
      );
      return false;
    }

    return true;
  }

  private async refreshSemanticCacheEntry(
    entry: SemanticJobCacheEntry,
  ): Promise<void> {
    if (!entry.cacheKey) {
      return;
    }
    const payload = {
      ...entry,
      lastUsedAt: new Date().toISOString(),
    };
    try {
      await this.cacheService.set(entry.cacheKey, payload, {
        ttl: this.semanticCacheTtlMs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to refresh semantic cache entry ${entry.cacheKey}: ${message}`,
      );
    }
  }

  private async registerSemanticCacheEntry(
    job: JobDocument,
    extractedKeywords: string[],
    confidence: number,
  ): Promise<void> {
    if (
      !this.semanticCacheEnabled ||
      !job ||
      typeof job.description !== 'string'
    ) {
      return;
    }

    const jobId = this.getJobId(job);
    if (!jobId) {
      return;
    }

    const cacheKey = this.cacheService.generateKey('semantic', 'job', jobId);
    const payload: SemanticJobCacheEntry = {
      cacheKey,
      jobId,
      jobTitle: job.title,
      organizationId: job.organizationId,
      status: 'completed',
      extractedKeywords,
      jdExtractionConfidence: confidence,
      jdProcessedAt: new Date().toISOString(),
      source: 'semantic-cache',
    };

    try {
      await this.cacheService.wrapSemantic<SemanticJobCacheEntry>(
        job.description,
        async () => payload,
        this.buildSemanticCacheOptions({
          cacheKey,
          forceRefresh: true,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to register semantic cache entry for job ${jobId}: ${message}`,
      );
    }
  }

  private getJobId(job: JobDocument | null | undefined): string {
    if (!job) {
      return '';
    }
    const rawId = job._id ?? (job as unknown as { id?: string }).id;
    if (
      rawId &&
      typeof rawId === 'object' &&
      typeof rawId.toString === 'function'
    ) {
      return rawId.toString();
    }
    return typeof rawId === 'string' ? rawId : '';
  }

  private async createJobWithProcessingPipeline(
    dto: CreateJobDto,
    user: UserDto,
    jobData: Partial<Job>,
  ): Promise<string> {
    try {
      const savedJob = await this.jobRepository.create(jobData);
      const actualJobId = this.getJobId(savedJob);

      this.logger.log(
        `Created job ${actualJobId} for user ${user.id} in organization ${user.organizationId}`,
      );

      await this.emitJobUpdateEvent({
        jobId: actualJobId,
        title: dto.jobTitle,
        status: 'processing',
        organizationId: user.organizationId,
        updatedBy: user.id,
      });

      const jobJdSubmittedEvent: JobJdSubmittedEvent = {
        jobId: actualJobId,
        jobTitle: dto.jobTitle,
        jdText: dto.jdText,
        timestamp: new Date().toISOString(),
      };

      try {
        const result =
          await this.natsClient.publishJobJdSubmitted(jobJdSubmittedEvent);
        if (result.success) {
          this.logger.log(
            `Published job.jd.submitted event for ${actualJobId} by user ${user.id}. MessageId: ${result.messageId}`,
          );
        } else {
          this.logger.error(
            `Failed to publish job.jd.submitted event for ${actualJobId}: ${result.error}`,
          );
          await this.jobRepository.updateStatus(actualJobId, 'failed');
          throw new Error(`Failed to initiate job analysis: ${result.error}`);
        }
      } catch (natsError) {
        this.logger.error(
          `Error publishing job.jd.submitted event for ${actualJobId}:`,
          natsError,
        );
        await this.jobRepository.updateStatus(actualJobId, 'failed');
        throw new Error(`Failed to initiate job analysis: ${natsError}`);
      }

      return actualJobId;
    } catch (error) {
      this.logger.error('Error creating job:', error);
      throw error;
    }
  }

  private async emitJobUpdateEvent(payload: {
    jobId: string;
    title: string;
    status: JobUpdateStatus;
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
        `📡 Emitted WebSocket job_updated event for job ${payload.jobId} (status: ${payload.status})`,
      );
    } catch (wsError) {
      this.logger.error(
        `❌ Failed to emit WebSocket event for job ${payload.jobId}:`,
        wsError,
      );
    }
  }

  /**
   * Performs the upload resumes operation.
   * @param jobId - The job id.
   * @param files - The files.
   * @param user - The user.
   * @returns A promise that resolves to ResumeUploadResponseDto.
   */
  async uploadResumes(
    jobId: string,
    files: MulterFile[],
    user: UserDto,
  ): Promise<ResumeUploadResponseDto> {
    if (!files || files.length === 0) {
      return new ResumeUploadResponseDto(jobId, 0);
    }

    try {
      // Validate job exists and user has access
    const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }

      // Check if user has access to this job
    if (
      !this.hasAccessToResource(
        user,
        (job as JobDocument & { organizationId?: string }).organizationId,
      )
    ) {
        throw new ForbiddenException('Access denied to this job');
      }

      // Process each uploaded resume file
      const publishPromises = files.map(async (file) => {
        const resumeId = randomUUID();

        // Publish the NATS event for each resume
        const resumeSubmittedEvent: ResumeSubmittedEvent = {
          jobId,
          resumeId,
          originalFilename: file.originalname,
          tempGridFsUrl: `/temp/uploads/${resumeId}`, // Temporary URL for internal service access
        };

        try {
          const result =
            await this.natsClient.publishResumeSubmitted(resumeSubmittedEvent);
          if (result.success) {
            this.logger.log(
              `Published resume.submitted event for jobId: ${jobId}, resumeId: ${resumeId}, filename: ${file.originalname}. MessageId: ${result.messageId}`,
            );
            return true;
          } else {
            this.logger.error(
              `Failed to publish resume.submitted event for resumeId: ${resumeId}: ${result.error}`,
            );
            return false;
          }
        } catch (error) {
          this.logger.error(
            `Error publishing resume.submitted event for resumeId: ${resumeId}:`,
            error,
          );
          return false;
        }
      });

      // Wait for all resume processing to initiate
      const results = await Promise.all(publishPromises);
      const successCount = results.filter(Boolean).length;

      this.logger.log(
        `Initiated processing for ${successCount}/${files.length} resumes for job ${jobId}`,
      );

      return new ResumeUploadResponseDto(jobId, successCount);
    } catch (error) {
      this.logger.error(
        `Error processing resume uploads for job ${jobId}:`,
        error,
      );
      throw error;
    }
  }

  // GET methods for frontend
  /**
   * Retrieves all jobs.
   * @returns A promise that resolves to an array of JobListDto.
   */
  async getAllJobs(): Promise<JobListDto[]> {
    const cacheKey = this.cacheService.generateKey('jobs', 'list');

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        try {
      const jobDocuments = await this.jobRepository.findAll({ limit: 100 });
      return jobDocuments.map((job) => {
        const jobId = this.getJobId(job);
        return new JobListDto(
          jobId,
          job.title,
          job.status as JobUpdateStatus,
          job.createdAt,
          0, // Resume count will be handled by resume service
        );
      });
        } catch (error) {
          this.logger.error('Error retrieving all jobs:', error);
          throw error;
        }
      },
      { ttl: 120000 }, // 2分钟缓存(120000毫秒)，职位列表更新不频繁
    );
  }

  /**
   * Retrieves job by id.
   * @param jobId - The job id.
   * @returns A promise that resolves to JobDetailDto.
   */
  async getJobById(jobId: string): Promise<JobDetailDto> {
    try {
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }

      // Convert JobDocument to JobDetailDto
      const resolvedJobId = this.getJobId(job);
      return new JobDetailDto(
        resolvedJobId,
        job.title,
        job.description,
        job.status as JobUpdateStatus,
        job.createdAt,
        0, // Resume count will be handled by resume service
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error retrieving job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves resumes by job id.
   * NOTE: This method validates job existence. Resume data should be handled by ResumeService.
   * @param jobId - The job id.
   * @returns A promise that resolves to an array of ResumeListItemDto.
   */
  async getResumesByJobId(jobId: string): Promise<ResumeListItemDto[]> {
    try {
      // Validate job exists
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }

      // TODO: Delegate to ResumeService once implemented
      // For now, return empty array as resumes should be handled by resume service
      this.logger.warn(
        `Resume retrieval for job ${jobId} should be handled by ResumeService`,
      );
      return [];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error validating job ${jobId} for resume retrieval:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves resume by id.
   * NOTE: This method should be handled by ResumeService.
   * @param resumeId - The resume id.
   * @returns A promise that resolves to ResumeDetailDto.
   */
  async getResumeById(resumeId: string): Promise<ResumeDetailDto> {
    // TODO: Delegate to ResumeService once implemented
    this.logger.warn(
      `Resume retrieval for resumeId ${resumeId} should be handled by ResumeService`,
    );
    throw new NotFoundException(
      'Resume operations should be handled by ResumeService',
    );
  }

  /**
   * Retrieves reports by job id.
   * NOTE: This method validates job existence. Report data should be handled by ReportService.
   * @param jobId - The job id.
   * @returns A promise that resolves to ReportsListDto.
   */
  async getReportsByJobId(jobId: string): Promise<ReportsListDto> {
    try {
      // Validate job exists
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }

      // TODO: Delegate to ReportService once implemented
      // For now, return empty reports list as reports should be handled by report service
      this.logger.warn(
        `Report retrieval for job ${jobId} should be handled by ReportService`,
      );
      return new ReportsListDto(jobId, []);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error validating job ${jobId} for report retrieval:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves report by id.
   * NOTE: This method should be handled by ReportService.
   * @param reportId - The report id.
   * @returns A promise that resolves to AnalysisReportDto.
   */
  async getReportById(reportId: string): Promise<AnalysisReportDto> {
    // TODO: Delegate to ReportService once implemented
    this.logger.warn(
      `Report retrieval for reportId ${reportId} should be handled by ReportService`,
    );
    throw new NotFoundException(
      'Report operations should be handled by ReportService',
    );
  }

  // Helper methods

  // NATS Subscription Methods

  /**
   * Sets up subscription to analysis.jd.extracted events.
   */
  private async subscribeToAnalysisCompleted(): Promise<void> {
    this.logger.log(
      '📡 Setting up subscription to analysis.jd.extracted events',
    );

    await this.natsClient.subscribeToAnalysisCompleted(
      this.handleJdAnalysisCompleted.bind(this),
    );

    this.logger.log(
      '✅ Successfully subscribed to analysis.jd.extracted events',
    );
  }

  /**
   * Sets up subscription to job.jd.failed events.
   */
  private async subscribeToAnalysisFailed(): Promise<void> {
    this.logger.log('📡 Setting up subscription to job.jd.failed events');

    await this.natsClient.subscribeToAnalysisFailed(
      this.handleJdAnalysisFailed.bind(this),
    );

    this.logger.log('✅ Successfully subscribed to job.jd.failed events');
  }

  // NATS Event Handlers

  /**
   * Handles successful JD analysis completion events.
   * Updates job status to 'completed' and stores analysis results in MongoDB.
   *
   * @param event - The analysis.jd.extracted event payload
   * @param metadata - Message metadata from NATS
   */
  private async handleJdAnalysisCompleted(
    event: AnalysisJdExtractedEvent,
    _metadata?: MessageMetadata,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `📨 Processing analysis.jd.extracted event for jobId: ${event.jobId}, confidence: ${event.quality?.confidence || event.confidence}, fields: ${event.quality?.extractedFields}`,
      );

      // Validate event payload
      if (!event.jobId) {
        this.logger.error(
          '❌ Invalid analysis.jd.extracted event: missing jobId',
        );
        return;
      }

      // Check if job exists
      const job = await this.jobRepository.findById(event.jobId);
      if (!job) {
        this.logger.warn(
          `⚠️ Job ${event.jobId} not found for analysis completion - job may have been deleted`,
        );
        return;
      }

      // Extract keywords from the analysis data
      const extractedKeywords: string[] = this.extractKeywordsFromAnalysis(
        event.extractedData as KeywordSource,
      );
      const qualityConfidence =
        typeof event.quality?.confidence === 'number'
          ? event.quality.confidence
          : undefined;
      const extractedConfidence =
        typeof event.confidence === 'number' ? event.confidence : undefined;
      const confidence = qualityConfidence ?? extractedConfidence ?? 0.85;

      // Update job with analysis results and set status to completed
      await Promise.all([
        this.jobRepository.updateJdAnalysis(
          event.jobId,
          extractedKeywords,
          confidence,
        ),
        this.jobRepository.updateStatus(event.jobId, 'completed'),
      ]);

      await this.registerSemanticCacheEntry(
        job,
        extractedKeywords,
        confidence,
      );

      // Clear related caches
      await this.cacheService.del(
        this.cacheService.generateKey('jobs', 'list'),
      );

      // Emit WebSocket event for real-time job status update
      try {
        this.webSocketGateway.emitJobUpdated({
          jobId: event.jobId,
          title: job.title,
          status: 'completed',
          timestamp: new Date(),
          organizationId: job.organizationId,
          metadata: {
            confidence,
            extractedKeywords,
            processingTime:
              (typeof event.performance?.processingTimeMs === 'number'
                ? event.performance.processingTimeMs
                : undefined) ?? event.processingTimeMs,
          },
        });

        this.logger.log(
          `📡 Emitted WebSocket job_updated event for completed job ${event.jobId}`,
        );
      } catch (wsError) {
        this.logger.error(
          `❌ Failed to emit WebSocket event for job ${event.jobId}:`,
          wsError,
        );
        // Don't fail the entire operation if WebSocket emission fails
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `✅ Successfully processed JD analysis completion for jobId: ${event.jobId} - Status: completed, Keywords: ${extractedKeywords.length}, Confidence: ${confidence}, Time: ${processingTime}ms`,
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ Error processing JD analysis completion for jobId: ${event.jobId} (${processingTime}ms):`,
        error,
      );

      // On error processing the completion event, mark job as failed
      try {
        await this.jobRepository.updateStatus(event.jobId, 'failed');
        this.logger.log(
          `Updated job ${event.jobId} status to 'failed' due to event processing error`,
        );
      } catch (updateError) {
        this.logger.error(
          `Failed to update job ${event.jobId} status to failed:`,
          updateError,
        );
      }
    }
  }

  /**
   * Handles JD analysis failure events.
   * Updates job status to 'failed' in MongoDB.
   *
   * @param event - The job.jd.failed event payload
   * @param metadata - Message metadata from NATS
   */
  private async handleJdAnalysisFailed(
    event: AnalysisFailedEvent,
    _metadata?: MessageMetadata,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `📨 Processing job.jd.failed event for jobId: ${event.jobId}, severity: ${event.severity}, stage: ${event.context.stage}`,
      );

      // Validate event payload
      if (!event.jobId) {
        this.logger.error('❌ Invalid job.jd.failed event: missing jobId');
        return;
      }

      // Check if job exists
      const job = await this.jobRepository.findById(event.jobId);
      if (!job) {
        this.logger.warn(
          `⚠️ Job ${event.jobId} not found for failure handling - job may have been deleted`,
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
      try {
        this.webSocketGateway.emitJobUpdated({
          jobId: event.jobId,
          title: job.title,
          status: 'failed',
          timestamp: new Date(),
          organizationId: job.organizationId,
          metadata: {
            errorMessage: event.error.message,
          },
        });

        this.logger.log(
          `📡 Emitted WebSocket job_updated event for failed job ${event.jobId}`,
        );
      } catch (wsError) {
        this.logger.error(
          `❌ Failed to emit WebSocket event for job ${event.jobId}:`,
          wsError,
        );
        // Don't fail the entire operation if WebSocket emission fails
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `✅ Successfully processed JD analysis failure for jobId: ${event.jobId} - Status: failed, Error: ${event.error.message}, Severity: ${event.severity}, Time: ${processingTime}ms`,
      );

      // Log detailed error for high/critical severity issues
      if (event.severity === 'high' || event.severity === 'critical') {
        this.logger.error(
          `🚨 High severity JD analysis failure for jobId: ${event.jobId}:`,
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
        `❌ Error processing JD analysis failure for jobId: ${event.jobId} (${processingTime}ms):`,
        error,
      );

      // Even if we can't process the failure event, we should still try to mark the job as failed
      try {
        await this.jobRepository.updateStatus(event.jobId, 'failed');
        this.logger.log(
          `Updated job ${event.jobId} status to 'failed' due to failure event processing error`,
        );
      } catch (updateError) {
        this.logger.error(
          `Failed to update job ${event.jobId} status to failed:`,
          updateError,
        );
      }
    }
  }

  private buildSemanticCacheOptions(
    overrides: Partial<SemanticCacheOptions> = {},
  ): SemanticCacheOptions {
    return {
      ttl: this.semanticCacheTtlMs,
      similarityThreshold: this.semanticCacheThreshold,
      maxResults: this.semanticCacheMaxResults,
      ...overrides,
    };
  }

  private normalizeThreshold(value: string | number | undefined): number {
    const numeric = this.normalizePositiveNumber(value, 0.92);
    return Math.min(Math.max(numeric, 0), 1);
  }

  private normalizePositiveNumber(
    value: string | number | undefined,
    fallback: number,
  ): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return fallback;
  }

  /**
   * Extracts keywords from the analysis data structure.
   *
   * @param analysisData - The extracted data from JD analysis
   * @returns Array of extracted keywords
   */
  private extractKeywordsFromAnalysis(
    analysisData: KeywordSource | null | undefined,
  ): string[] {
    try {
      if (!analysisData || typeof analysisData !== 'object') {
        return [];
      }

      const keywordSet = new Set<string>();

      const appendStrings = (values?: unknown[]): void => {
        if (!Array.isArray(values)) {
          return;
        }
        values.forEach((value) => {
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length > 0) {
              keywordSet.add(trimmed);
            }
          }
        });
      };

      appendStrings(analysisData.skills as unknown[]);
      appendStrings(analysisData.keywords);
      appendStrings(analysisData.extractedKeywords);

      if (Array.isArray(analysisData.requirements)) {
        analysisData.requirements.forEach((requirement) => {
          if (typeof requirement === 'string') {
            const trimmed = requirement.trim();
            if (trimmed.length > 0) {
              keywordSet.add(trimmed);
            }
          } else if (
            requirement &&
            typeof requirement === 'object' &&
            typeof requirement.skill === 'string'
          ) {
            const trimmed = requirement.skill.trim();
            if (trimmed.length > 0) {
              keywordSet.add(trimmed);
            }
          }
        });
      }

      return Array.from(keywordSet).slice(0, 20);
    } catch (error) {
      this.logger.warn('Error extracting keywords from analysis data:', error);
      return [];
    }
  }
}
