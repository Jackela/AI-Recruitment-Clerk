import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import {
  Permission,
  UserDto,
  UserRole,
} from '@ai-recruitment-clerk/user-management-domain';

const mockUser: UserDto = {
  id: 'user-1',
  username: 'tester',
  email: 'tester@example.com',
  role: UserRole.HR_MANAGER,
  organizationId: 'org-1',
  isActive: true,
  createdAt: new Date(),
};

const makeRequest = (overrides: Partial<{ user: UserDto; permissions: Permission[] }> = {}) =>
  ({
    user: overrides.user ?? mockUser,
  } as any);

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
      const files: any[] = [
        { originalname: 'resume1.pdf', mimetype: 'application/pdf', size: 1024 },
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
        controller.uploadResumes(makeRequest(), { jobId: 'job-2' }, [] as any),
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
      jobsService.getJobById.mockResolvedValue({ id: 'job-1' } as any);
      const result = await controller.getJobById(makeRequest(), 'job-1');
      expect(result).toEqual({ id: 'job-1' });
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
});
