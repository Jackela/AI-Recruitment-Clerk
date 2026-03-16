import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import type { CreateJobDto } from './dto/create-job.dto';
import type { JobRepository } from '../repositories/job.repository';
import type { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import type { CacheService } from '../cache/cache.service';
import type { WebSocketGateway } from '../websocket/websocket.gateway';
import type { ConfigService } from '@nestjs/config';
import { MulterFile } from './types/multer.types';
import type { JobDocument } from '../schemas/job.schema';
import { UserRole } from '@ai-recruitment-clerk/user-management-domain';
import type { UserDto } from '@ai-recruitment-clerk/user-management-domain';

// Token constants for injection
const JOB_REPOSITORY_TOKEN = 'JobRepository';
const NATS_CLIENT_TOKEN = 'AppGatewayNatsService';
const CACHE_SERVICE_TOKEN = 'CacheService';
const WEBSOCKET_GATEWAY_TOKEN = 'WebSocketGateway';
const CONFIG_SERVICE_TOKEN = 'ConfigService';

// Mock JobsSemanticCacheService
jest.mock('./services/jobs-semantic-cache.service', () => ({
  JobsSemanticCacheService: jest.fn().mockImplementation(() => ({
    isEnabled: jest.fn().mockReturnValue(false),
    tryGetSemanticCache: jest.fn().mockResolvedValue(null),
    getJobId: jest.fn((job) => job._id?.toString() || job.id || 'mock-job-id'),
    registerSemanticCacheEntry: jest.fn().mockResolvedValue(undefined),
    refreshSemanticCacheEntry: jest.fn().mockResolvedValue(undefined),
    buildSemanticCacheOptions: jest.fn().mockReturnValue({}),
  })),
}));

// Mock JobsEventService
jest.mock('./services/jobs-event.service', () => ({
  JobsEventService: jest.fn().mockImplementation(() => ({
    initializeSubscriptions: jest.fn().mockResolvedValue(undefined),
    emitJobUpdatedEvent: jest.fn().mockResolvedValue(undefined),
  })),
}));

const mockJobRepository = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  updateStatus: jest.fn(),
  updateJdAnalysis: jest.fn(),
  deleteById: jest.fn(),
});

const mockNatsClient = () => ({
  publishJobJdSubmitted: jest.fn(),
  publishResumeSubmitted: jest.fn(),
  subscribeToAnalysisCompleted: jest.fn().mockResolvedValue(undefined),
  subscribeToAnalysisFailed: jest.fn().mockResolvedValue(undefined),
});

const mockCacheService = () => ({
  generateKey: jest.fn((...args) => args.join(':')),
  wrap: jest.fn((key, fn) => fn()),
  del: jest.fn().mockResolvedValue(undefined),
  getJobQueryKey: jest.fn((opts) => JSON.stringify(opts)),
});

const mockWebSocketGateway = () => ({
  emitJobUpdated: jest.fn(),
});

const mockConfigService = () => ({
  get: jest.fn().mockImplementation((key: string) => {
    const config: Record<string, string> = {
      SEMANTIC_CACHE_ENABLED: 'false',
      SEMANTIC_CACHE_SIMILARITY_THRESHOLD: '0.92',
    };
    return config[key];
  }),
});

const createMockUser = (overrides = {}): UserDto => ({
  id: 'user-123',
  email: 'test@example.com',
  role: UserRole.USER,
  organizationId: 'org-123',
  ...overrides,
});

const createMockJob = (overrides = {}): Partial<JobDocument> => ({
  _id: { toString: () => 'job-123' } as any,
  id: 'job-123',
  title: 'Software Engineer',
  description: 'Job description',
  status: 'processing',
  company: 'Test Company',
  organizationId: 'org-123',
  createdBy: 'user-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const createCreateJobDto = (overrides = {}): CreateJobDto => ({
  jobTitle: 'Software Engineer',
  jdText:
    'We are looking for a skilled software engineer with experience in React and Node.js.',
  ...overrides,
});

const createMockFile = (overrides = {}): MulterFile =>
  new MulterFile({
    originalname: 'resume.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test'),
    ...overrides,
  });

describe('JobsService', () => {
  let service: JobsService;
  let jobRepository: jest.Mocked<ReturnType<typeof mockJobRepository>>;
  let natsClient: jest.Mocked<ReturnType<typeof mockNatsClient>>;
  let cacheService: jest.Mocked<ReturnType<typeof mockCacheService>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: JOB_REPOSITORY_TOKEN,
          useValue: mockJobRepository(),
        },
        {
          provide: NATS_CLIENT_TOKEN,
          useValue: mockNatsClient(),
        },
        {
          provide: CACHE_SERVICE_TOKEN,
          useValue: mockCacheService(),
        },
        {
          provide: WEBSOCKET_GATEWAY_TOKEN,
          useValue: mockWebSocketGateway(),
        },
        {
          provide: CONFIG_SERVICE_TOKEN,
          useValue: mockConfigService(),
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jobRepository = module.get(JOB_REPOSITORY_TOKEN);
    natsClient = module.get(NATS_CLIENT_TOKEN);
    cacheService = module.get(CACHE_SERVICE_TOKEN);
  });

  describe('createJob', () => {
    it('should create job with valid data', async () => {
      const dto = createCreateJobDto();
      const user = createMockUser();
      const mockJob = createMockJob();

      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(dto, user);

      expect(result).toHaveProperty('jobId');
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: dto.jobTitle,
          description: dto.jdText,
          status: 'processing',
          createdBy: user.id,
          company: user.organizationId,
          organizationId: user.organizationId,
        }),
      );
      expect(natsClient.publishJobJdSubmitted).toHaveBeenCalled();
    });

    it('should create job with default company when organizationId is undefined', async () => {
      const dto = createCreateJobDto();
      const user = createMockUser({ organizationId: undefined });
      const mockJob = createMockJob({ company: 'Unknown' });

      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(dto, user);

      expect(result).toHaveProperty('jobId');
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company: 'Unknown',
        }),
      );
    });

    it('should handle NATS publish failure and update job status to failed', async () => {
      const dto = createCreateJobDto();
      const user = createMockUser();
      const mockJob = createMockJob();

      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue({
        ...mockJob,
        status: 'failed',
      } as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: false,
        error: 'Connection failed',
      });

      await expect(service.createJob(dto, user)).rejects.toThrow(
        'Failed to initiate job analysis',
      );
      expect(jobRepository.updateStatus).toHaveBeenCalledWith(
        'job-123',
        'failed',
      );
    });

    it('should handle NATS publish exception and update job status to failed', async () => {
      const dto = createCreateJobDto();
      const user = createMockUser();
      const mockJob = createMockJob();

      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue({
        ...mockJob,
        status: 'failed',
      } as JobDocument);
      natsClient.publishJobJdSubmitted.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(service.createJob(dto, user)).rejects.toThrow(
        'Failed to initiate job analysis',
      );
      expect(jobRepository.updateStatus).toHaveBeenCalledWith(
        'job-123',
        'failed',
      );
    });

    it('should propagate error when job creation fails', async () => {
      const dto = createCreateJobDto();
      const user = createMockUser();
      const error = new Error('Database error');

      jobRepository.create.mockRejectedValue(error);

      await expect(service.createJob(dto, user)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('uploadResumes', () => {
    it('should upload resumes successfully', async () => {
      const jobId = 'job-123';
      const files = [
        createMockFile(),
        createMockFile({ originalname: 'resume2.pdf' }),
      ];
      const user = createMockUser();
      const mockJob = createMockJob();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.uploadResumes(jobId, files, user);

      expect(result.jobId).toBe(jobId);
      expect(result.submittedResumes).toBe(2);
      expect(natsClient.publishResumeSubmitted).toHaveBeenCalledTimes(2);
    });

    it('should return zero count when no files provided', async () => {
      const jobId = 'job-123';
      const user = createMockUser();

      const result = await service.uploadResumes(jobId, [], user);

      expect(result.submittedResumes).toBe(0);
      expect(jobRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when job not found', async () => {
      const jobId = 'job-123';
      const files = [createMockFile()];
      const user = createMockUser();

      jobRepository.findById.mockResolvedValue(null);

      await expect(service.uploadResumes(jobId, files, user)).rejects.toThrow(
        new NotFoundException(`Job with ID ${jobId} not found`),
      );
    });

    it('should throw ForbiddenException when user has no access to job', async () => {
      const jobId = 'job-123';
      const files = [createMockFile()];
      const user = createMockUser({
        organizationId: 'org-456',
        role: UserRole.USER,
      });
      const mockJob = createMockJob({ organizationId: 'org-123' });

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);

      await expect(service.uploadResumes(jobId, files, user)).rejects.toThrow(
        new ForbiddenException('Access denied to this job'),
      );
    });

    it('should allow admin access to any job regardless of organization', async () => {
      const jobId = 'job-123';
      const files = [createMockFile()];
      const user = createMockUser({
        organizationId: 'org-456',
        role: UserRole.ADMIN,
        rawRole: 'admin',
      });
      const mockJob = createMockJob({ organizationId: 'org-123' });

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.uploadResumes(jobId, files, user);

      expect(result.submittedResumes).toBe(1);
    });

    it('should handle partial failures when publishing resume events', async () => {
      const jobId = 'job-123';
      const files = [
        createMockFile(),
        createMockFile({ originalname: 'resume2.pdf' }),
      ];
      const user = createMockUser();
      const mockJob = createMockJob();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishResumeSubmitted
        .mockResolvedValueOnce({ success: true, messageId: 'msg-1' })
        .mockResolvedValueOnce({ success: false, error: 'Failed' });

      const result = await service.uploadResumes(jobId, files, user);

      expect(result.submittedResumes).toBe(1);
    });

    it('should handle exceptions when publishing resume events', async () => {
      const jobId = 'job-123';
      const files = [createMockFile()];
      const user = createMockUser();
      const mockJob = createMockJob();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishResumeSubmitted.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.uploadResumes(jobId, files, user);

      expect(result.submittedResumes).toBe(0);
    });
  });

  describe('getAllJobs', () => {
    it('should return all jobs from cache or repository', async () => {
      const mockJobs = [
        createMockJob({
          _id: { toString: () => 'job-1' } as any,
          id: 'job-1',
          title: 'Job 1',
        }),
        createMockJob({
          _id: { toString: () => 'job-2' } as any,
          id: 'job-2',
          title: 'Job 2',
        }),
      ];

      jobRepository.findAll.mockResolvedValue(mockJobs as JobDocument[]);

      const result = await service.getAllJobs();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('status');
    });

    it('should use cache service for caching', async () => {
      const mockJobs = [createMockJob()];

      jobRepository.findAll.mockResolvedValue(mockJobs as JobDocument[]);
      cacheService.wrap.mockImplementation(async (key, fn) => fn());

      await service.getAllJobs();

      expect(cacheService.generateKey).toHaveBeenCalledWith('jobs', 'list');
      expect(cacheService.wrap).toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      jobRepository.findAll.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllJobs()).rejects.toThrow('Database error');
    });
  });

  describe('getJobById', () => {
    it('should return job details when found', async () => {
      const jobId = 'job-123';
      const mockJob = createMockJob();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);

      const result = await service.getJobById(jobId);

      expect(result).toHaveProperty('id', jobId);
      expect(result).toHaveProperty('title', mockJob.title);
      expect(result).toHaveProperty('jdText', mockJob.description);
      expect(result).toHaveProperty('status', mockJob.status);
    });

    it('should throw NotFoundException when job not found', async () => {
      const jobId = 'job-123';

      jobRepository.findById.mockResolvedValue(null);

      await expect(service.getJobById(jobId)).rejects.toThrow(
        new NotFoundException(`Job with ID ${jobId} not found`),
      );
    });

    it('should handle repository errors', async () => {
      const jobId = 'job-123';

      jobRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(service.getJobById(jobId)).rejects.toThrow('Database error');
    });
  });

  describe('getResumesByJobId', () => {
    it('should return empty array when job exists', async () => {
      const jobId = 'job-123';
      const mockJob = createMockJob();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);

      const result = await service.getResumesByJobId(jobId);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when job not found', async () => {
      const jobId = 'job-123';

      jobRepository.findById.mockResolvedValue(null);

      await expect(service.getResumesByJobId(jobId)).rejects.toThrow(
        new NotFoundException(`Job with ID ${jobId} not found`),
      );
    });
  });

  describe('getResumeById', () => {
    it('should throw NotFoundException for any resumeId', async () => {
      await expect(service.getResumeById('resume-123')).rejects.toThrow(
        new NotFoundException(
          'Resume operations should be handled by ResumeService',
        ),
      );
    });
  });

  describe('getReportsByJobId', () => {
    it('should return reports list when job exists', async () => {
      const jobId = 'job-123';
      const mockJob = createMockJob();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);

      const result = await service.getReportsByJobId(jobId);

      expect(result).toHaveProperty('jobId', jobId);
      expect(result).toHaveProperty('reports');
      expect(result.reports).toEqual([]);
    });

    it('should throw NotFoundException when job not found', async () => {
      const jobId = 'job-123';

      jobRepository.findById.mockResolvedValue(null);

      await expect(service.getReportsByJobId(jobId)).rejects.toThrow(
        new NotFoundException(`Job with ID ${jobId} not found`),
      );
    });
  });

  describe('getReportById', () => {
    it('should throw NotFoundException for any reportId', async () => {
      await expect(service.getReportById('report-123')).rejects.toThrow(
        new NotFoundException(
          'Report operations should be handled by ReportService',
        ),
      );
    });
  });

  describe('onModuleInit', () => {
    it('should initialize event subscriptions', async () => {
      await service.onModuleInit();
      // The mock is set up in the mock factory above
    });
  });

  describe('hasAccessToResource', () => {
    it('should allow admin access to all resources', async () => {
      const adminUser = createMockUser({
        role: UserRole.ADMIN,
        rawRole: 'admin',
        organizationId: 'org-1',
      });
      const mockJob = createMockJob({ organizationId: 'org-2' });

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      // Should not throw ForbiddenException
      await expect(
        service.uploadResumes('job-123', [createMockFile()], adminUser),
      ).resolves.not.toThrow();
    });

    it('should deny access when user has different organization', async () => {
      const user = createMockUser({
        role: UserRole.USER,
        organizationId: 'org-1',
      });
      const mockJob = createMockJob({ organizationId: 'org-2' });

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);

      await expect(
        service.uploadResumes('job-123', [createMockFile()], user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when user has same organization', async () => {
      const user = createMockUser({
        role: UserRole.USER,
        organizationId: 'org-1',
      });
      const mockJob = createMockJob({ organizationId: 'org-1' });

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      await expect(
        service.uploadResumes('job-123', [createMockFile()], user),
      ).resolves.not.toThrow();
    });
  });
});
