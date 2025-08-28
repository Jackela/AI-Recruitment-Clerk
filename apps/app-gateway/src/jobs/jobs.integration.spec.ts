import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { InMemoryStorageService } from './storage/in-memory-storage.service';
import { NatsClient } from '../nats/nats.client';
import { CreateJobDto } from './dto/create-job.dto';
import { UserDto, UserRole } from '@app/shared-dtos';

describe('Jobs Integration Tests', () => {
  let controller: JobsController;
  let service: JobsService;
  let natsClient: NatsClient;

  const mockUser: UserDto = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.HR_MANAGER,
    organizationId: 'org-1',
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockNatsClient = {
      isConnected: true,
      publishJobJdSubmitted: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-msg-1',
      }),
      publishResumeSubmitted: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-msg-2',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        JobsService,
        InMemoryStorageService,
        {
          provide: NatsClient,
          useValue: mockNatsClient,
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
    natsClient = module.get<NatsClient>(NatsClient);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(natsClient).toBeDefined();
  });

  describe('Job Creation Flow', () => {
    it('should create a job and publish NATS event', async () => {
      const createJobDto: CreateJobDto = {
        jobTitle: 'Senior Software Engineer',
        jdText: 'We are looking for a senior software engineer with 5+ years of experience in JavaScript, TypeScript, and Node.js. Experience with React and AWS is a plus.',
      };

      const result = await service.createJob(createJobDto, mockUser);

      expect(result).toBeDefined();
      expect(result.jobId).toBeDefined();
      expect(typeof result.jobId).toBe('string');

      // Verify NATS event was published
      expect(natsClient.publishJobJdSubmitted).toHaveBeenCalledWith({
        jobId: result.jobId,
        jobTitle: createJobDto.jobTitle,
        jdText: createJobDto.jdText,
        timestamp: expect.any(String),
      });

      // Verify job was stored
      const storedJob = service.getJobById(result.jobId);
      expect(storedJob).toBeDefined();
      expect(storedJob.title).toBe(createJobDto.jobTitle);
      expect(storedJob.jdText).toBe(createJobDto.jdText);
      expect(storedJob.status).toBe('processing');
    });

    it('should handle NATS publishing failure gracefully', async () => {
      const failingNatsClient = {
        ...natsClient,
        publishJobJdSubmitted: jest.fn().mockResolvedValue({
          success: false,
          error: 'Connection failed',
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [JobsController],
        providers: [
          JobsService,
          InMemoryStorageService,
          {
            provide: NatsClient,
            useValue: failingNatsClient,
          },
        ],
      }).compile();

      const testService = module.get<JobsService>(JobsService);

      const createJobDto: CreateJobDto = {
        jobTitle: 'Test Job',
        jdText: 'Test description',
      };

      const result = await testService.createJob(createJobDto, mockUser);

      expect(result).toBeDefined();
      expect(result.jobId).toBeDefined();

      // Verify job status is set to failed when NATS publishing fails
      const storedJob = testService.getJobById(result.jobId);
      expect(storedJob.status).toBe('failed');
    });
  });

  describe('Resume Upload Flow', () => {
    it('should upload resumes and publish NATS events', async () => {
      // First create a job
      const createJobDto: CreateJobDto = {
        jobTitle: 'Test Job',
        jdText: 'Test description',
      };

      const jobResult = await service.createJob(createJobDto, mockUser);

      // Mock files
      const mockFiles = [
        {
          fieldname: 'resumes',
          originalname: 'john_doe_resume.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 12345,
          destination: '/tmp',
          filename: 'resume1.pdf',
          path: '/tmp/resume1.pdf',
          buffer: Buffer.from('fake pdf content'),
        },
        {
          fieldname: 'resumes',
          originalname: 'jane_smith_cv.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 23456,
          destination: '/tmp',
          filename: 'resume2.pdf',
          path: '/tmp/resume2.pdf',
          buffer: Buffer.from('fake pdf content 2'),
        },
      ];

      const uploadResult = service.uploadResumes(jobResult.jobId, mockFiles, mockUser);

      expect(uploadResult).toBeDefined();
      expect(uploadResult.jobId).toBe(jobResult.jobId);
      expect(uploadResult.uploadedCount).toBe(2);

      // Wait a bit for async NATS publishing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify NATS events were published for each resume
      expect(natsClient.publishResumeSubmitted).toHaveBeenCalledTimes(2);
      expect(natsClient.publishResumeSubmitted).toHaveBeenCalledWith({
        jobId: jobResult.jobId,
        resumeId: expect.any(String),
        originalFilename: 'john_doe_resume.pdf',
        tempGridFsUrl: expect.any(String),
      });
      expect(natsClient.publishResumeSubmitted).toHaveBeenCalledWith({
        jobId: jobResult.jobId,
        resumeId: expect.any(String),
        originalFilename: 'jane_smith_cv.pdf',
        tempGridFsUrl: expect.any(String),
      });

      // Verify resumes were stored
      const resumes = service.getResumesByJobId(jobResult.jobId);
      expect(resumes).toHaveLength(2);
      expect(resumes[0].originalFilename).toBe('john_doe_resume.pdf');
      expect(resumes[1].originalFilename).toBe('jane_smith_cv.pdf');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty file uploads', () => {
      const jobId = 'test-job-id';
      const result = service.uploadResumes(jobId, [], mockUser);

      expect(result.uploadedCount).toBe(0);
      expect(natsClient.publishResumeSubmitted).not.toHaveBeenCalled();
    });

    it('should handle non-existent job for resume upload', () => {
      const mockFiles = [
        {
          fieldname: 'resumes',
          originalname: 'test.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 12345,
          destination: '/tmp',
          filename: 'test.pdf',
          path: '/tmp/test.pdf',
          buffer: Buffer.from('fake content'),
        },
      ];

      expect(() => {
        service.uploadResumes('non-existent-job', mockFiles, mockUser);
      }).toThrow('Job with ID non-existent-job not found');
    });
  });
});