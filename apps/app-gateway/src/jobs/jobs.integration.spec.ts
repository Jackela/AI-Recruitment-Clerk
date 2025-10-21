import { randomUUID } from 'crypto';
import { JobsService } from './jobs.service';
import { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import { CreateJobDto } from './dto/create-job.dto';
import {
  UserDto,
  UserRole,
} from '@ai-recruitment-clerk/user-management-domain';
import { CacheService } from '../cache/cache.service';
import { JobRepository } from '../repositories/job.repository';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { ConfigService } from '@nestjs/config';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';

const createJobsServiceForTest = () => {
  const jobs = new Map<string, any>();

  const jobRepository = {
    create: jest.fn(async (job) => {
      const id = `job-${randomUUID()}`;
      const document = { ...job, _id: id, id };
      jobs.set(id, document);
      return document as any;
    }),
    findById: jest.fn(async (id: string) => jobs.get(id) ?? null),
    findAll: jest.fn(async () => Array.from(jobs.values()) as any[]),
    updateStatus: jest.fn(async (id: string, status: string) => {
      const job = jobs.get(id);
      if (job) {
        job.status = status;
      }
      return job ?? null;
    }),
    updateJdAnalysis: jest.fn(async () => null),
  } as unknown as jest.Mocked<JobRepository>;

  const natsClient: jest.Mocked<AppGatewayNatsService> = {
    publishJobJdSubmitted: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'msg-job',
    }),
    publishResumeSubmitted: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'msg-resume',
    }),
    waitForAnalysisParsed: jest.fn(),
    publish: jest.fn(),
    emit: jest.fn(),
    isConnected: true,
    getHealthStatus: jest.fn(),
    subscribeToAnalysisCompleted: jest.fn(),
    subscribeToAnalysisFailed: jest.fn(),
  } as any;

  const cacheService: jest.Mocked<CacheService> = {
    generateKey: jest.fn((prefix: string, ...parts: string[]) =>
      [prefix, ...parts].join(':'),
    ),
    wrap: jest.fn(async (_key, fn) => fn()),
    wrapSemantic: jest.fn(async (_text, fn) => fn()),
    wrapSemanticBatch: jest.fn(async (_items, fn) => fn()),
    set: jest.fn(),
    get: jest.fn(),
  } as any;

  const webSocketGateway: jest.Mocked<WebSocketGateway> = {
    emitJobUpdated: jest.fn(),
    emitJobReportUpdated: jest.fn(),
    emitJobResumeUpdated: jest.fn(),
    emitJobDeleted: jest.fn(),
    emitJobCreated: jest.fn(),
    emitHealthStatus: jest.fn(),
  } as any;

  const configService: jest.Mocked<ConfigService> = {
    get: jest.fn(() => undefined),
  } as any;

  const service = new JobsService(
    jobRepository as JobRepository,
    natsClient,
    cacheService,
    webSocketGateway,
    configService,
  );

  return {
    service,
    jobRepository,
    natsClient,
    cacheService,
    webSocketGateway,
    reset: () => jobs.clear(),
  };
};

describe('JobsService integration-style behaviour', () => {
  const mockUser: UserDto = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.HR_MANAGER,
    organizationId: 'org-1',
    isActive: true,
    createdAt: new Date(),
  };

  let service: JobsService;
  let jobRepository: ReturnType<typeof createJobsServiceForTest>['jobRepository'];
  let natsClient: ReturnType<typeof createJobsServiceForTest>['natsClient'];
  let webSocketGateway: ReturnType<
    typeof createJobsServiceForTest
  >['webSocketGateway'];
  let reset: () => void;

  beforeEach(() => {
    ({
      service,
      jobRepository,
      natsClient,
      webSocketGateway,
      reset,
    } = createJobsServiceForTest());
  });

  afterEach(() => {
    jest.clearAllMocks();
    reset();
  });

  describe('createJob', () => {
    it('stores job and publishes JD submitted event', async () => {
      const dto: CreateJobDto = {
        jobTitle: 'Senior Software Engineer',
        jdText: 'Deep TypeScript and NestJS knowledge required.',
      };

      const result = await service.createJob(dto, mockUser);

      expect(result.jobId).toEqual(expect.any(String));
      expect(natsClient.publishJobJdSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: result.jobId,
          jobTitle: dto.jobTitle,
          jdText: dto.jdText,
        }),
      );

      const stored = await service.getJobById(result.jobId);
      expect(stored?.title).toBe(dto.jobTitle);
      expect(stored?.status).toBe('processing');
    });

    it('propagates publish failure and marks job as failed', async () => {
      natsClient.publishJobJdSubmitted.mockResolvedValueOnce({
        success: false,
        error: 'Connection failed',
      });

      const dto: CreateJobDto = {
        jobTitle: 'Failing Job',
        jdText: 'This publish will fail',
      };

      await expect(service.createJob(dto, mockUser)).rejects.toThrow(
        'Failed to initiate job analysis',
      );
      expect(jobRepository.updateStatus).toHaveBeenCalledWith(
        expect.any(String),
        'failed',
      );
    });
  });

  describe('uploadResumes', () => {
    it('publishes resume submitted events for each file', async () => {
      const { jobId } = await service.createJob(
        { jobTitle: 'Resume Job', jdText: 'Needs resumes' },
        mockUser,
      );

      const files = [
        {
          fieldname: 'resumes',
          originalname: 'john_doe_resume.pdf',
          mimetype: 'application/pdf',
          size: 12345,
          buffer: Buffer.from('resume 1'),
        },
        {
          fieldname: 'resumes',
          originalname: 'jane_smith_cv.pdf',
          mimetype: 'application/pdf',
          size: 23456,
          buffer: Buffer.from('resume 2'),
        },
      ] as any;

      const result = await service.uploadResumes(jobId, files, mockUser);

      expect(result).toBeInstanceOf(ResumeUploadResponseDto);
      expect(result.jobId).toBe(jobId);
      expect(result.uploadedCount).toBe(2);
      expect(natsClient.publishResumeSubmitted).toHaveBeenCalledTimes(2);
      expect(webSocketGateway.emitJobUpdated).toHaveBeenCalled();
    });

    it('returns zero uploaded when files array is empty', async () => {
      const result = await service.uploadResumes('job-123', [], mockUser);
      expect(result.uploadedCount).toBe(0);
      expect(natsClient.publishResumeSubmitted).not.toHaveBeenCalled();
    });

    it('throws when uploading resumes for missing job', async () => {
      const files = [
        {
          fieldname: 'resumes',
          originalname: 'resume.pdf',
          mimetype: 'application/pdf',
          size: 123,
          buffer: Buffer.from('content'),
        },
      ] as any;

      await expect(
        service.uploadResumes('missing-job', files, mockUser),
      ).rejects.toThrow('Job with ID missing-job not found');
    });
  });
});
