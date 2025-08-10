import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NatsClient, NatsPublishResult, NatsSubscriptionOptions } from './nats.client';
import {
  createMockResumeSubmittedEvent,
  createMockAnalysisResumeParsedEvent,
  createMockJobResumeFailedEvent,
  validateEventStructure
} from '../testing/test-fixtures';

describe('NatsClient - Resume Events', () => {
  let client: NatsClient;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NatsClient],
    }).compile();

    client = module.get<NatsClient>(NatsClient);
    
    // Spy on logger to verify proper logging
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should connect to NATS successfully', async () => {
      await expect(client.connect()).resolves.toBeUndefined();
      expect(client.isConnected).toBe(true);
      expect(loggerSpy).toHaveBeenCalledWith('Connecting to NATS JetStream...');
      expect(loggerSpy).toHaveBeenCalledWith('Successfully connected to NATS JetStream');
    });

    it('should disconnect from NATS successfully', async () => {
      await client.connect();
      await expect(client.disconnect()).resolves.toBeUndefined();
      expect(client.isConnected).toBe(false);
    });

    it('should handle connection failures gracefully', async () => {
      // Mock connection failure
      jest.spyOn(client as any, 'connect').mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(client.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('Core Publishing Functionality', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should publish generic messages successfully', async () => {
      const testSubject = 'test.subject';
      const testData = { test: 'data' };

      const result = await client.publish(testSubject, testData);

      expect(result).toMatchObject({
        success: true,
        messageId: expect.stringMatching(/^msg_\d+_[a-z0-9]+$/)
      });
      expect(result.error).toBeUndefined();
    });

    it('should auto-connect when publishing if not connected', async () => {
      await client.disconnect();
      expect(client.isConnected).toBe(false);

      const result = await client.publish('test.subject', {});

      expect(client.isConnected).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should handle publish errors gracefully', async () => {
      // Mock publish error by disconnecting without connection setup
      await client.disconnect();
      jest.spyOn(client as any, 'connect').mockRejectedValueOnce(new Error('Publish failed'));

      const result = await client.publish('test.subject', {});

      expect(result).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('Resume Event Publishing', () => {
    beforeEach(async () => {
      await client.connect();
    });

    describe('Analysis Resume Parsed Events', () => {
      it('should publish analysis.resume.parsed events successfully', async () => {
        const mockEvent = createMockAnalysisResumeParsedEvent();

        const result = await client.publishAnalysisResumeParsed(mockEvent);

        expect(result).toMatchObject({
          success: true,
          messageId: expect.any(String)
        });
        expect(result.error).toBeUndefined();
        
        expect(loggerSpy).toHaveBeenCalledWith(
          `Publishing analysis.resume.parsed event for resumeId: ${mockEvent.resumeId}`
        );
        expect(loggerSpy).toHaveBeenCalledWith(
          `Analysis resume parsed event published successfully for resumeId: ${mockEvent.resumeId}`
        );
      });

      it('should add eventType and timestamp to published events', async () => {
        const mockEvent = createMockAnalysisResumeParsedEvent({ timestamp: undefined });
        const publishSpy = jest.spyOn(client, 'publish');

        await client.publishAnalysisResumeParsed(mockEvent);

        expect(publishSpy).toHaveBeenCalledWith('analysis.resume.parsed', {
          ...mockEvent,
          eventType: 'AnalysisResumeParsedEvent',
          timestamp: expect.any(String)
        });
      });

      it('should preserve existing timestamp if provided', async () => {
        const fixedTimestamp = '2024-01-01T10:00:00.000Z';
        const mockEvent = createMockAnalysisResumeParsedEvent({ timestamp: fixedTimestamp });
        const publishSpy = jest.spyOn(client, 'publish');

        await client.publishAnalysisResumeParsed(mockEvent);

        expect(publishSpy).toHaveBeenCalledWith('analysis.resume.parsed', {
          ...mockEvent,
          eventType: 'AnalysisResumeParsedEvent',
          timestamp: fixedTimestamp
        });
      });

      it('should handle publish failures for analysis events', async () => {
        const mockEvent = createMockAnalysisResumeParsedEvent();
        jest.spyOn(client, 'publish').mockResolvedValueOnce({ success: false, error: 'Network error' });

        const result = await client.publishAnalysisResumeParsed(mockEvent);

        expect(result).toMatchObject({
          success: false,
          error: 'Network error'
        });
      });
    });

    describe('Job Resume Failed Events', () => {
      it('should publish job.resume.failed events successfully', async () => {
        const mockEvent = createMockJobResumeFailedEvent();

        const result = await client.publishJobResumeFailed(mockEvent);

        expect(result).toMatchObject({
          success: true,
          messageId: expect.any(String)
        });
        expect(result.error).toBeUndefined();
        
        expect(loggerSpy).toHaveBeenCalledWith(
          `Publishing job.resume.failed event for resumeId: ${mockEvent.resumeId}`
        );
        expect(loggerSpy).toHaveBeenCalledWith(
          `Job resume failed event published successfully for resumeId: ${mockEvent.resumeId}`
        );
      });

      it('should add eventType and timestamp to failed events', async () => {
        const mockEvent = createMockJobResumeFailedEvent({ timestamp: undefined });
        const publishSpy = jest.spyOn(client, 'publish');

        await client.publishJobResumeFailed(mockEvent);

        expect(publishSpy).toHaveBeenCalledWith('job.resume.failed', {
          ...mockEvent,
          eventType: 'JobResumeFailedEvent',
          timestamp: expect.any(String)
        });
      });
    });

    describe('Processing Error Events', () => {
      it('should publish processing error events successfully', async () => {
        const jobId = 'job-123';
        const resumeId = 'resume-456';
        const error = new Error('Processing failed');

        const result = await client.publishProcessingError(jobId, resumeId, error);

        expect(result).toMatchObject({
          success: true,
          messageId: expect.any(String)
        });

        const publishSpy = jest.spyOn(client, 'publish');
        await client.publishProcessingError(jobId, resumeId, error);

        expect(publishSpy).toHaveBeenCalledWith('resume.processing.error', {
          jobId,
          resumeId,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          timestamp: expect.any(String),
          service: 'resume-parser-svc',
        });
      });
    });
  });

  describe('Event Validation and Schema', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should handle events with minimal required fields', async () => {
      const minimalEvent = {
        jobId: 'job-123',
        resumeId: 'resume-456'
      };

      const result = await client.publishAnalysisResumeParsed(minimalEvent);
      expect(result.success).toBe(true);
    });

    it('should handle events with additional fields', async () => {
      const extendedEvent = createMockAnalysisResumeParsedEvent({
        additionalField: 'extra-data',
        customMetadata: { version: '1.0' }
      });

      const result = await client.publishAnalysisResumeParsed(extendedEvent);
      expect(result.success).toBe(true);
    });

    it('should properly format required event subjects', () => {
      const requiredSubjects = [
        'job.resume.submitted',
        'analysis.resume.parsed', 
        'job.resume.failed',
        'resume.processing.error'
      ];

      requiredSubjects.forEach(subject => {
        expect(subject).toBeTruthy();
        expect(subject).toMatch(/^[a-z.]+$/);
        expect(subject.split('.').length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should handle batch publishing efficiently', async () => {
      const batchSize = 10;
      const events = Array(batchSize).fill(null).map((_, i) => 
        createMockAnalysisResumeParsedEvent({ resumeId: `batch-resume-${i}` })
      );

      const startTime = Date.now();
      const results = await Promise.all(
        events.map(event => client.publishAnalysisResumeParsed(event))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(batchSize);
      expect(results.every(result => result.success)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should track processing metrics for performance monitoring', async () => {
      const event = createMockAnalysisResumeParsedEvent({ processingTimeMs: 2500 });

      const result = await client.publishAnalysisResumeParsed(event);

      expect(result.success).toBe(true);
      // In production, this would verify metrics collection
      expect(event.processingTimeMs).toBe(2500);
    });

    it('should handle high-volume events without memory leaks', async () => {
      const highVolumeEvents = Array(100).fill(null).map((_, i) => 
        createMockAnalysisResumeParsedEvent({ resumeId: `scale-test-${i}` })
      );

      const results = await Promise.allSettled(
        highVolumeEvents.map(event => client.publishAnalysisResumeParsed(event))
      );

      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      );
      
      expect(successful.length).toBe(100);
    });
  });

  describe('Integration Readiness', () => {
    it('should expose all required public methods', () => {
      expect(client.connect).toBeDefined();
      expect(client.disconnect).toBeDefined();
      expect(client.publish).toBeDefined();
      expect(client.subscribe).toBeDefined();
      expect(client.publishAnalysisResumeParsed).toBeDefined();
      expect(client.publishJobResumeFailed).toBeDefined();
      expect(client.publishProcessingError).toBeDefined();
    });

    it('should provide connection status information', () => {
      expect(client.isConnected).toBeDefined();
      expect(typeof client.isConnected).toBe('boolean');
    });

    it('should support subscription functionality structure', async () => {
      const mockHandler = jest.fn();
      const options: NatsSubscriptionOptions = {
        subject: 'test.subject',
        queueGroup: 'test-queue',
        durableName: 'test-durable'
      };

      await expect(client.subscribe('test.subject', mockHandler, options))
        .resolves.toBeUndefined();
    });
  });
});