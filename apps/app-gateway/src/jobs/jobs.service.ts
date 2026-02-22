import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { CreateJobDto } from './dto/create-job.dto';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import type { MulterFile } from './types/multer.types';
import { JobListDto, JobDetailDto } from './dto/job-response.dto';
import type { ResumeListItemDto, ResumeDetailDto } from './dto/resume-response.dto';
import type { AnalysisReportDto } from './dto/report-response.dto';
import { ReportsListDto } from './dto/report-response.dto';
import type { JobRepository } from '../repositories/job.repository';
import type { UserDto } from '@ai-recruitment-clerk/user-management-domain';
import { UserRole } from '@ai-recruitment-clerk/user-management-domain';
import type { JobJdSubmittedEvent } from '@ai-recruitment-clerk/job-management-domain';
import type { ResumeSubmittedEvent } from '@ai-recruitment-clerk/resume-processing-domain';
import type { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import type { CacheService } from '../cache/cache.service';
import type { Job, JobDocument } from '../schemas/job.schema';
import type { WebSocketGateway } from '../websocket/websocket.gateway';
import type { ConfigService } from '@nestjs/config';
import { JobsSemanticCacheService, JobsEventService } from './services';

type JobUpdateStatus =
  | 'processing'
  | 'completed'
  | 'failed'
  | 'active'
  | 'draft'
  | 'closed';

/**
 * Main facade service for jobs functionality.
 * Delegates specialized operations to sub-services:
 * - JobsSemanticCacheService: Semantic cache operations
 * - JobsEventService: NATS subscriptions and event handling
 */
@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);
  private readonly semanticCacheService: JobsSemanticCacheService;
  private readonly eventService: JobsEventService;

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly natsClient: AppGatewayNatsService,
    private readonly cacheService: CacheService,
    private readonly webSocketGateway: WebSocketGateway,
    configService: ConfigService,
  ) {
    this.semanticCacheService = new JobsSemanticCacheService(
      cacheService,
      configService,
    );
    this.eventService = new JobsEventService(
      jobRepository,
      natsClient,
      cacheService,
      webSocketGateway,
      this.semanticCacheService,
    );
  }

  /**
   * Initializes NATS event subscriptions for job processing workflow.
   */
  public async onModuleInit(): Promise<void> {
    await this.eventService.initializeSubscriptions();
  }

  private hasAccessToResource(
    user: UserDto,
    resourceOrganizationId?: string,
  ): boolean {
    // Admins have access to all resources
    const normalizedRole = String(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user as any)?.rawRole ?? user.role ?? '',
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
  public async createJob(
    dto: CreateJobDto,
    user: UserDto,
  ): Promise<{ jobId: string }> {
    const baseJobData: Partial<Job> = {
      title: dto.jobTitle,
      description: dto.jdText,
      status: 'processing',
      createdBy: user.id,
      company: user.organizationId ?? 'Unknown',
      organizationId: user.organizationId,
    };

    if (this.semanticCacheService.isEnabled()) {
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
    const cacheEntry = await this.semanticCacheService.tryGetSemanticCache(
      dto.jdText,
      user,
    );

    if (!cacheEntry) {
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
      const actualJobId = this.semanticCacheService.getJobId(savedJob);

      this.logger.log(
        `Reused semantic analysis from job ${cacheEntry.jobId} for new job ${actualJobId} (similarity ${(cacheEntry.semanticSimilarity ?? 0).toFixed(3)})`,
      );

      await this.semanticCacheService.refreshSemanticCacheEntry(cacheEntry);

      await this.eventService.emitJobUpdatedEvent({
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

  private async createJobWithProcessingPipeline(
    dto: CreateJobDto,
    user: UserDto,
    jobData: Partial<Job>,
  ): Promise<string> {
    try {
      const savedJob = await this.jobRepository.create(jobData);
      const actualJobId = this.semanticCacheService.getJobId(savedJob);

      this.logger.log(
        `Created job ${actualJobId} for user ${user.id} in organization ${user.organizationId}`,
      );

      await this.eventService.emitJobUpdatedEvent({
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

  /**
   * Performs the upload resumes operation.
   * @param jobId - The job id.
   * @param files - The files.
   * @param user - The user.
   * @returns A promise that resolves to ResumeUploadResponseDto.
   */
  public async uploadResumes(
    jobId: string,
    files: MulterFile[],
    user: UserDto,
  ): Promise<ResumeUploadResponseDto> {
    if (!files || files.length === 0) {
      return new ResumeUploadResponseDto(jobId, 0);
    }

    try {
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!this.hasAccessToResource(user, (job as any).organizationId)) {
        throw new ForbiddenException('Access denied to this job');
      }

      const publishPromises = files.map(async (file) => {
        const resumeId = randomUUID();

        const resumeSubmittedEvent: ResumeSubmittedEvent = {
          jobId,
          resumeId,
          originalFilename: file.originalname,
          tempGridFsUrl: `/temp/uploads/${resumeId}`,
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
  public async getAllJobs(): Promise<JobListDto[]> {
    const cacheKey = this.cacheService.generateKey('jobs', 'list');

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        try {
          const jobDocuments = await this.jobRepository.findAll({ limit: 100 });
          return jobDocuments.map(
            (job) =>
              new JobListDto(
                this.semanticCacheService.getJobId(job),
                job.title,
                job.status as 'processing' | 'completed',
                job.createdAt,
                0,
              ),
          );
        } catch (error) {
          this.logger.error('Error retrieving all jobs:', error);
          throw error;
        }
      },
      { ttl: 120000 },
    );
  }

  /**
   * Retrieves job by id.
   * @param jobId - The job id.
   * @returns A promise that resolves to JobDetailDto.
   */
  public async getJobById(jobId: string): Promise<JobDetailDto> {
    try {
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }

      return new JobDetailDto(
        this.semanticCacheService.getJobId(job),
        job.title,
        job.description,
        job.status as 'processing' | 'completed',
        job.createdAt,
        0,
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
   * @param jobId - The job id.
   * @returns A promise that resolves to an array of ResumeListItemDto.
   */
  public async getResumesByJobId(jobId: string): Promise<ResumeListItemDto[]> {
    try {
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }

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
   * @param resumeId - The resume id.
   * @returns A promise that resolves to ResumeDetailDto.
   */
  public async getResumeById(resumeId: string): Promise<ResumeDetailDto> {
    this.logger.warn(
      `Resume retrieval for resumeId ${resumeId} should be handled by ResumeService`,
    );
    throw new NotFoundException(
      'Resume operations should be handled by ResumeService',
    );
  }

  /**
   * Retrieves reports by job id.
   * @param jobId - The job id.
   * @returns A promise that resolves to ReportsListDto.
   */
  public async getReportsByJobId(jobId: string): Promise<ReportsListDto> {
    try {
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }

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
   * @param reportId - The report id.
   * @returns A promise that resolves to AnalysisReportDto.
   */
  public async getReportById(reportId: string): Promise<AnalysisReportDto> {
    this.logger.warn(
      `Report retrieval for reportId ${reportId} should be handled by ReportService`,
    );
    throw new NotFoundException(
      'Report operations should be handled by ReportService',
    );
  }
}
