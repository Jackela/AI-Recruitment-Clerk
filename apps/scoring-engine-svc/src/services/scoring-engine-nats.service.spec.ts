import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ScoringEngineNatsService } from './scoring-engine-nats.service';
import type {
  NatsConnectionManager,
  NatsStreamManager,
} from '@ai-recruitment-clerk/shared-nats-client';

describe('ScoringEngineNatsService', () => {
  let service: ScoringEngineNatsService;
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
          MONGODB_URI: 'mongodb://testuser:testpass@localhost:27018/scoring-test',
          NATS_SERVERS: 'nats://testuser:testpass@localhost:4223',
          SERVICE_NAME: 'scoring-engine-svc-test',
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
    service = new ScoringEngineNatsService(
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

  describe('publishScoringCompleted', () => {
    const mockEvent = {
      jobId: 'job-123',
      resumeId: 'resume-456',
      matchScore: 85,
      processingTimeMs: 1500,
      enhancedMetrics: {
        aiAnalysisTime: 1200,
        confidenceLevel: 'high',
        fallbacksUsed: 0,
        componentsProcessed: ['skills', 'experience', 'education'],
      },
    };

    it('should publish scoring completed event successfully', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-789',
      });

      const result = await service.publishScoringCompleted(mockEvent);

      expect(result).toEqual({
        success: true,
        messageId: 'msg-789',
      });

      expect(mockPublish).toHaveBeenCalledWith(
        'analysis.scoring.completed',
        expect.objectContaining({
          jobId: 'job-123',
          resumeId: 'resume-456',
          matchScore: 85,
          processingTimeMs: 1500,
          performance: {
            totalProcessingTime: 1500,
            aiAnalysisTime: 1200,
            efficiency: 80,
            fallbackRate: 0,
          },
          quality: {
            confidenceLevel: 'high',
            componentsProcessed: ['skills', 'experience', 'education'],
          },
          timestamp: expect.any(String),
          service: 'scoring-engine-svc',
          eventType: expect.any(String),
        }),
        expect.objectContaining({
          messageId: expect.stringContaining('scoring-completed-resume-456'),
          timeout: 5000,
          headers: expect.objectContaining({
            'resume-id': 'resume-456',
            'job-id': 'job-123',
            'score': '85',
            'source-service': 'scoring-engine-svc',
          }),
        }),
      );
    });

    it('should use default values when enhancedMetrics are not provided', async () => {
      const eventWithoutMetrics = {
        jobId: 'job-789',
        resumeId: 'resume-999',
        matchScore: 70,
        processingTimeMs: 2000,
      };

      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-111',
      });

      await service.publishScoringCompleted(eventWithoutMetrics);

      expect(mockPublish).toHaveBeenCalledWith(
        'analysis.scoring.completed',
        expect.objectContaining({
          performance: {
            totalProcessingTime: 2000,
            aiAnalysisTime: 0,
            efficiency: 0,
            fallbackRate: 0,
          },
          quality: {
            confidenceLevel: 'medium',
            componentsProcessed: ['skills', 'experience', 'education'],
          },
        }),
        expect.anything(),
      );
    });

    it('should handle publish failure', async () => {
      mockPublish.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await service.publishScoringCompleted(mockEvent);

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

      const result = await service.publishScoringCompleted(mockEvent);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error',
        metadata: expect.objectContaining({
          subject: 'analysis.scoring.completed',
        }),
      });

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error publishing event'),
        error,
      );
    });

    it('should calculate efficiency correctly', async () => {
      const eventWithPartialMetrics = {
        jobId: 'job-abc',
        resumeId: 'resume-def',
        matchScore: 90,
        processingTimeMs: 1000,
        enhancedMetrics: {
          aiAnalysisTime: 500,
        },
      };

      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-xyz',
      });

      await service.publishScoringCompleted(eventWithPartialMetrics);

      expect(mockPublish).toHaveBeenCalledWith(
        'analysis.scoring.completed',
        expect.objectContaining({
          performance: expect.objectContaining({
            efficiency: 50, // 500/1000 * 100
          }),
        }),
        expect.anything(),
      );
    });
  });

  describe('publishScoringError', () => {
    it('should publish scoring error event successfully', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-333',
      });

      const error = new Error('Scoring failed');
      const result = await service.publishScoringError(
        'job-111',
        'resume-222',
        error,
        {
          stage: 'matching',
          retryAttempt: 2,
        },
      );

      expect(result).toEqual({
        success: true,
        messageId: 'msg-333',
      });

      expect(mockPublish).toHaveBeenCalled();
    });

    it('should use default values when context is not provided', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-444',
      });

      const error = new Error('Failed');
      await service.publishScoringError('job-333', 'resume-444', error);

      expect(mockPublish).toHaveBeenCalled();
    });

    it('should handle publish failure for error events', async () => {
      mockPublish.mockResolvedValue({
        success: false,
        error: 'Queue full',
      });

      const error = new Error('Scoring error');
      const result = await service.publishScoringError(
        'job-555',
        'resume-666',
        error,
      );

      expect(result).toEqual({
        success: false,
        error: 'Queue full',
      });

      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should handle exceptions during error publish', async () => {
      const error = new Error('Network timeout');
      mockPublish.mockRejectedValue(error);

      const serviceError = new Error('Service error');
      const result = await service.publishScoringError(
        'job-777',
        'resume-888',
        serviceError,
      );

      expect(result).toEqual({
        success: false,
        error: 'Network timeout',
        metadata: expect.objectContaining({
          subject: 'analysis.scoring.failed',
        }),
      });
    });
  });

  describe('publishProcessingError', () => {
    it('should publish processing error event successfully', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-555',
      });

      const error = new Error('Processing failed');
      const result = await service.publishProcessingError(
        'job-666',
        'resume-777',
        error,
        {
          stage: 'validation',
          retryAttempt: 1,
        },
      );

      expect(result).toEqual({
        success: true,
        messageId: 'msg-555',
      });

      expect(mockPublish).toHaveBeenCalled();
    });

    it('should handle exceptions during processing error publish', async () => {
      const error = new Error('Publish failed');
      mockPublish.mockRejectedValue(error);

      const serviceError = new Error('Service error');
      const result = await service.publishProcessingError(
        'job-888',
        'resume-999',
        serviceError,
      );

      expect(result).toEqual({
        success: false,
        error: 'Publish failed',
        metadata: expect.objectContaining({
          subject: 'scoring.processing.error',
        }),
      });
    });
  });

  describe('subscribeToJdExtracted', () => {
    it('should subscribe to JD extracted events successfully', async () => {
      mockSubscribe.mockResolvedValue(undefined);
      const handler = jest.fn() as unknown as (event: unknown) => Promise<void>;

      await service.subscribeToJdExtracted(handler);

      expect(mockSubscribe).toHaveBeenCalledWith(
        'analysis.jd.extracted',
        handler,
        expect.objectContaining({
          durableName: 'scoring-engine-jd-extracted',
          queueGroup: 'scoring-engine-group',
          maxDeliver: 3,
        }),
      );
    });

    it('should throw error if subscription fails', async () => {
      const error = new Error('Subscription failed');
      mockSubscribe.mockRejectedValue(error);
      const handler = jest.fn() as unknown as (event: unknown) => Promise<void>;

      await expect(service.subscribeToJdExtracted(handler)).rejects.toThrow(
        'Subscription failed',
      );
    });
  });

  describe('subscribeToResumeParsed', () => {
    it('should subscribe to resume parsed events successfully', async () => {
      mockSubscribe.mockResolvedValue(undefined);
      const handler = jest.fn() as unknown as (event: unknown) => Promise<void>;

      await service.subscribeToResumeParsed(handler);

      expect(mockSubscribe).toHaveBeenCalledWith(
        'analysis.resume.parsed',
        handler,
        expect.objectContaining({
          durableName: 'scoring-engine-resume-parsed',
          queueGroup: 'scoring-engine-group',
          maxDeliver: 3,
        }),
      );
    });

    it('should throw error if subscription fails', async () => {
      const error = new Error('Subscription failed');
      mockSubscribe.mockRejectedValue(error);
      const handler = jest.fn() as unknown as (event: unknown) => Promise<void>;

      await expect(service.subscribeToResumeParsed(handler)).rejects.toThrow(
        'Subscription failed',
      );
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
        service: 'scoring-engine-svc',
        lastActivity: expect.any(Date),
        subscriptions: [], // No active subscriptions in this test
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
