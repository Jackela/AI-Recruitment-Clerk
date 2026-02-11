import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JdExtractorNatsService } from './jd-extractor-nats.service';
import type {
  NatsConnectionManager,
  NatsStreamManager,
} from '@ai-recruitment-clerk/shared-nats-client';

describe('JdExtractorNatsService', () => {
  let service: JdExtractorNatsService;
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
          MONGODB_URI: 'mongodb://testuser:testpass@localhost:27018/jd-extractor-test',
          NATS_SERVERS: 'nats://testuser:testpass@localhost:4223',
          SERVICE_NAME: 'jd-extractor-svc-test',
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
    service = new JdExtractorNatsService(
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

  describe('publishAnalysisJdExtracted', () => {
    const mockEvent = {
      jobId: 'job-123',
      extractedData: {
        title: 'Software Engineer',
        skills: ['JavaScript', 'TypeScript'],
        location: 'Remote',
      },
      processingTimeMs: 1500,
      confidence: 0.92,
      extractionMethod: 'llm-structured',
    };

    it('should publish analysis JD extracted event successfully', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-789',
      });

      const result = await service.publishAnalysisJdExtracted(mockEvent);

      expect(result).toEqual({
        success: true,
        messageId: 'msg-789',
      });

      expect(mockPublish).toHaveBeenCalledWith(
        'analysis.jd.extracted',
        expect.objectContaining({
          jobId: 'job-123',
          extractedData: mockEvent.extractedData,
          processingTimeMs: 1500,
          confidence: 0.92,
          extractionMethod: 'llm-structured',
          performance: {
            processingTimeMs: 1500,
            extractionMethod: 'llm-structured',
          },
          quality: {
            confidence: 0.92,
            extractedFields: 3,
          },
          timestamp: expect.any(String),
          service: 'jd-extractor-svc',
          eventType: expect.any(String),
        }),
        expect.objectContaining({
          messageId: expect.stringContaining('jd-extracted-job-123'),
          timeout: 5000,
          headers: expect.objectContaining({
            'job-id': 'job-123',
            'confidence': '0.92',
            'source-service': 'jd-extractor-svc',
            'event-type': expect.any(String),
          }),
        }),
      );
    });

    it('should use default values when confidence and extractionMethod are not provided', async () => {
      const eventWithoutOptionals = {
        jobId: 'job-456',
        extractedData: { title: 'Senior Developer' },
        processingTimeMs: 2000,
      };

      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-999',
      });

      await service.publishAnalysisJdExtracted(eventWithoutOptionals);

      expect(mockPublish).toHaveBeenCalledWith(
        'analysis.jd.extracted',
        expect.objectContaining({
          performance: {
            processingTimeMs: 2000,
            extractionMethod: 'llm-structured',
          },
          quality: {
            confidence: 0.85,
            extractedFields: 1,
          },
        }),
        expect.anything(),
      );
    });

    it('should count extracted fields correctly', async () => {
      const eventWithEmptyFields = {
        jobId: 'job-789',
        extractedData: {
          title: 'Developer',
          skills: [],
          requirements: null,
          description: '',
        },
        processingTimeMs: 1000,
      };

      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-111',
      });

      await service.publishAnalysisJdExtracted(eventWithEmptyFields);

      expect(mockPublish).toHaveBeenCalledWith(
        'analysis.jd.extracted',
        expect.objectContaining({
          quality: {
            extractedFields: 1,
            confidence: expect.any(Number),
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

      const result = await service.publishAnalysisJdExtracted(mockEvent);

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

      const result = await service.publishAnalysisJdExtracted(mockEvent);

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error',
        metadata: expect.objectContaining({
          subject: 'analysis.jd.extracted',
        }),
      });

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error publishing event'),
        error,
      );
    });
  });

  describe('publishProcessingError', () => {
    const mockError = new Error('Extraction failed');

    it('should publish processing error event successfully', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-333',
      });

      const result = await service.publishProcessingError(
        'job-111',
        mockError,
        {
          stage: 'extraction',
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

      await service.publishProcessingError('job-222', mockError);

      expect(mockPublish).toHaveBeenCalled();
    });

    it('should handle publish failure for error events', async () => {
      mockPublish.mockResolvedValue({
        success: false,
        error: 'Queue full',
      });

      const result = await service.publishProcessingError(
        'job-333',
        mockError,
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

      const result = await service.publishProcessingError(
        'job-444',
        mockError,
      );

      expect(result).toEqual({
        success: false,
        error: 'Network timeout',
        metadata: expect.objectContaining({
          subject: 'job.jd.failed',
        }),
      });
    });
  });

  describe('publishExtractionStarted', () => {
    it('should publish extraction started event successfully', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-555',
      });

      const event = {
        jobId: 'job-666',
        inputSize: 1024000,
        expectedProcessingTime: 5000,
      };

      const result = await service.publishExtractionStarted(event);

      expect(result).toEqual({
        success: true,
        messageId: 'msg-555',
      });

      expect(mockPublish).toHaveBeenCalledWith(
        'job.jd.started',
        expect.objectContaining({
          jobId: 'job-666',
          inputSize: 1024000,
          expectedProcessingTime: 5000,
        }),
        expect.objectContaining({
          messageId: expect.stringContaining('jd-started-job-666'),
          timeout: 5000,
          headers: expect.objectContaining({
            'job-id': 'job-666',
            'source-service': 'jd-extractor-svc',
          }),
        }),
      );
    });

    it('should publish started event with minimal data', async () => {
      mockPublish.mockResolvedValue({
        success: true,
        messageId: 'msg-777',
      });

      const minimalEvent = {
        jobId: 'job-888',
      };

      const result = await service.publishExtractionStarted(minimalEvent);

      expect(result).toEqual({
        success: true,
        messageId: 'msg-777',
      });

      expect(mockPublish).toHaveBeenCalledWith(
        'job.jd.started',
        expect.objectContaining({
          jobId: 'job-888',
        }),
        expect.anything(),
      );
    });
  });

  describe('subscribeToJobSubmissions', () => {
    it('should subscribe to job submissions successfully', async () => {
      mockSubscribe.mockResolvedValue(undefined);
      const handler = jest.fn();

      await service.subscribeToJobSubmissions(handler);

      // subscribeToEvents calls subscribe with the correct parameters
      expect(mockSubscribe).toHaveBeenCalledWith(
        'job.submitted',
        handler,
        expect.objectContaining({
          durableName: 'jd-extractor-job-submissions',
          queueGroup: 'jd-extraction',
          maxDeliver: 3,
        }),
      );
    });

    it('should throw error if subscription fails', async () => {
      const error = new Error('Subscription failed');
      mockSubscribe.mockRejectedValue(error);
      const handler = jest.fn();

      await expect(service.subscribeToJobSubmissions(handler)).rejects.toThrow(
        'Subscription failed',
      );
    });
  });

  describe('countExtractedFields', () => {
    it('should count non-empty fields correctly', () => {
      const countExtractedFields = (service as any).countExtractedFields.bind(
        service,
      );

      const data = {
        title: 'Software Engineer',
        skills: ['JavaScript', 'Python'],
        requirements: ['React', 'Node.js'],
        location: '',
        salary: null,
      };

      const count = countExtractedFields(data);
      expect(count).toBe(3); // title, skills, requirements (empty string and null don't count)
    });

    it('should return 0 for null or undefined data', () => {
      const countExtractedFields = (service as any).countExtractedFields.bind(
        service,
      );

      expect(countExtractedFields(null)).toBe(0);
      expect(countExtractedFields(undefined)).toBe(0);
    });

    it('should return 0 for non-object data', () => {
      const countExtractedFields = (service as any).countExtractedFields.bind(
        service,
      );

      expect(countExtractedFields('string')).toBe(0);
      expect(countExtractedFields(123)).toBe(0);
    });

    it('should count arrays with content', () => {
      const countExtractedFields = (service as any).countExtractedFields.bind(
        service,
      );

      const data = {
        emptyArray: [],
        nonEmptyArray: ['item1', 'item2'],
      };

      const count = countExtractedFields(data);
      expect(count).toBe(1); // only nonEmptyArray counts
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
        service: 'jd-extractor-svc',
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
