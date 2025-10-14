import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResumeParserNatsService } from './resume-parser-nats.service';
import {
  NatsConnectionManager,
  NatsStreamManager,
} from '@app/shared-nats-client';

describe('ResumeParserNatsService', () => {
  let service: ResumeParserNatsService;
  let mockPublish: jest.Mock;
  let mockSubscribe: jest.Mock;
  let mockGetHealthStatus: jest.Mock;

  beforeEach(async () => {
    // Create mocks for base class methods
    mockPublish = jest
      .fn()
      .mockResolvedValue({ success: true, messageId: 'test-msg-id' });
    mockSubscribe = jest.fn().mockResolvedValue(undefined);
    mockGetHealthStatus = jest.fn().mockResolvedValue({
      connected: true,
      lastActivity: new Date(),
      messagesSent: 0,
      messagesReceived: 0,
    });

    // Create mock providers for dependencies
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, any> = {
          NATS_URL: 'nats://localhost:4222',
          SERVICE_NAME: 'resume-parser-svc',
        };
        return config[key] || 'mock-value';
      }),
    };

    const mockConnectionManager = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getConnection: jest.fn().mockReturnValue(null),
      isConnected: jest.fn().mockReturnValue(false),
      getHealthStatus: jest.fn().mockResolvedValue({
        connected: false,
        servers: [],
      }),
    };

    const mockStreamManager = {
      ensureStream: jest.fn().mockResolvedValue(undefined),
      createConsumer: jest.fn().mockResolvedValue(undefined),
      getStreamInfo: jest.fn().mockResolvedValue(null),
      deleteStream: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeParserNatsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NatsConnectionManager, useValue: mockConnectionManager },
        { provide: NatsStreamManager, useValue: mockStreamManager },
      ],
    }).compile();

    service = module.get<ResumeParserNatsService>(ResumeParserNatsService);

    // Override base class methods
    service.publish = mockPublish;
    service.subscribe = mockSubscribe;
    service.getHealthStatus = mockGetHealthStatus;

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
          eventType: 'AnalysisResumeParsedEvent',
          service: 'resume-parser-svc',
        }),
        expect.objectContaining({
          messageId: expect.stringContaining('resume-parsed-resume-456'),
          timeout: 5000,
          headers: expect.objectContaining({
            'source-service': 'resume-parser-svc',
            'event-type': 'AnalysisResumeParsedEvent',
            'resume-id': 'resume-456',
            'job-id': 'job-123',
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
        `Failed to publish analysis resume parsed event for resumeId: ${mockEvent.resumeId}`,
        'Network error',
      );
    });

    it('should handle exceptions during publish', async () => {
      const error = new Error('Unexpected error');
      mockPublish.mockRejectedValue(error);

      const result = await service.publishAnalysisResumeParsed(mockEvent);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error',
      });

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Error publishing analysis resume parsed event for resumeId: ${mockEvent.resumeId}`,
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
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
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

      expect(mockPublish).toHaveBeenCalledWith(
        'job.resume.failed',
        expect.objectContaining({
          jobId: 'job-111',
          resumeId: 'resume-222',
          error: {
            message: 'Parsing failed',
            stack: expect.any(String),
            name: 'Error',
          },
          stage: 'text-extraction',
          retryAttempt: 2,
          eventType: 'JobResumeFailedEvent',
          service: 'resume-parser-svc',
        }),
        expect.objectContaining({
          messageId: expect.stringContaining('resume-failed-resume-222'),
          timeout: 5000,
          headers: expect.objectContaining({
            'source-service': 'resume-parser-svc',
            'event-type': 'JobResumeFailedEvent',
            'resume-id': 'resume-222',
            'job-id': 'job-111',
            'error-stage': 'text-extraction',
          }),
        }),
      );
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

      expect(mockPublish).toHaveBeenCalledWith(
        'job.resume.failed',
        expect.objectContaining({
          retryAttempt: 1,
        }),
        expect.anything(),
      );
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

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Failed to publish job resume failed event for resumeId: ${mockFailedEvent.resumeId}`,
        'Queue full',
      );
    });

    it('should handle exceptions during failed event publish', async () => {
      const error = new Error('Network timeout');
      mockPublish.mockRejectedValue(error);

      const result = await service.publishJobResumeFailed(mockFailedEvent);

      expect(result).toEqual({
        success: false,
        error: 'Network timeout',
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
          error: {
            message: 'Processing error',
            stack: expect.any(String),
            name: 'Error',
          },
          stage: 'parsing',
          retryAttempt: 3,
          inputSize: 1024000,
          processingTimeMs: 5000,
          eventType: 'ResumeProcessingErrorEvent',
        }),
        expect.objectContaining({
          messageId: expect.stringContaining('resume-error-resume-777'),
          headers: expect.objectContaining({
            'error-stage': 'parsing',
          }),
        }),
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
          stage: 'unknown',
          retryAttempt: 1,
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
          ackWait: 30000,
          deliverPolicy: 'new',
        }),
      );

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Successfully subscribed to job.resume.submitted',
      );
    });

    it('should throw error if subscription fails', async () => {
      const error = new Error('Subscription failed');
      mockSubscribe.mockRejectedValue(error);
      const handler = jest.fn();

      await expect(
        service.subscribeToResumeSubmissions(handler),
      ).rejects.toThrow('Subscription failed');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to subscribe to job.resume.submitted',
        error,
      );
    });

    it('should log subscription setup', async () => {
      mockSubscribe.mockResolvedValue(undefined);
      const handler = jest.fn();

      await service.subscribeToResumeSubmissions(handler);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Setting up subscription to job.resume.submitted with durable name: resume-parser-job-resume-submitted',
      );
    });
  });

  describe('generateResumeMessageId', () => {
    it('should generate unique message IDs', () => {
      // Access private method through type assertion
      const generateId = (service as any).generateResumeMessageId;

      const id1 = generateId.call(service, 'resume-123', 'parsed');
      const id2 = generateId.call(service, 'resume-123', 'parsed');

      expect(id1).toContain('resume-parsed-resume-123');
      expect(id2).toContain('resume-parsed-resume-123');
      expect(id1).not.toBe(id2); // Should be unique
    });

    it('should include timestamp and random component', () => {
      const generateId = (service as any).generateResumeMessageId;
      const id = generateId.call(service, 'resume-456', 'failed');

      expect(id).toMatch(/^resume-failed-resume-456-\d+-[a-z0-9]{9}$/);
    });
  });

  describe('getServiceHealthStatus', () => {
    it('should return service-specific health status', async () => {
      const baseHealth = {
        connected: true,
        lastActivity: new Date(),
        messagesSent: 100,
        messagesReceived: 50,
      };

      mockGetHealthStatus.mockResolvedValue(baseHealth);

      const result = await service.getServiceHealthStatus();

      expect(result).toEqual({
        ...baseHealth,
        service: 'resume-parser-svc',
        subscriptions: ['job.resume.submitted'],
      });

      expect(mockGetHealthStatus).toHaveBeenCalled();
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
