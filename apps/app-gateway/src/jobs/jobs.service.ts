import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateJobDto } from './dto/create-job.dto';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import { MulterFile } from './types/multer.types';
import { JobListDto, JobDetailDto } from './dto/job-response.dto';
import { ResumeListItemDto, ResumeDetailDto } from './dto/resume-response.dto';
import { AnalysisReportDto, ReportsListDto } from './dto/report-response.dto';
import { InMemoryStorageService } from './storage/in-memory-storage.service';
import {
  UserDto,
  UserRole,
} from '@ai-recruitment-clerk/user-management-domain';
import { JobJdSubmittedEvent } from '@ai-recruitment-clerk/job-management-domain';
import type { ResumeSubmittedEvent } from '@ai-recruitment-clerk/resume-processing-domain';
import { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import { CacheService } from '../cache/cache.service';

/**
 * Provides jobs functionality.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  /**
   * Initializes a new instance of the Jobs Service.
   * @param storageService - The storage service.
   * @param natsClient - The nats client.
   * @param cacheService - The cache service.
   */
  constructor(
    private readonly storageService: InMemoryStorageService,
    private readonly natsClient: AppGatewayNatsService,
    private readonly cacheService: CacheService,
  ) {
    // Initialize with mock data for development
    this.storageService.seedMockData();
  }

  private hasAccessToResource(
    user: UserDto,
    resourceOrganizationId?: string,
  ): boolean {
    // Admins have access to all resources
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Other users can only access resources in their organization
    return user.organizationId === resourceOrganizationId;
  }

  private filterByOrganization<T extends { organizationId?: string }>(
    user: UserDto,
    items: T[],
  ): T[] {
    if (user.role === UserRole.ADMIN) {
      return items; // Admins see everything
    }

    return items.filter((item) => item.organizationId === user.organizationId);
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
    const jobId = randomUUID();
    const job = new JobDetailDto(
      jobId,
      dto.jobTitle,
      dto.jdText,
      'processing',
      new Date(),
      0,
    );

    // Add organization context to job
    (job as any).organizationId = user.organizationId;
    (job as any).createdBy = user.id;

    this.storageService.createJob(job);

    // Publish the event to NATS for actual processing
    const jobJdSubmittedEvent: JobJdSubmittedEvent = {
      jobId,
      jobTitle: dto.jobTitle,
      jdText: dto.jdText,
      timestamp: new Date().toISOString(),
    };

    try {
      const result =
        await this.natsClient.publishJobJdSubmitted(jobJdSubmittedEvent);
      if (result.success) {
        this.logger.log(
          `Published job.jd.submitted event for ${jobId} by user ${user.id}. MessageId: ${result.messageId}`,
        );
      } else {
        this.logger.error(
          `Failed to publish job.jd.submitted event for ${jobId}: ${result.error}`,
        );
        // Log error but keep job as processing for retry
        this.logger.error(
          `Failed to publish event for job ${jobId}, keeping status as processing for retry`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error publishing job.jd.submitted event for ${jobId}:`,
        error,
      );
      // Log error but keep job as processing for retry
      this.logger.error(
        `Error processing job ${jobId}, keeping status as processing for retry`,
      );
    }

    // Keep the simulation for now to maintain existing behavior until real processing is implemented
    setTimeout(() => {
      const existingJob = this.storageService.getJob(jobId);
      if (existingJob && existingJob.status === 'processing') {
        existingJob.status = 'completed';
        this.storageService.createJob(existingJob);
        this.logger.log(`Job ${jobId} processing completed (simulated)`);
      }
    }, 2000);

    return { jobId };
  }

  /**
   * Performs the upload resumes operation.
   * @param jobId - The job id.
   * @param files - The files.
   * @param user - The user.
   * @returns The ResumeUploadResponseDto.
   */
  uploadResumes(
    jobId: string,
    files: MulterFile[],
    user: UserDto,
  ): ResumeUploadResponseDto {
    if (!files || files.length === 0) {
      return new ResumeUploadResponseDto(jobId, 0);
    }

    const job = this.storageService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Check if user has access to this job
    if (!this.hasAccessToResource(user, (job as any).organizationId)) {
      throw new ForbiddenException('Access denied to this job');
    }

    // Process each uploaded resume file
    files.forEach(async (file, index) => {
      const resumeId = randomUUID();
      const resume = new ResumeDetailDto(
        resumeId,
        jobId,
        file.originalname,
        'pending',
        new Date(),
        this.extractCandidateName(file.originalname),
      );

      this.storageService.createResume(resume);

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
        } else {
          this.logger.error(
            `Failed to publish resume.submitted event for resumeId: ${resumeId}: ${result.error}`,
          );
          // Update resume status to failed if event publishing failed
          resume.status = 'failed';
          this.storageService.createResume(resume);
        }
      } catch (error) {
        this.logger.error(
          `Error publishing resume.submitted event for resumeId: ${resumeId}:`,
          error,
        );
        resume.status = 'failed';
        this.storageService.createResume(resume);
      }

      // Keep the simulation for now to maintain existing behavior until real processing is implemented
      setTimeout(
        () => {
          this.simulateResumeProcessing(resumeId, jobId, file.originalname);
        },
        (index + 1) * 3000,
      ); // Stagger processing
    });

    return new ResumeUploadResponseDto(jobId, files.length);
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
        return this.storageService
          .getAllJobs()
          .map(
            (job) =>
              new JobListDto(
                job.id,
                job.title,
                job.status,
                job.createdAt,
                job.resumeCount,
              ),
          );
      },
      { ttl: 120000 }, // 2分钟缓存(120000毫秒)，职位列表更新不频繁
    );
  }

  /**
   * Retrieves job by id.
   * @param jobId - The job id.
   * @returns The JobDetailDto.
   */
  getJobById(jobId: string): JobDetailDto {
    const job = this.storageService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }
    return job;
  }

  /**
   * Retrieves resumes by job id.
   * @param jobId - The job id.
   * @returns A promise that resolves to an array of ResumeListItemDto.
   */
  async getResumesByJobId(jobId: string): Promise<ResumeListItemDto[]> {
    const cacheKey = this.cacheService.generateKey('resumes', 'job', jobId);

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const job = this.storageService.getJob(jobId);
        if (!job) {
          throw new NotFoundException(`Job with ID ${jobId} not found`);
        }

        return this.storageService
          .getResumesByJobId(jobId)
          .map(
            (resume) =>
              new ResumeListItemDto(
                resume.id,
                resume.jobId,
                resume.originalFilename,
                resume.status,
                resume.createdAt,
                resume.matchScore,
                resume.candidateName,
              ),
          );
      },
      { ttl: 60000 }, // 1分钟缓存(60000毫秒)，简历状态变化较频繁
    );
  }

  /**
   * Retrieves resume by id.
   * @param resumeId - The resume id.
   * @returns A promise that resolves to ResumeDetailDto.
   */
  async getResumeById(resumeId: string): Promise<ResumeDetailDto> {
    const cacheKey = this.cacheService.generateKey(
      'resumes',
      'detail',
      resumeId,
    );

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const resume = this.storageService.getResume(resumeId);
        if (!resume) {
          throw new NotFoundException(`Resume with ID ${resumeId} not found`);
        }
        return resume;
      },
      { ttl: 300000 }, // 5分钟缓存(300000毫秒)，简历详情相对稳定
    );
  }

  /**
   * Retrieves reports by job id.
   * @param jobId - The job id.
   * @returns A promise that resolves to ReportsListDto.
   */
  async getReportsByJobId(jobId: string): Promise<ReportsListDto> {
    const cacheKey = this.cacheService.generateKey('reports', 'job', jobId);

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const job = this.storageService.getJob(jobId);
        if (!job) {
          throw new NotFoundException(`Job with ID ${jobId} not found`);
        }

        const reports = this.storageService.getReportsByJobId(jobId);
        return new ReportsListDto(
          jobId,
          reports.map((report) => ({
            id: report.id,
            candidateName: report.candidateName,
            matchScore: report.matchScore,
            oneSentenceSummary: report.oneSentenceSummary,
            status: 'completed' as const,
            generatedAt: report.generatedAt,
          })),
        );
      },
      { ttl: 240000 }, // 4分钟缓存(240000毫秒)，报告列表更新不频繁
    );
  }

  /**
   * Retrieves report by id.
   * @param reportId - The report id.
   * @returns A promise that resolves to AnalysisReportDto.
   */
  async getReportById(reportId: string): Promise<AnalysisReportDto> {
    const cacheKey = this.cacheService.generateKey(
      'reports',
      'detail',
      reportId,
    );

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const report = this.storageService.getReport(reportId);
        if (!report) {
          throw new NotFoundException(`Report with ID ${reportId} not found`);
        }
        return report;
      },
      { ttl: 600000 }, // 10分钟缓存(600000毫秒)，报告内容完成后基本不变
    );
  }

  // Helper methods
  private extractCandidateName(filename: string): string {
    // Simple name extraction from filename
    const nameMatch = filename.match(/^([^_]+)/);
    return nameMatch ? nameMatch[1] : 'Unknown';
  }

  private simulateResumeProcessing(
    resumeId: string,
    jobId: string,
    filename: string,
  ): void {
    const candidateName = this.extractCandidateName(filename);

    // Simulate parsing completion
    const resume = this.storageService.getResume(resumeId);
    if (!resume) return;

    // Update resume with parsed data (mock)
    resume.status = 'scoring';
    resume.contactInfo = {
      name: candidateName,
      email: `${candidateName.toLowerCase()}@email.com`,
      phone: '1380013800' + Math.floor(Math.random() * 10),
    };
    resume.skills = ['Python', 'JavaScript', 'React', 'Node.js'];
    resume.workExperience = [
      {
        company: 'Tech Company',
        position: 'Software Developer',
        startDate: '2022-01-01',
        endDate: 'present',
        summary: 'Developed web applications',
      },
    ];
    resume.education = [
      {
        school: 'University',
        degree: 'Bachelor',
        major: 'Computer Science',
      },
    ];

    this.storageService.createResume(resume);

    // Generate analysis report after scoring
    setTimeout(() => {
      const reportId = randomUUID();
      const matchScore = Math.floor(Math.random() * 40) + 60; // 60-100

      const report = new AnalysisReportDto(
        reportId,
        resumeId,
        jobId,
        candidateName,
        matchScore,
        `${candidateName} is a ${matchScore > 80 ? 'highly qualified' : 'suitable'} candidate with relevant experience.`,
        [
          'Strong technical skills',
          'Relevant work experience',
          'Good educational background',
        ],
        [
          'Could benefit from more leadership experience',
          'Some advanced skills not demonstrated',
        ],
        matchScore < 70 ? ['Limited experience in required technologies'] : [],
        [
          'Tell me about your most challenging project?',
          'How do you handle tight deadlines?',
          'What are your career goals?',
        ],
      );

      this.storageService.createReport(report);

      resume.status = 'completed';
      this.storageService.createResume(resume);

      Logger.log(
        `Resume processing completed for ${candidateName} (${resumeId})`,
      );
    }, 2000);
  }
}
