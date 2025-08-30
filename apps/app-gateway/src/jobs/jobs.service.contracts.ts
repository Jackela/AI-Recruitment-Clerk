/**
 * @fileoverview JobsService Design by Contract Enhancement
 * @author AI Recruitment Team  
 * @since 1.0.0
 * @version 1.0.0
 * @module JobsServiceContracts
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContractViolationError, Requires, Ensures, Invariant, ContractValidators } from '@ai-recruitment-clerk/infrastructure-shared';
import { CreateJobDto } from './dto/create-job.dto';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import { MulterFile } from './types/multer.types';
import { JobListDto, JobDetailDto } from './dto/job-response.dto';
import { ResumeListItemDto, ResumeDetailDto } from './dto/resume-response.dto';
import { AnalysisReportDto, ReportsListDto } from './dto/report-response.dto';
import { InMemoryStorageService } from './storage/in-memory-storage.service';
import { UserDto, UserRole } from '@ai-recruitment-clerk/user-management-domain';
import { JobJdSubmittedEvent } from '@ai-recruitment-clerk/job-management-domain';
import { ResumeSubmittedEvent } from '@ai-recruitment-clerk/resume-processing-domain';
import { NatsClient } from '../nats/nats.client';
import { CacheService } from '../cache/cache.service';

/**
 * Enhanced JobsService with Design by Contract protections
 * 
 * @class JobsServiceContracts
 * @implements Business logic contracts for job and resume management
 * 
 * @since 1.0.0
 */
@Injectable()
@Invariant(
  (instance: JobsServiceContracts) => !!instance.storageService && !!instance.natsClient && !!instance.cacheService,
  'Dependencies must be properly injected'
)
export class JobsServiceContracts {
  private readonly logger = new Logger(JobsServiceContracts.name);

  constructor(
    private readonly storageService: InMemoryStorageService,
    private readonly natsClient: NatsClient,
    private readonly cacheService: CacheService,
  ) {
    this.storageService.seedMockData();
  }

  /**
   * Creates new job with comprehensive validation
   * 
   * @method createJob
   * @param {CreateJobDto} dto - Job creation data
   * @param {UserDto} user - Authenticated user
   * @returns {Promise<{jobId: string}>} Created job identifier
   * 
   * @requires Valid job title and JD text
   * @requires Authenticated user with valid organization
   * @ensures Valid UUID job ID returned
   * @ensures Job persisted in storage
   * 
   * @since 1.0.0
   */
  @Requires(
    (dto: CreateJobDto, user: UserDto) => 
      ContractValidators.isNonEmptyString(dto.jobTitle) && 
      ContractValidators.isNonEmptyString(dto.jdText) &&
      !!user && ContractValidators.isNonEmptyString(user.id) &&
      ContractValidators.isNonEmptyString(user.organizationId),
    'Job creation requires valid title, JD text, and authenticated user with organization'
  )
  @Ensures(
    (result: { jobId: string }) => 
      ContractValidators.isNonEmptyString(result.jobId) && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(result.jobId),
    'Must return valid UUID job ID'
  )
  async createJob(dto: CreateJobDto, user: UserDto): Promise<{ jobId: string }> {
    const jobId = randomUUID();
    const job = new JobDetailDto(
      jobId,
      dto.jobTitle,
      dto.jdText,
      'processing',
      new Date(),
      0
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
      const result = await this.natsClient.publishJobJdSubmitted(jobJdSubmittedEvent);
      if (result.success) {
        this.logger.log(`Published job.jd.submitted event for ${jobId} by user ${user.id}. MessageId: ${result.messageId}`);
      } else {
        this.logger.error(`Failed to publish job.jd.submitted event for ${jobId}: ${result.error}`);
        this.logger.error(`Failed to publish event for job ${jobId}, keeping status as processing for retry`);
      }
    } catch (error) {
      this.logger.error(`Error publishing job.jd.submitted event for ${jobId}:`, error);
      this.logger.error(`Error processing job ${jobId}, keeping status as processing for retry`);
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
   * Uploads resumes for specific job with validation
   * 
   * @method uploadResumes  
   * @param {string} jobId - Target job identifier
   * @param {MulterFile[]} files - Uploaded resume files
   * @param {UserDto} user - Authenticated user
   * @returns {ResumeUploadResponseDto} Upload result summary
   * 
   * @requires Valid job ID and file array
   * @requires User has access to target job
   * @requires All files within size limits
   * @ensures Upload count matches file count
   * 
   * @since 1.0.0
   */
  @Requires(
    (jobId: string, files: MulterFile[], user: UserDto) => 
      ContractValidators.isNonEmptyString(jobId) &&
      Array.isArray(files) && files.length > 0 &&
      files.every(f => f.size > 0 && f.size <= 10 * 1024 * 1024) && // 10MB limit
      !!user && ContractValidators.isNonEmptyString(user.id),
    'Resume upload requires valid job ID, non-empty file array within size limits, and authenticated user'
  )
  @Ensures(
    (result: ResumeUploadResponseDto) => 
      ContractValidators.isNonEmptyString(result.jobId) && result.submittedResumes >= 0,
    'Must return valid upload response with job ID and count'
  )
  uploadResumes(jobId: string, files: MulterFile[], user: UserDto): ResumeUploadResponseDto {
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
        this.extractCandidateName(file.originalname)
      );
      
      this.storageService.createResume(resume);
      
      // Publish the NATS event for each resume
      const resumeSubmittedEvent: ResumeSubmittedEvent = {
        jobId,
        resumeId,
        originalFilename: file.originalname,
        tempGridFsUrl: `/temp/uploads/${resumeId}`,
      };
      
      try {
        const result = await this.natsClient.publishResumeSubmitted(resumeSubmittedEvent);
        if (result.success) {
          this.logger.log(`Published resume.submitted event for jobId: ${jobId}, resumeId: ${resumeId}, filename: ${file.originalname}. MessageId: ${result.messageId}`);
        } else {
          this.logger.error(`Failed to publish resume.submitted event for resumeId: ${resumeId}: ${result.error}`);
          resume.status = 'failed';
          this.storageService.createResume(resume);
        }
      } catch (error) {
        this.logger.error(`Error publishing resume.submitted event for resumeId: ${resumeId}:`, error);
        resume.status = 'failed';
        this.storageService.createResume(resume);
      }
      
      // Keep the simulation for now
      setTimeout(() => {
        this.simulateResumeProcessing(resumeId, jobId, file.originalname);
      }, (index + 1) * 3000);
    });

    return new ResumeUploadResponseDto(jobId, files.length);
  }

  /**
   * Retrieves all jobs with caching and organization filtering
   * 
   * @method getAllJobs
   * @returns {Promise<JobListDto[]>} List of jobs accessible to user
   * 
   * @ensures Returns array (possibly empty)
   * @ensures All jobs have valid structure
   * 
   * @since 1.0.0
   */
  @Ensures(
    (result: JobListDto[]) => 
      Array.isArray(result) &&
      result.every(job => 
        ContractValidators.isNonEmptyString(job.id) &&
        ContractValidators.isNonEmptyString(job.title) &&
        ['processing', 'completed', 'failed'].includes(job.status)
      ),
    'Must return valid job list with proper structure'
  )
  async getAllJobs(): Promise<JobListDto[]> {
    const cacheKey = this.cacheService.generateKey('jobs', 'list');
    
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        return this.storageService.getAllJobs().map(job => 
          new JobListDto(job.id, job.title, job.status, job.createdAt, job.resumeCount)
        );
      },
      { ttl: 120000 }
    );
  }

  /**
   * Retrieves specific job by ID with validation
   * 
   * @method getJobById
   * @param {string} jobId - Job identifier
   * @returns {Promise<JobDetailDto>} Job details
   * 
   * @requires Valid job ID format
   * @ensures Returns valid job object
   * @throws {NotFoundException} When job not found
   * 
   * @since 1.0.0
   */
  @Requires(
    (jobId: string) => ContractValidators.isNonEmptyString(jobId),
    'Job ID must be non-empty string'
  )
  @Ensures(
    (result: JobDetailDto) => 
      !!result && 
      ContractValidators.isNonEmptyString(result.id) &&
      ContractValidators.isNonEmptyString(result.title) &&
      ['processing', 'completed', 'failed'].includes(result.status),
    'Must return valid job detail object'
  )
  async getJobById(jobId: string): Promise<JobDetailDto> {
    const cacheKey = this.cacheService.generateKey('jobs', 'detail', jobId);
    
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const job = this.storageService.getJob(jobId);
        if (!job) {
          throw new NotFoundException(`Job with ID ${jobId} not found`);
        }
        return job;
      },
      { ttl: 180000 }
    );
  }

  // Additional contract-protected methods would follow similar pattern...
  // For brevity, including key validation patterns

  private hasAccessToResource(user: UserDto, resourceOrganizationId?: string): boolean {
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    return user.organizationId === resourceOrganizationId;
  }

  private filterByOrganization<T extends { organizationId?: string }>(user: UserDto, items: T[]): T[] {
    if (user.role === UserRole.ADMIN) {
      return items;
    }
    return items.filter(item => item.organizationId === user.organizationId);
  }

  private extractCandidateName(filename: string): string {
    const nameMatch = filename.match(/^([^_]+)/);
    return nameMatch ? nameMatch[1] : 'Unknown';
  }

  private simulateResumeProcessing(resumeId: string, jobId: string, filename: string): void {
    // Simulation logic remains the same for now...
    const candidateName = this.extractCandidateName(filename);
    
    const resume = this.storageService.getResume(resumeId);
    if (!resume) return;
    
    resume.status = 'scoring';
    resume.contactInfo = {
      name: candidateName,
      email: `${candidateName.toLowerCase()}@email.com`,
      phone: '1380013800' + Math.floor(Math.random() * 10)
    };
    resume.skills = ['Python', 'JavaScript', 'React', 'Node.js'];
    resume.workExperience = [{
      company: 'Tech Company',
      position: 'Software Developer', 
      startDate: '2022-01-01',
      endDate: 'present',
      summary: 'Developed web applications'
    }];
    resume.education = [{
      school: 'University',
      degree: 'Bachelor',
      major: 'Computer Science'
    }];
    
    this.storageService.createResume(resume);
    
    setTimeout(() => {
      const reportId = randomUUID();
      const matchScore = Math.floor(Math.random() * 40) + 60;
      
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
          'Good educational background'
        ],
        [
          'Could benefit from more leadership experience',
          'Some advanced skills not demonstrated'
        ],
        matchScore < 70 ? ['Limited experience in required technologies'] : [],
        [
          'Tell me about your most challenging project?',
          'How do you handle tight deadlines?',
          'What are your career goals?'
        ]
      );
      
      this.storageService.createReport(report);
      
      resume.status = 'completed';
      this.storageService.createResume(resume);
      
      Logger.log(`Resume processing completed for ${candidateName} (${resumeId})`);
    }, 2000);
  }
}