import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  ReportGeneratorNatsService,
  type ReportGeneratedEvent,
  type ReportGenerationFailedEvent,
  type ReportGenerationRequestedEvent,
} from './report-generator-nats.service';
import type {
  NatsConnectionManager,
  NatsStreamManager,
} from '@ai-recruitment-clerk/shared-nats-client';

describe('ReportGeneratorNatsService', () => {
  let service: ReportGeneratorNatsService;
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
          MONGODB_URI: 'mongodb://testuser:testpass@localhost:27018/report-generator-test',
          NATS_SERVERS: 'nats://testuser:testpass@localhost:4223',
          SERVICE_NAME: 'report-generator-svc-test',
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
    service = new ReportGeneratorNatsService(
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

  describe('publishReportGenerated', () => {
    const mockEvent: ReportGeneratedEvent = {
      jobId: 'job-123',
      resumeId: 'resume-456',
      reportId: 'report-789',
      reportType: 'match-analysis',
      gridFsId: 'gridfs-123',
      timestamp: new Date().toISOString(),
      processingTimeMs: 1500,
    };

    it('should publish report generated event successfully', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-999',
      });

      const result = await service.publishReportGenerated(mockEvent);

      expect(result).toEqual({
        success: true,
        messageId: 'msg-999',
      });

      expect(mockPublish).toHaveBeenCalledWith(
        'report.generated',
        expect.objectContaining({
          jobId: 'job-123',
          resumeId: 'resume-456',
          reportId: 'report-789',
          reportType: 'match-analysis',
          gridFsId: 'gridfs-123',
          processingTimeMs: 1500,
          timestamp: expect.any(String),
          service: 'report-generator-svc',
          eventType: expect.any(String),
        }),
        expect.objectContaining({
          messageId: expect.stringContaining('report-generated-report-789'),
          timeout: 5000,
          headers: expect.objectContaining({
            'report-id': 'report-789',
            'job-id': 'job-123',
            'resume-id': 'resume-456',
            'report-type': 'match-analysis',
            'source-service': 'report-generator-svc',
          }),
        }),
      );
    });

    it('should handle publish failure', async () => {
      mockPublish.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await service.publishReportGenerated(mockEvent);

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

      const result = await service.publishReportGenerated(mockEvent);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error',
        metadata: expect.objectContaining({
          subject: 'report.generated',
        }),
      });

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error publishing event'),
        error,
      );
    });
  });

  describe('publishReportGenerationFailed', () => {
    const mockEvent: ReportGenerationFailedEvent = {
      jobId: 'job-111',
      resumeId: 'resume-222',
      reportType: 'candidate-summary',
      error: 'Generation failed',
      retryCount: 2,
      timestamp: new Date().toISOString(),
    };

    it('should publish report generation failed event successfully', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-333',
      });

      const result = await service.publishReportGenerationFailed(mockEvent);

      expect(result).toEqual({
        success: true,
        messageId: 'msg-333',
      });

      expect(mockPublish).toHaveBeenCalledWith(
        'report.generation.failed',
        expect.objectContaining({
          jobId: 'job-111',
          resumeId: 'resume-222',
          reportType: 'candidate-summary',
          error: 'Generation failed',
          retryCount: 2,
        }),
        expect.objectContaining({
          messageId: expect.stringContaining('report-failed-job-111-resume-222'),
          headers: expect.objectContaining({
            'job-id': 'job-111',
            'resume-id': 'resume-222',
            'report-type': 'candidate-summary',
          }),
        }),
      );
    });

    it('should handle publish failure for failed events', async () => {
      mockPublish.mockResolvedValue({
        success: false,
        error: 'Queue full',
      });

      const result = await service.publishReportGenerationFailed(mockEvent);

      expect(result).toEqual({
        success: false,
        error: 'Queue full',
      });

      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should handle exceptions during failed event publish', async () => {
      const error = new Error('Network timeout');
      mockPublish.mockRejectedValue(error);

      const result = await service.publishReportGenerationFailed(mockEvent);

      expect(result).toEqual({
        success: false,
        error: 'Network timeout',
        metadata: expect.objectContaining({
          subject: 'report.generation.failed',
        }),
      });
    });
  });

  describe('subscribeToMatchScored', () => {
    it('should subscribe to match scored events successfully', async () => {
      mockSubscribe.mockResolvedValue(undefined);
      const handler = jest.fn() as unknown as (event: unknown) => Promise<void>;

      await service.subscribeToMatchScored(handler);

      expect(mockSubscribe).toHaveBeenCalledWith(
        'analysis.match.scored',
        handler,
        expect.objectContaining({
          durableName: 'report-generator-match-scored',
          queueGroup: 'report-generator',
          maxDeliver: 3,
        }),
      );
    });

    it('should throw error if subscription fails', async () => {
      const error = new Error('Subscription failed');
      mockSubscribe.mockRejectedValue(error);
      const handler = jest.fn() as unknown as (event: unknown) => Promise<void>;

      await expect(service.subscribeToMatchScored(handler)).rejects.toThrow(
        'Subscription failed',
      );
    });
  });

  describe('subscribeToReportGenerationRequested', () => {
    it('should subscribe to report generation requested events successfully', async () => {
      mockSubscribe.mockResolvedValue(undefined);
      const handler = jest.fn() as unknown as (
        event: ReportGenerationRequestedEvent,
      ) => Promise<void>;

      await service.subscribeToReportGenerationRequested(handler);

      expect(mockSubscribe).toHaveBeenCalledWith(
        'report.generation.requested',
        handler,
        expect.objectContaining({
          durableName: 'report-generator-generation-requested',
          queueGroup: 'report-generator',
          maxDeliver: 3,
        }),
      );
    });

    it('should throw error if subscription fails', async () => {
      const error = new Error('Subscription failed');
      mockSubscribe.mockRejectedValue(error);
      const handler = jest.fn() as unknown as (
        event: ReportGenerationRequestedEvent,
      ) => Promise<void>;

      await expect(
        service.subscribeToReportGenerationRequested(handler),
      ).rejects.toThrow('Subscription failed');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when NATS is connected', async () => {
      mockGetHealthStatus.mockResolvedValue({
        connected: true,
        servers: ['nats://localhost:4222'],
        lastOperationTime: new Date(),
      });

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        details: {
          connected: true,
          subscriptions: {
            matchScored: 'subscribed',
            reportGeneration: 'subscribed',
          },
          reportSpecificFeatures: 'available',
        },
      });
    });

    it('should return unhealthy status when NATS is disconnected', async () => {
      mockGetHealthStatus.mockResolvedValue({
        connected: false,
        servers: [],
        lastOperationTime: new Date(),
      });

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'healthy', // healthCheck doesn't check connection status
        details: {
          connected: false,
          subscriptions: {
            matchScored: 'subscribed',
            reportGeneration: 'subscribed',
          },
          reportSpecificFeatures: 'available',
        },
      });
    });

    it('should return unhealthy status when health check throws error', async () => {
      const error = new Error('Health check failed');
      mockGetHealthStatus.mockRejectedValue(error);

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        details: {
          connected: false,
          subscriptions: {
            matchScored: 'failed',
            reportGeneration: 'failed',
          },
          reportSpecificFeatures: 'unavailable',
          error: 'Health check failed',
        },
      });
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
        service: 'report-generator-svc',
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
