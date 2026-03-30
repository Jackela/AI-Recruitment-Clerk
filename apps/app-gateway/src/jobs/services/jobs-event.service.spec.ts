import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { JobsEventService } from './jobs-event.service';
import { JobRepository } from '../../repositories/job.repository';
import { AppGatewayNatsService } from '../../nats/app-gateway-nats.service';
import { CacheService } from '../../cache/cache.service';
import { WebSocketGateway } from '../../websocket/websocket.gateway';
import { JobsSemanticCacheService } from './jobs-semantic-cache.service';
import type { JobDocument } from '../../schemas/job.schema';


const mockJobRepository = () => ({
  findById: jest.fn(),
  updateStatus: jest.fn(),
  updateJdAnalysis: jest.fn(),
});

const mockNatsClient = () => ({
  subscribeToAnalysisCompleted: jest.fn().mockResolvedValue(undefined),
  subscribeToAnalysisFailed: jest.fn().mockResolvedValue(undefined),
});

const mockCacheService = () => ({
  generateKey: jest.fn((...args) => args.join(':')),
  del: jest.fn().mockResolvedValue(undefined),
});

const mockWebSocketGateway = () => ({
  emitJobUpdated: jest.fn(),
});

const mockSemanticCacheService = () => ({
  registerSemanticCacheEntry: jest.fn().mockResolvedValue(undefined),
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

describe('JobsEventService', () => {
  let service: JobsEventService;
  let jobRepository: jest.Mocked<ReturnType<typeof mockJobRepository>>;
  let natsClient: jest.Mocked<ReturnType<typeof mockNatsClient>>;
  let cacheService: jest.Mocked<ReturnType<typeof mockCacheService>>;
  let webSocketGateway: jest.Mocked<ReturnType<typeof mockWebSocketGateway>>;
  let semanticCacheService: jest.Mocked<
    ReturnType<typeof mockSemanticCacheService>
  >;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Silence logger during tests
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {
      // Intentionally empty
    });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {
      // Intentionally empty
    });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
      // Intentionally empty
    });
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {
      // Intentionally empty
    });

    const module = await Test.createTestingModule({
      providers: [
        JobsEventService,
        {
          provide: JobRepository,
          useValue: mockJobRepository(),
        },
        {
          provide: AppGatewayNatsService,
          useValue: mockNatsClient(),
        },
        {
          provide: CacheService,
          useValue: mockCacheService(),
        },
        {
          provide: WebSocketGateway,
          useValue: mockWebSocketGateway(),
        },
        {
          provide: JobsSemanticCacheService,
          useValue: mockSemanticCacheService(),
        },
      ],
    }).compile();

    service = module.get<JobsEventService>(JobsEventService);
    jobRepository = module.get(JobRepository);
    natsClient = module.get(AppGatewayNatsService);
    cacheService = module.get(CacheService);
    webSocketGateway = module.get(WebSocketGateway);
    semanticCacheService = module.get(JobsSemanticCacheService);
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  describe('initializeSubscriptions', () => {
    it('should initialize all NATS subscriptions successfully', async () => {
      await service.initializeSubscriptions();

      expect(natsClient.subscribeToAnalysisCompleted).toHaveBeenCalled();
      expect(natsClient.subscribeToAnalysisFailed).toHaveBeenCalled();
    });

    it('should handle subscription initialization errors gracefully', async () => {
      natsClient.subscribeToAnalysisCompleted.mockRejectedValue(
        new Error('Connection failed'),
      );

      // Should not throw, should gracefully degrade
      await expect(service.initializeSubscriptions()).resolves.not.toThrow();
    });
  });

  describe('handleJdAnalysisCompleted', () => {
    const createCompletedEvent = (overrides = {}) => ({
      jobId: 'job-123',
      extractedData: {
        skills: ['JavaScript', 'TypeScript', 'React'],
        requirements: [
          { skill: 'Node.js', level: 'required' },
          { skill: 'PostgreSQL', level: 'preferred' },
        ],
        keywords: ['Frontend', 'Web Development'],
      },
      processingTimeMs: 1500,
      confidence: 0.92,
      extractionMethod: 'ai-analysis',
      eventType: 'AnalysisJdExtractedEvent' as const,
      timestamp: new Date().toISOString(),
      version: '1.0',
      service: 'analysis-service',
      performance: {
        processingTimeMs: 1500,
        extractionMethod: 'ai-analysis',
      },
      quality: {
        confidence: 0.92,
        extractedFields: 10,
      },
      ...overrides,
    });

    it('should process successful JD analysis completion', async () => {
      const mockJob = createMockJob();
      const event = createCompletedEvent();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateJdAnalysis.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue({
        ...mockJob,
        status: 'completed',
      } as JobDocument);

      // Subscribe and trigger the handler
      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      // Simulate the event
      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateJdAnalysis).toHaveBeenCalledWith(
        'job-123',
        expect.arrayContaining([
          'JavaScript',
          'TypeScript',
          'React',
          'Node.js',
          'PostgreSQL',
        ]),
        0.92,
      );
      expect(jobRepository.updateStatus).toHaveBeenCalledWith(
        'job-123',
        'completed',
      );
      expect(cacheService.del).toHaveBeenCalled();
      expect(webSocketGateway.emitJobUpdated).toHaveBeenCalled();
      expect(
        semanticCacheService.registerSemanticCacheEntry,
      ).toHaveBeenCalled();
    });

    it('should handle event with missing jobId', async () => {
      const event = createCompletedEvent({ jobId: '' });

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle non-existent job', async () => {
      const event = createCompletedEvent();

      jobRepository.findById.mockResolvedValue(null);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should handle event without quality data (fallback to confidence)', async () => {
      const mockJob = createMockJob();
      const event = {
        ...createCompletedEvent(),
        quality: undefined,
        confidence: 0.85,
      };

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateJdAnalysis.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue(mockJob as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateJdAnalysis).toHaveBeenCalledWith(
        'job-123',
        expect.any(Array),
        0.85,
      );
    });

    it('should handle event without performance data (fallback to processingTimeMs)', async () => {
      const mockJob = createMockJob();
      const event = {
        ...createCompletedEvent(),
        performance: undefined,
        processingTimeMs: 2000,
      };

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateJdAnalysis.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue(mockJob as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(webSocketGateway.emitJobUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            processingTime: 2000,
          }),
        }),
      );
    });

    it('should mark job as failed when processing throws error', async () => {
      const mockJob = createMockJob();
      const event = createCompletedEvent();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateJdAnalysis.mockRejectedValue(
        new Error('Database error'),
      );
      jobRepository.updateStatus.mockResolvedValue({
        ...mockJob,
        status: 'failed',
      } as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateStatus).toHaveBeenCalledWith(
        'job-123',
        'failed',
      );
    });

    it('should extract keywords from various data structures', async () => {
      const mockJob = createMockJob();
      const event = createCompletedEvent({
        extractedData: {
          skills: ['Python', 'Django'],
          keywords: ['Backend', 'API'],
          extractedKeywords: ['Database', 'Redis'],
          // No requirements array
        },
      });

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateJdAnalysis.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue(mockJob as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateJdAnalysis).toHaveBeenCalledWith(
        'job-123',
        expect.arrayContaining([
          'Python',
          'Django',
          'Backend',
          'API',
          'Database',
          'Redis',
        ]),
        expect.any(Number),
      );
    });

    it('should handle empty extracted data', async () => {
      const mockJob = createMockJob();
      const event = createCompletedEvent({
        extractedData: {},
      });

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateJdAnalysis.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue(mockJob as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateJdAnalysis).toHaveBeenCalledWith(
        'job-123',
        [],
        expect.any(Number),
      );
    });

    it('should deduplicate and limit keywords to 20', async () => {
      const mockJob = createMockJob();
      const skills = Array.from({ length: 15 }, (_, i) => `Skill${i}`);
      const keywords = Array.from({ length: 15 }, (_, i) => `Keyword${i}`);

      const event = createCompletedEvent({
        extractedData: {
          skills: [...skills, 'Skill0', 'Skill1'], // Duplicates
          keywords,
        },
      });

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateJdAnalysis.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue(mockJob as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      const [, extractedKeywords] =
        jobRepository.updateJdAnalysis.mock.calls[0];
      expect(extractedKeywords.length).toBeLessThanOrEqual(20);
    });
  });

  describe('handleJdAnalysisFailed', () => {
    const createFailedEvent = (overrides = {}) => ({
      jobId: 'job-123',
      error: {
        message: 'Analysis service timeout',
        name: 'TimeoutError',
        type: 'ServiceError',
        stack:
          'Error: Analysis service timeout\n    at AnalysisService.analyze',
      },
      context: {
        service: 'analysis-service',
        stage: 'extraction',
        inputSize: 1024,
        retryAttempt: 2,
      },
      timestamp: new Date().toISOString(),
      eventType: 'JobJdFailedEvent' as const,
      version: '1.0',
      severity: 'high' as const,
      ...overrides,
    });

    it('should process JD analysis failure', async () => {
      const mockJob = createMockJob();
      const event = createFailedEvent();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue({
        ...mockJob,
        status: 'failed',
      } as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisFailed.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateStatus).toHaveBeenCalledWith(
        'job-123',
        'failed',
      );
      expect(cacheService.del).toHaveBeenCalled();
      expect(webSocketGateway.emitJobUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          metadata: expect.objectContaining({
            errorMessage: 'Analysis service timeout',
          }),
        }),
      );
    });

    it('should handle critical severity failures with detailed logging', async () => {
      const mockJob = createMockJob();
      const event = createFailedEvent({ severity: 'critical' });

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue(mockJob as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisFailed.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateStatus).toHaveBeenCalled();
    });

    it('should handle event with missing jobId', async () => {
      const event = createFailedEvent({ jobId: '' });

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisFailed.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle non-existent job for failure event', async () => {
      const event = createFailedEvent();

      jobRepository.findById.mockResolvedValue(null);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisFailed.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should mark job as failed when processing error throws', async () => {
      const mockJob = createMockJob();
      const event = createFailedEvent();

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ ...mockJob, status: 'failed' } as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisFailed.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      // Should try to mark as failed even if first update fails
      expect(jobRepository.updateStatus).toHaveBeenCalledWith(
        'job-123',
        'failed',
      );
    });
  });

  describe('emitJobUpdatedEvent', () => {
    it('should emit job updated event via WebSocket', async () => {
      const payload = {
        jobId: 'job-123',
        title: 'Software Engineer',
        status: 'completed' as const,
        organizationId: 'org-123',
        updatedBy: 'user-123',
        metadata: { confidence: 0.95 },
      };

      // Access the public method directly
      await service.emitJobUpdatedEvent(payload);

      expect(webSocketGateway.emitJobUpdated).toHaveBeenCalledWith({
        jobId: payload.jobId,
        title: payload.title,
        status: payload.status,
        timestamp: expect.any(Date),
        organizationId: payload.organizationId,
        updatedBy: payload.updatedBy,
        metadata: payload.metadata,
      });
    });

    it('should handle WebSocket emission errors gracefully', async () => {
      webSocketGateway.emitJobUpdated.mockImplementation(() => {
        throw new Error('WebSocket error');
      });

      const payload = {
        jobId: 'job-123',
        title: 'Software Engineer',
        status: 'completed' as const,
      };

      // Should not throw
      await expect(service.emitJobUpdatedEvent(payload)).resolves.not.toThrow();
    });

    it('should emit event without optional fields', async () => {
      const payload = {
        jobId: 'job-123',
        title: 'Software Engineer',
        status: 'processing' as const,
      };

      await service.emitJobUpdatedEvent(payload);

      expect(webSocketGateway.emitJobUpdated).toHaveBeenCalledWith({
        jobId: payload.jobId,
        title: payload.title,
        status: payload.status,
        timestamp: expect.any(Date),
        organizationId: undefined,
        updatedBy: undefined,
        metadata: undefined,
      });
    });
  });

  describe('extractKeywordsFromAnalysis', () => {
    it('should extract keywords from requirements with skill property', async () => {
      const mockJob = createMockJob();
      const event = {
        jobId: 'job-123',
        extractedData: {
          requirements: [
            { skill: 'React', level: 'required' },
            { skill: 'TypeScript', level: 'preferred' },
            { skill: 123 }, // Invalid, should be filtered
            {}, // Missing skill, should be filtered
          ],
        },
        processingTimeMs: 1000,
        confidence: 0.9,
        extractionMethod: 'ai',
        eventType: 'AnalysisJdExtractedEvent' as const,
        timestamp: new Date().toISOString(),
        version: '1.0',
        service: 'analysis-service',
        performance: {
          processingTimeMs: 1000,
          extractionMethod: 'ai',
        },
        quality: {
          confidence: 0.9,
          extractedFields: 5,
        },
      };

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateJdAnalysis.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue(mockJob as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateJdAnalysis).toHaveBeenCalledWith(
        'job-123',
        expect.arrayContaining(['React', 'TypeScript']),
        expect.any(Number),
      );
    });

    it('should handle null analysis data', async () => {
      const mockJob = createMockJob();
      const event = {
        jobId: 'job-123',
        extractedData: null,
        processingTimeMs: 1000,
        confidence: 0.9,
        extractionReference: 'ai',
        eventType: 'AnalysisJdExtractedEvent' as const,
        timestamp: new Date().toISOString(),
        version: '1.0',
        service: 'analysis-service',
        performance: {
          processingTimeMs: 1000,
          extractionMethod: 'ai',
        },
        quality: {
          confidence: 0.9,
          extractedFields: 5,
        },
      };

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateJdAnalysis.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue(mockJob as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      expect(jobRepository.updateJdAnalysis).toHaveBeenCalledWith(
        'job-123',
        [],
        expect.any(Number),
      );
    });

    it('should trim and filter empty keywords', async () => {
      const mockJob = createMockJob();
      const event = {
        jobId: 'job-123',
        extractedData: {
          skills: ['  React  ', '', '  ', 'Node.js'],
        },
        processingTimeMs: 1000,
        confidence: 0.9,
        extractionMethod: 'ai',
        eventType: 'AnalysisJdExtractedEvent' as const,
        timestamp: new Date().toISOString(),
        version: '1.0',
        service: 'analysis-service',
        performance: {
          processingTimeMs: 1000,
          extractionMethod: 'ai',
        },
        quality: {
          confidence: 0.9,
          extractedFields: 5,
        },
      };

      jobRepository.findById.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateJdAnalysis.mockResolvedValue(mockJob as JobDocument);
      jobRepository.updateStatus.mockResolvedValue(mockJob as JobDocument);

      let capturedHandler: ((...args: unknown[]) => void) | undefined;
      natsClient.subscribeToAnalysisCompleted.mockImplementation((handler) => {
        capturedHandler = handler;
        return Promise.resolve();
      });

      await service.initializeSubscriptions();

      if (capturedHandler) {
        await capturedHandler(event, {});
      }

      const [, keywords] = jobRepository.updateJdAnalysis.mock.calls[0];
      expect(keywords).toContain('React');
      expect(keywords).toContain('Node.js');
      expect(keywords).not.toContain('');
      expect(keywords).not.toContain('  ');
    });
  });
});
