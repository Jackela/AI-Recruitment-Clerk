import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import type { JobRepository } from '../repositories/job.repository';
import type { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import type { CacheService } from '../cache/cache.service';
import type { WebSocketGateway } from '../websocket/websocket.gateway';
import type { ConfigService } from '@nestjs/config';
import { MulterFile } from './types/multer.types';
import type { JobDocument } from '../schemas/job.schema';
import { UserRole } from '@ai-recruitment-clerk/user-management-domain';
import type { UserDto } from '@ai-recruitment-clerk/user-management-domain';

const JOB_REPOSITORY_TOKEN = 'JobRepository';
const NATS_CLIENT_TOKEN = 'AppGatewayNatsService';
const CACHE_SERVICE_TOKEN = 'CacheService';
const WEBSOCKET_GATEWAY_TOKEN = 'WebSocketGateway';
const CONFIG_SERVICE_TOKEN = 'ConfigService';

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

const createMockFile = (overrides = {}): MulterFile =>
  new MulterFile({
    originalname: 'resume.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test'),
    ...overrides,
  });

describe('JobsService - Edge Cases', () => {
  let service: JobsService;
  let jobRepository: jest.Mocked<ReturnType<typeof mockJobRepository>>;
  let natsClient: jest.Mocked<ReturnType<typeof mockNatsClient>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: JOB_REPOSITORY_TOKEN, useValue: mockJobRepository() },
        { provide: NATS_CLIENT_TOKEN, useValue: mockNatsClient() },
        { provide: CACHE_SERVICE_TOKEN, useValue: mockCacheService() },
        { provide: WEBSOCKET_GATEWAY_TOKEN, useValue: mockWebSocketGateway() },
        { provide: CONFIG_SERVICE_TOKEN, useValue: mockConfigService() },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jobRepository = module.get(JOB_REPOSITORY_TOKEN);
    natsClient = module.get(NATS_CLIENT_TOKEN);
  });

  describe('Empty Data Edge Cases', () => {
    it('should create job with empty job title', async () => {
      const user = createMockUser();
      const mockJob = createMockJob({ title: '' });
      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: '', jdText: 'Valid description' },
        user,
      );

      expect(result).toHaveProperty('jobId');
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: '' }),
      );
    });

    it('should handle job creation with null jdText', async () => {
      const user = createMockUser();
      const mockJob = createMockJob({ description: null as any });
      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: 'Test', jdText: null as any },
        user,
      );

      expect(result).toHaveProperty('jobId');
    });

    it('should return zero count when uploading empty file array', async () => {
      const jobId = 'job-123';
      const user = createMockUser();

      const result = await service.uploadResumes(jobId, [], user);

      expect(result.submittedResumes).toBe(0);
      expect(jobRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle undefined jobId in getJobById', async () => {
      jobRepository.findById.mockResolvedValue(null);

      await expect(service.getJobById(undefined as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle empty string jobId', async () => {
      jobRepository.findById.mockResolvedValue(null);

      await expect(service.getJobById('')).rejects.toThrow(NotFoundException);
    });

    it('should handle null user organization', async () => {
      const user = createMockUser({ organizationId: null as any });
      const mockJob = createMockJob({ organizationId: 'org-123' });
      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);

      await expect(
        service.uploadResumes('job-123', [createMockFile()], user),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Boundary Value Edge Cases', () => {
    it('should create job with very long title (1000+ characters)', async () => {
      const user = createMockUser();
      const longTitle = 'A'.repeat(1001);
      const mockJob = createMockJob({ title: longTitle });
      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: longTitle, jdText: 'Description' },
        user,
      );

      expect(result).toHaveProperty('jobId');
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: longTitle }),
      );
    });

    it('should create job with maximum length JD text (10000 characters)', async () => {
      const user = createMockUser();
      const longJD = 'B'.repeat(10000);
      const mockJob = createMockJob({ description: longJD });
      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: 'Test', jdText: longJD },
        user,
      );

      expect(result).toHaveProperty('jobId');
    });

    it('should create job with unicode characters in title', async () => {
      const user = createMockUser();
      const unicodeTitle = '软件工程师 💻 مرحبا שלום 🚀';
      const mockJob = createMockJob({ title: unicodeTitle });
      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: unicodeTitle, jdText: 'Description' },
        user,
      );

      expect(result).toHaveProperty('jobId');
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: unicodeTitle }),
      );
    });

    it('should handle empty string description', async () => {
      const user = createMockUser();
      const mockJob = createMockJob({ description: '' });
      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: 'Test', jdText: '' },
        user,
      );

      expect(result).toHaveProperty('jobId');
    });

    it('should handle single character title', async () => {
      const user = createMockUser();
      const mockJob = createMockJob({ title: 'X' });
      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: 'X', jdText: 'Description' },
        user,
      );

      expect(result).toHaveProperty('jobId');
    });

    it('should handle resume upload with maximum file size', async () => {
      const jobId = 'job-123';
      const user = createMockUser();
      const mockJob = createMockJob();
      const largeFile = createMockFile({ size: 10 * 1024 * 1024 }); // 10MB

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.uploadResumes(jobId, [largeFile], user);

      expect(result.submittedResumes).toBe(1);
    });
  });

  describe('Concurrent Operation Edge Cases', () => {
    it('should handle concurrent job creation by same user', async () => {
      const user = createMockUser();
      const mockJobs = [
        createMockJob({ _id: { toString: () => 'job-1' } as any, id: 'job-1' }),
        createMockJob({ _id: { toString: () => 'job-2' } as any, id: 'job-2' }),
        createMockJob({ _id: { toString: () => 'job-3' } as any, id: 'job-3' }),
      ];

      jobRepository.create
        .mockResolvedValueOnce(mockJobs[0] as JobDocument)
        .mockResolvedValueOnce(mockJobs[1] as JobDocument)
        .mockResolvedValueOnce(mockJobs[2] as JobDocument);

      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const promises = Array(3)
        .fill(null)
        .map((_, i) =>
          service.createJob(
            { jobTitle: `Job ${i}`, jdText: 'Description' },
            user,
          ),
        );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      const jobIds = results.map((r) => r.jobId);
      expect(new Set(jobIds).size).toBe(3); // All unique
    });

    it('should handle concurrent resume uploads to same job', async () => {
      const jobId = 'job-123';
      const user = createMockUser();
      const mockJob = createMockJob();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const files = Array(5)
        .fill(null)
        .map((_, i) => createMockFile({ originalname: `resume${i}.pdf` }));

      const result = await service.uploadResumes(jobId, files, user);

      expect(result.submittedResumes).toBe(5);
      expect(natsClient.publishResumeSubmitted).toHaveBeenCalledTimes(5);
    });

    it('should handle concurrent getAllJobs calls', async () => {
      const mockJobs = Array(10)
        .fill(null)
        .map((_, i) =>
          createMockJob({
            _id: { toString: () => `job-${i}` } as any,
            id: `job-${i}`,
            title: `Job ${i}`,
          }),
        );

      jobRepository.findAll.mockResolvedValue(mockJobs as JobDocument[]);

      const promises = Array(5)
        .fill(null)
        .map(() => service.getAllJobs());
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveLength(10);
      });
    });
  });

  describe('Timeout Edge Cases', () => {
    it('should handle slow database response during job creation', async () => {
      const user = createMockUser();
      const mockJob = createMockJob();

      jobRepository.create.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockJob as JobDocument), 100),
          ),
      );
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: 'Test', jdText: 'Description' },
        user,
      );

      expect(result).toHaveProperty('jobId');
    });

    it('should handle NATS timeout during job creation', async () => {
      const user = createMockUser();
      const mockJob = createMockJob();

      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue({
        ...mockJob,
        status: 'failed',
      } as JobDocument);
      natsClient.publishJobJdSubmitted.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('NATS timeout')), 100),
          ),
      );

      await expect(
        service.createJob({ jobTitle: 'Test', jdText: 'Description' }, user),
      ).rejects.toThrow('Failed to initiate job analysis');

      expect(jobRepository.updateStatus).toHaveBeenCalledWith(
        'job-123',
        'failed',
      );
    });

    it('should handle slow job retrieval', async () => {
      const mockJob = createMockJob();

      jobRepository.findById.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockJob as JobDocument), 100),
          ),
      );

      const result = await service.getJobById('job-123');

      expect(result).toHaveProperty('id', 'job-123');
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle whitespace-only job title', async () => {
      const user = createMockUser();
      const mockJob = createMockJob({ title: '   \t\n  ' });
      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: '   \t\n  ', jdText: 'Description' },
        user,
      );

      expect(result).toHaveProperty('jobId');
    });

    it('should handle JD text with SQL injection patterns', async () => {
      const user = createMockUser();
      const sqlInjectionJD =
        "'; DROP TABLE jobs; -- \" OR 1=1; DELETE FROM users WHERE '1'='1";
      const mockJob = createMockJob({ description: sqlInjectionJD });
      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: 'Test', jdText: sqlInjectionJD },
        user,
      );

      expect(result).toHaveProperty('jobId');
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: sqlInjectionJD }),
      );
    });

    it('should handle job ID with special characters', async () => {
      const specialJobId = '../../../etc/passwd';
      jobRepository.findById.mockResolvedValue(null);

      await expect(service.getJobById(specialJobId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle job ID with unicode characters', async () => {
      const unicodeJobId = 'job-测试-🚀-مرحبا';
      jobRepository.findById.mockResolvedValue(null);

      await expect(service.getJobById(unicodeJobId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle resume filename with path traversal', async () => {
      const jobId = 'job-123';
      const user = createMockUser();
      const mockJob = createMockJob();
      const maliciousFile = createMockFile({
        originalname: '../../../etc/passwd.pdf',
      });

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishResumeSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.uploadResumes(jobId, [maliciousFile], user);

      expect(result.submittedResumes).toBe(1);
    });

    it('should handle XSS attempt in job title', async () => {
      const user = createMockUser();
      const xssTitle = '<script>alert("XSS")</script>';
      const mockJob = createMockJob({ title: xssTitle });
      jobRepository.create.mockResolvedValue(mockJob as JobDocument);
      natsClient.publishJobJdSubmitted.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.createJob(
        { jobTitle: xssTitle, jdText: 'Description' },
        user,
      );

      expect(result).toHaveProperty('jobId');
    });
  });
});
