import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ResumeParserNatsService } from './resume-parser-nats.service';
import type {
  NatsConnectionManager,
  NatsStreamManager,
} from '@ai-recruitment-clerk/shared-nats-client';

describe('ResumeParserNatsService', () => {
  let service: ResumeParserNatsService;
  let mockPublish: jest.Mock;
  let mockSubscribe: jest.Mock;
  let mockGetHealthStatus: jest.Mock;

  beforeEach(() => {
    // Create mocks for the lowest level methods from NatsClientService
    mockPublish = jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'test-msg-id' });
    mockSubscribe = jest.fn().mockResolvedValue(undefined);
    mockGetHealthStatus = jest.fn().mockResolvedValue({
      connected: true,
      servers: [],
      lastOperationTime: new Date(),
    });

    // Create mock dependencies
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, unknown> = {
          MONGODB_URI:
            'mongodb://testuser:testpass@localhost:27018/resume-parser-test',
          NATS_SERVERS: 'nats://testuser:testpass@localhost:4223',
          SERVICE_NAME: 'resume-parser-svc-test',
          GRIDFS_BUCKET_NAME: 'test-resumes',
          GRIDFS_CHUNK_SIZE: 261120,
        };
        return config[key];
      }),
    } as unknown as ConfigService;

    const mockConnectionManager = {
      getConnection: jest.fn().mockResolvedValue({
        jetstream: jest.fn().mockReturnValue({
          publish: jest.fn().mockResolvedValue({ success: true }),
          subscribe: jest.fn().mockResolvedValue({}),
        }),
        close: jest.fn(),
      }),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    } as unknown as NatsConnectionManager;

    const mockStreamManager = {
      ensureStream: jest.fn().mockResolvedValue(undefined),
      createConsumer: jest.fn().mockResolvedValue(undefined),
      getStreamInfo: jest.fn().mockResolvedValue({}),
      deleteStream: jest.fn().mockResolvedValue(undefined),
    } as unknown as NatsStreamManager;

    // Create service instance directly without NestJS DI
    service = new ResumeParserNatsService(
      mockConfigService,
      mockConnectionManager,
      mockStreamManager,
    ) as any;

    // Override the lowest level methods from NatsClientService
    const mockableService = service as unknown as {
      publish: typeof mockPublish;
      subscribe: typeof mockSubscribe;
      getHealthStatus: typeof mockGetHealthStatus;
    };
    mockableService.publish = mockPublish;
    mockableService.subscribe = mockSubscribe;
    mockableService.getHealthStatus = mockGetHealthStatus;

    // Mock logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishAnalysisResumeParsed', () => {
    const mockEvent = {
      jobId: 'job-123',
      resumeId: 'resume-456',
      resumeDto: { name: 'John Doe', skills: ['JavaScript', 'TypeScript'] },
      processingTimeMs: 1500,
      confidence: 0.92,
      parsingMethod: 'ai-vision-llm',
    };

    it('should publish analysis resume parsed event successfully', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-789',
      });

      const result = await service.publishAnalysisResumeParsed(mockEvent);

      expect(result).toEqual({
        success: true,
        messageId: 'msg-789',
      });

      expect(mockPublish).toHaveBeenCalledWith(
        'analysis.resume.parsed',
        expect.objectContaining({
          jobId: 'job-123',
          resumeId: 'resume-456',
          resumeDto: mockEvent.resumeDto,
          processingTimeMs: 1500,
          confidence: 0.92,
          parsingMethod: 'ai-vision-llm',
          timestamp: expect.any(String),
          service: 'resume-parser-svc',
          eventType: expect.any(String),
        }),
        expect.objectContaining({
          messageId: expect.stringContaining('resume-parsed-resume-456'),
          timeout: 5000,
          headers: expect.objectContaining({
            'resume-id': 'resume-456',
            'job-id': 'job-123',
            'source-service': 'resume-parser-svc',
            'event-type': expect.any(String),
          }),
        }),
      );
    });

    it('should use default values when confidence and parsingMethod are not provided', async () => {
      const eventWithoutOptionals = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        resumeDto: { name: 'Jane Doe' },
        processingTimeMs: 2000,
      };

      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-999',
      });

      await service.publishAnalysisResumeParsed(eventWithoutOptionals);

      expect(mockPublish).toHaveBeenCalledWith(
        'analysis.resume.parsed',
        expect.objectContaining({
          confidence: 0.85,
          parsingMethod: 'ai-vision-llm',
        }),
        expect.anything(),
      );
    });

    it('should handle publish failure', async () => {
      mockPublish.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await service.publishAnalysisResumeParsed(mockEvent);

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to publish event'),
      );
    });

    it('should handle exceptions during publish', async () => {
      const error = new Error('Unexpected error');
      mockPublish.mockRejectedValue(error);

      const result = await service.publishAnalysisResumeParsed(mockEvent);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error',
        metadata: expect.objectContaining({
          subject: 'analysis.resume.parsed',
        }),
      });

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error publishing event'),
        error,
      );
    });

    it('should include timestamp in event payload', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-001',
      });

      await service.publishAnalysisResumeParsed(mockEvent);

      expect(mockPublish).toHaveBeenCalledWith(
        'analysis.resume.parsed',
        expect.objectContaining({
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          ),
        }),
        expect.anything(),
      );
    });
  });

  describe('publishJobResumeFailed', () => {
    const mockFailedEvent = {
      jobId: 'job-111',
      resumeId: 'resume-222',
      error: new Error('Parsing failed'),
      stage: 'text-extraction',
      retryAttempt: 2,
    };

    it('should publish job resume failed event successfully', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-333',
      });

      const result = await service.publishJobResumeFailed(mockFailedEvent);

      expect(result).toEqual({
        success: true,
        messageId: 'msg-333',
      });

      // The publishErrorEvent method uses publishEvent internally
      expect(mockPublish).toHaveBeenCalled();
    });

    it('should use default retry attempt when not provided', async () => {
      const eventWithoutRetry = {
        jobId: 'job-111',
        resumeId: 'resume-222',
        error: new Error('Failed'),
        stage: 'validation',
      };

      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-444',
      });

      await service.publishJobResumeFailed(eventWithoutRetry);

      expect(mockPublish).toHaveBeenCalled();
    });

    it('should handle publish failure for failed events', async () => {
      mockPublish.mockResolvedValue({
        success: false,
        error: 'Queue full',
      });

      const result = await service.publishJobResumeFailed(mockFailedEvent);

      expect(result).toEqual({
        success: false,
        error: 'Queue full',
      });

      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should handle exceptions during failed event publish', async () => {
      const error = new Error('Network timeout');
      mockPublish.mockRejectedValue(error);

      const result = await service.publishJobResumeFailed(mockFailedEvent);

      expect(result).toEqual({
        success: false,
        error: 'Network timeout',
        metadata: expect.objectContaining({
          subject: 'job.resume.failed',
        }),
      });
    });
  });

  describe('publishProcessingError', () => {
    it('should publish processing error event with full context', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-555',
      });

      const context = {
        stage: 'parsing',
        retryAttempt: 3,
        inputSize: 1024000,
        processingTimeMs: 5000,
      };

      const result = await service.publishProcessingError(
        'job-666',
        'resume-777',
        new Error('Processing error'),
        context,
      );

      expect(result).toEqual({
        success: true,
        messageId: 'msg-555',
      });

      expect(mockPublish).toHaveBeenCalledWith(
        'resume.processing.error',
        expect.objectContaining({
          jobId: 'job-666',
          resumeId: 'resume-777',
          stage: 'parsing',
          retryAttempt: 3,
          inputSize: 1024000,
          processingTimeMs: 5000,
        }),
        expect.anything(),
      );
    });

    it('should use default values when context is not provided', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-888',
      });

      await service.publishProcessingError(
        'job-999',
        'resume-000',
        new Error('Error'),
      );

      expect(mockPublish).toHaveBeenCalledWith(
        'resume.processing.error',
        expect.objectContaining({
          jobId: 'job-999',
          resumeId: 'resume-000',
        }),
        expect.anything(),
      );
    });

    it('should handle publish failure for processing errors', async () => {
      mockPublish.mockResolvedValue({
        success: false,
        error: 'Connection lost',
      });

      const result = await service.publishProcessingError(
        'job-aaa',
        'resume-bbb',
        new Error('Test error'),
      );

      expect(result).toEqual({
        success: false,
        error: 'Connection lost',
      });
    });

    it('should handle exceptions during error publish', async () => {
      const publishError = new Error('Publish failed');
      mockPublish.mockRejectedValue(publishError);

      const result = await service.publishProcessingError(
        'job-ccc',
        'resume-ddd',
        new Error('Original error'),
      );

      expect(result).toEqual({
        success: false,
        error: 'Publish failed',
        metadata: expect.objectContaining({
          subject: 'resume.processing.error',
        }),
      });
    });
  });

  describe('subscribeToResumeSubmissions', () => {
    it('should subscribe to resume submissions successfully', async () => {
      mockSubscribe.mockResolvedValue(undefined);
      const handler = jest.fn();

      await service.subscribeToResumeSubmissions(handler);

      expect(mockSubscribe).toHaveBeenCalledWith(
        'job.resume.submitted',
        handler,
        expect.objectContaining({
          durableName: 'resume-parser-job-resume-submitted',
          queueGroup: 'resume-parser-group',
          maxDeliver: 3,
        }),
      );
    });

    it('should throw error if subscription fails', async () => {
      const error = new Error('Subscription failed');
      mockSubscribe.mockRejectedValue(error);
      const handler = jest.fn();

      await expect(
        service.subscribeToResumeSubmissions(handler),
      ).rejects.toThrow('Subscription failed');
    });
  });

  describe('generateResumeMessageId', () => {
    it('should generate unique message IDs', () => {
      const generateId = (service as unknown as {
        generateResumeMessageId: (id: string, type: string) => string;
      }).generateResumeMessageId;

      const id1 = generateId.call(service, 'resume-123', 'parsed');
      const id2 = generateId.call(service, 'resume-123', 'parsed');

      expect(id1).toContain('resume-parsed-resume-123');
      expect(id2).toContain('resume-parsed-resume-123');
      expect(id1).not.toBe(id2); // Should be unique
    });

    it('should include timestamp and random component', () => {
      const generateId = (service as unknown as {
        generateResumeMessageId: (id: string, type: string) => string;
      }).generateResumeMessageId;
      const id = generateId.call(service, 'resume-456', 'failed');

      expect(id).toMatch(/^resume-failed-resume-456-\d+-[a-z0-9]{9}$/);
    });
  });

  describe('getServiceHealthStatus', () => {
    it('should return service-specific health status', async () => {
      mockGetHealthStatus.mockResolvedValue({
        connected: true,
        servers: [],
        lastOperationTime: new Date(),
      });

      const result = await service.getServiceHealthStatus();

      expect(result).toEqual({
        connected: true,
        service: 'resume-parser-svc',
        lastActivity: expect.any(Date),
        subscriptions: ['job.resume.submitted'],
        messagesSent: 0,
        messagesReceived: 0,
      });
    });

    it('should handle health status errors', async () => {
      const error = new Error('Health check failed');
      mockGetHealthStatus.mockRejectedValue(error);

      await expect(service.getServiceHealthStatus()).rejects.toThrow(
        'Health check failed',
      );
    });
  });
});
