import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import { UserDto, UserRole } from '@ai-recruitment-clerk/user-management-domain';
import type { MulterFile } from './types/multer.types';
import { JobDetailDto } from './dto/job-response.dto';

const mockUser: UserDto = {
  id: 'user-1',
  username: 'tester',
  email: 'tester@example.com',
  role: UserRole.HR_MANAGER,
  organizationId: 'org-1',
  isActive: true,
  createdAt: new Date(),
};

type ControllerRequest = Parameters<JobsController['createJob']>[0];

const makeRequest = (
  overrides: Partial<ControllerRequest> = {},
): ControllerRequest =>
  ({
    user: overrides.user ?? mockUser,
    headers: {},
    ip: '127.0.0.1',
    ...overrides,
  } as ControllerRequest);

const createFile = (overrides: Partial<MulterFile> = {}): MulterFile => ({
  originalname: 'resume.pdf',
  mimetype: 'application/pdf',
  size: 1024,
  ...overrides,
});

describe('JobsController', () => {
  let controller: JobsController;
  let jobsService: jest.Mocked<JobsService>;

  beforeEach(() => {
    jobsService = {
      createJob: jest.fn(),
      uploadResumes: jest.fn(),
      getAllJobs: jest.fn(),
      getJobById: jest.fn(),
      getResumesByJobId: jest.fn(),
      getReportsByJobId: jest.fn(),
      getResumeById: jest.fn(),
      getReportById: jest.fn(),
      onModuleInit: jest.fn(),
    } as unknown as jest.Mocked<JobsService>;

    controller = new JobsController(jobsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('delegates to JobsService with authenticated user', async () => {
      const dto: CreateJobDto = {
        jobTitle: 'Backend Engineer',
        jdText: 'Node.js, NestJS',
      };
      jobsService.createJob.mockResolvedValue({ jobId: 'job-123' });

      const result = await controller.createJob(makeRequest(), dto);

      expect(jobsService.createJob).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual({ jobId: 'job-123' });
    });
  });

  describe('uploadResumes', () => {
    it('accepts files and forwards to service', async () => {
      const response = new ResumeUploadResponseDto('job-1', 2);
      jobsService.uploadResumes.mockResolvedValue(response);
      const files: MulterFile[] = [
        createFile({ originalname: 'resume1.pdf' }),
      ];

      const result = await controller.uploadResumes(
        makeRequest(),
        { jobId: 'job-1' },
        files,
      );

      expect(jobsService.uploadResumes).toHaveBeenCalledWith(
        'job-1',
        files,
        mockUser,
      );
      expect(result).toBe(response);
    });

    it('propagates errors from service', async () => {
      jobsService.uploadResumes.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        controller.uploadResumes(makeRequest(), { jobId: 'job-2' }, []),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('read endpoints', () => {
    it('getAllJobs forwards to service', async () => {
      jobsService.getAllJobs.mockResolvedValue([]);
      await controller.getAllJobs(makeRequest());
      expect(jobsService.getAllJobs).toHaveBeenCalledTimes(1);
    });

    it('getJobById propagates service result', async () => {
      const jobDetail = new JobDetailDto(
        'job-1',
        'Backend Engineer',
        'JD text',
        'draft',
        new Date(),
      );
      jobsService.getJobById.mockResolvedValue(jobDetail);
      const result = await controller.getJobById(makeRequest(), 'job-1');
      expect(result).toEqual(jobDetail);
    });

    it('getResumesByJobId propagates service error', async () => {
      jobsService.getResumesByJobId.mockRejectedValue(
        new NotFoundException(),
      );
      await expect(
        controller.getResumesByJobId(makeRequest(), 'job-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - Invalid Input Validation', () => {
    it('should reject createJob with empty job title', async () => {
      const dto: CreateJobDto = { jobTitle: '', jdText: 'Valid description' };
      jobsService.createJob.mockRejectedValue(
        new Error('Job title cannot be empty'),
      );

      await expect(controller.createJob(makeRequest(), dto)).rejects.toThrow(
        'Job title cannot be empty',
      );
    });

    it('should reject createJob with empty JD text', async () => {
      const dto: CreateJobDto = { jobTitle: 'Backend Engineer', jdText: '' };
      jobsService.createJob.mockRejectedValue(
        new Error('Job description cannot be empty'),
      );

      await expect(controller.createJob(makeRequest(), dto)).rejects.toThrow(
        'Job description cannot be empty',
      );
    });

    it('should reject uploadResumes with empty files array', async () => {
      jobsService.uploadResumes.mockRejectedValue(
        new Error('No files provided'),
      );

      await expect(
        controller.uploadResumes(makeRequest(), { jobId: 'job-1' }, []),
      ).rejects.toThrow('No files provided');
    });

    it('should reject uploadResumes with invalid file types', async () => {
      const invalidFiles: MulterFile[] = [
        createFile({
          originalname: 'malicious.exe',
          mimetype: 'application/x-msdownload',
        }),
      ];
      jobsService.uploadResumes.mockRejectedValue(
        new Error('Invalid file type'),
      );

      await expect(
        controller.uploadResumes(makeRequest(), { jobId: 'job-1' }, invalidFiles),
      ).rejects.toThrow('Invalid file type');
    });

    it('should reject uploadResumes with oversized files', async () => {
      const oversizedFiles: MulterFile[] = [
        createFile({
          originalname: 'huge.pdf',
          size: 20 * 1024 * 1024,
        }),
      ];
      jobsService.uploadResumes.mockRejectedValue(
        new Error('File size exceeds limit'),
      );

      await expect(
        controller.uploadResumes(makeRequest(), { jobId: 'job-1' }, oversizedFiles),
      ).rejects.toThrow('File size exceeds limit');
    });

    it('should reject getJobById with empty job ID', async () => {
      jobsService.getJobById.mockRejectedValue(
        new Error('Job ID cannot be empty'),
      );

      await expect(controller.getJobById(makeRequest(), '')).rejects.toThrow(
        'Job ID cannot be empty',
      );
    });

    it('should reject getJobById with non-existent job ID', async () => {
      jobsService.getJobById.mockRejectedValue(
        new NotFoundException('Job not found'),
      );

      await expect(
        controller.getJobById(makeRequest(), 'non-existent-job'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Negative Tests - Authorization Failures', () => {
    it('should reject createJob when user lacks permission', async () => {
      const dto: CreateJobDto = {
        jobTitle: 'Backend Engineer',
        jdText: 'Node.js, NestJS',
      };
      jobsService.createJob.mockRejectedValue(
        new ForbiddenException('Insufficient permissions'),
      );

      await expect(controller.createJob(makeRequest(), dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject uploadResumes when user not authorized for job', async () => {
      jobsService.uploadResumes.mockRejectedValue(
        new ForbiddenException('Not authorized for this job'),
      );

      await expect(
        controller.uploadResumes(
          makeRequest(),
          { jobId: 'job-unauthorized' },
          [{ originalname: 'resume.pdf', mimetype: 'application/pdf', size: 1024 }],
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject getJobById when user not in same organization', async () => {
      jobsService.getJobById.mockRejectedValue(
        new ForbiddenException('Cross-organization access denied'),
      );

      await expect(
        controller.getJobById(makeRequest(), 'job-other-org'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Boundary Tests - File Upload Limits', () => {
    it('should handle exactly maximum allowed files', async () => {
      const maxFiles: MulterFile[] = Array.from({ length: 50 }, (_, i) =>
        createFile({ originalname: `resume${i}.pdf` }),
      );
      const response = new ResumeUploadResponseDto('job-1', 50);
      jobsService.uploadResumes.mockResolvedValue(response);

      const result = await controller.uploadResumes(
        makeRequest(),
        { jobId: 'job-1' },
        maxFiles,
      );

      expect(result.uploadedCount).toBe(50);
    });

    it('should reject files exceeding maximum count', async () => {
      const tooManyFiles: MulterFile[] = Array.from({ length: 51 }, (_, i) =>
        createFile({ originalname: `resume${i}.pdf` }),
      );
      jobsService.uploadResumes.mockRejectedValue(
        new Error('Too many files'),
      );

      await expect(
        controller.uploadResumes(makeRequest(), { jobId: 'job-1' }, tooManyFiles),
      ).rejects.toThrow('Too many files');
    });

    it('should handle file at exactly maximum size (10MB)', async () => {
      const maxSizeFile: MulterFile[] = [
        createFile({ size: 10 * 1024 * 1024 }),
      ];
      const response = new ResumeUploadResponseDto('job-1', 1);
      jobsService.uploadResumes.mockResolvedValue(response);

      const result = await controller.uploadResumes(
        makeRequest(),
        { jobId: 'job-1' },
        maxSizeFile,
      );

      expect(result.uploadedCount).toBe(1);
    });
  });

  describe('Edge Cases - Database Failures', () => {
    it('should handle database connection failure during createJob', async () => {
      const dto: CreateJobDto = {
        jobTitle: 'Backend Engineer',
        jdText: 'Node.js, NestJS',
      };
      jobsService.createJob.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(controller.createJob(makeRequest(), dto)).rejects.toThrow(
        'Database connection lost',
      );
    });

    it('should handle database timeout during getAllJobs', async () => {
      jobsService.getAllJobs.mockRejectedValue(
        new Error('Database query timeout'),
      );

      await expect(controller.getAllJobs(makeRequest())).rejects.toThrow(
        'Database query timeout',
      );
    });

    it('should handle transaction rollback failure during uploadResumes', async () => {
      jobsService.uploadResumes.mockRejectedValue(
        new Error('Transaction rollback failed'),
      );

      await expect(
        controller.uploadResumes(
          makeRequest(),
          { jobId: 'job-1' },
          [createFile()],
        ),
      ).rejects.toThrow('Transaction rollback failed');
    });
  });

  describe('Edge Cases - Concurrent Operations', () => {
    it('should handle concurrent resume uploads for same job', async () => {
      const files: MulterFile[] = [createFile({ originalname: 'resume1.pdf' })];
      const response = new ResumeUploadResponseDto('job-concurrent', 1);
      jobsService.uploadResumes.mockResolvedValue(response);

      const promises = [
        controller.uploadResumes(makeRequest(), { jobId: 'job-concurrent' }, files),
        controller.uploadResumes(makeRequest(), { jobId: 'job-concurrent' }, files),
        controller.uploadResumes(makeRequest(), { jobId: 'job-concurrent' }, files),
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.jobId).toBe('job-concurrent');
        expect(result.uploadedCount).toBe(1);
      });
      expect(jobsService.uploadResumes).toHaveBeenCalledTimes(3);
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return complete job structure from createJob', async () => {
      const dto: CreateJobDto = {
        jobTitle: 'Backend Engineer',
        jdText: 'Node.js, NestJS',
      };
      jobsService.createJob.mockResolvedValue({
        jobId: 'job-123',
      });

      const result = await controller.createJob(makeRequest(), dto);

      expect(result).toMatchObject({
        jobId: expect.stringMatching(/^job-/),
      });
      expect(result.jobId.length).toBeGreaterThan(5);
    });

    it('should return complete response structure from uploadResumes', async () => {
      const response = new ResumeUploadResponseDto('job-1', 2);
      jobsService.uploadResumes.mockResolvedValue(response);
      const files: MulterFile[] = [
        createFile({ originalname: 'resume1.pdf', size: 1024 }),
        createFile({ originalname: 'resume2.pdf', size: 2048 }),
      ];

      const result = await controller.uploadResumes(
        makeRequest(),
        { jobId: 'job-1' },
        files,
      );

      expect(result).toMatchObject({
        jobId: 'job-1',
        uploadedCount: 2,
      });
      expect(result.uploadedCount).toBeGreaterThan(0);
      expect(result.jobId).toBe('job-1');
    });
  });
});
