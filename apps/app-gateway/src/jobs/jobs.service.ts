import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateJobDto } from './dto/create-job.dto';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import { MulterFile } from './types/multer.types';
import { JobListDto, JobDetailDto } from './dto/job-response.dto';
import { ResumeListItemDto, ResumeDetailDto } from './dto/resume-response.dto';
import { AnalysisReportDto, ReportsListDto } from './dto/report-response.dto';
import { InMemoryStorageService } from './storage/in-memory-storage.service';
import { UserDto, UserRole } from '../../../../libs/shared-dtos/src';

@Injectable()
export class JobsService {
  constructor(private readonly storageService: InMemoryStorageService) {
    // Initialize with mock data for development
    this.storageService.seedMockData();
  }

  private hasAccessToResource(user: UserDto, resourceOrganizationId?: string): boolean {
    // Admins have access to all resources
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    
    // Other users can only access resources in their organization
    return user.organizationId === resourceOrganizationId;
  }

  private filterByOrganization<T extends { organizationId?: string }>(user: UserDto, items: T[]): T[] {
    if (user.role === UserRole.ADMIN) {
      return items; // Admins see everything
    }
    
    return items.filter(item => item.organizationId === user.organizationId);
  }

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
    
    // Here we would publish the event to NATS for actual processing
    Logger.log(`Published job.jd.submitted for ${jobId} by user ${user.id}`);
    
    // Simulate JD processing completion after 2 seconds
    setTimeout(() => {
      const existingJob = this.storageService.getJob(jobId);
      if (existingJob) {
        existingJob.status = 'completed';
        this.storageService.createJob(existingJob);
        Logger.log(`Job ${jobId} processing completed`);
      }
    }, 2000);
    
    return { jobId };
  }

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
    files.forEach((file, index) => {
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
      
      // Here we would publish the NATS event for each resume
      Logger.log(`Published resume.submitted for jobId: ${jobId}, resumeId: ${resumeId}, filename: ${file.originalname}`);
      
      // Simulate resume processing after a delay
      setTimeout(() => {
        this.simulateResumeProcessing(resumeId, jobId, file.originalname);
      }, (index + 1) * 3000); // Stagger processing
    });

    return new ResumeUploadResponseDto(jobId, files.length);
  }

  // GET methods for frontend
  getAllJobs(): JobListDto[] {
    return this.storageService.getAllJobs().map(job => 
      new JobListDto(job.id, job.title, job.status, job.createdAt, job.resumeCount)
    );
  }

  getJobById(jobId: string): JobDetailDto {
    const job = this.storageService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }
    return job;
  }

  getResumesByJobId(jobId: string): ResumeListItemDto[] {
    const job = this.storageService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }
    
    return this.storageService.getResumesByJobId(jobId).map(resume => 
      new ResumeListItemDto(
        resume.id,
        resume.jobId,
        resume.originalFilename,
        resume.status,
        resume.createdAt,
        resume.matchScore,
        resume.candidateName
      )
    );
  }

  getResumeById(resumeId: string): ResumeDetailDto {
    const resume = this.storageService.getResume(resumeId);
    if (!resume) {
      throw new NotFoundException(`Resume with ID ${resumeId} not found`);
    }
    return resume;
  }

  getReportsByJobId(jobId: string): ReportsListDto {
    const job = this.storageService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }
    
    const reports = this.storageService.getReportsByJobId(jobId);
    return new ReportsListDto(
      jobId,
      reports.map(report => ({
        id: report.id,
        candidateName: report.candidateName,
        matchScore: report.matchScore,
        oneSentenceSummary: report.oneSentenceSummary,
        status: 'completed' as const,
        generatedAt: report.generatedAt
      }))
    );
  }

  getReportById(reportId: string): AnalysisReportDto {
    const report = this.storageService.getReport(reportId);
    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }
    return report;
  }

  // Helper methods
  private extractCandidateName(filename: string): string {
    // Simple name extraction from filename
    const nameMatch = filename.match(/^([^_]+)/);
    return nameMatch ? nameMatch[1] : 'Unknown';
  }

  private simulateResumeProcessing(resumeId: string, jobId: string, filename: string): void {
    const candidateName = this.extractCandidateName(filename);
    
    // Simulate parsing completion
    const resume = this.storageService.getResume(resumeId);
    if (!resume) return;
    
    // Update resume with parsed data (mock)
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
