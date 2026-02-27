import type { NatsPublishResult } from './nats.client';
import { NatsClient } from './nats.client';

describe('NatsClient', () => {
  let client: NatsClient;

  beforeEach(() => {
    client = new NatsClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Client Initialization', () => {
    it('should be defined', () => {
      expect(client).toBeDefined();
    });

    it('should be an instance of NatsClient', () => {
      expect(client).toBeInstanceOf(NatsClient);
    });
  });

  describe('publish', () => {
    it('should return success result', async () => {
      const result = await client.publish('test.subject', { data: 'test' });

      expect(result).toEqual({ success: true });
    });

    it('should return NatsPublishResult type', async () => {
      const result = await client.publish('subject', {});

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should accept string subject', async () => {
      const result = await client.publish('valid.subject.name', {});

      expect(result.success).toBe(true);
    });

    it('should accept any payload type', async () => {
      const payloads = [
        { key: 'value' },
        'string payload',
        123,
        ['array', 'payload'],
        null,
        undefined,
      ];

      for (const payload of payloads) {
        const result = await client.publish('test.subject', payload);
        expect(result.success).toBe(true);
      }
    });

    it('should not throw errors', async () => {
      await expect(
        client.publish('any.subject', { any: 'data' }),
      ).resolves.not.toThrow();
    });

    it('should handle empty subject', async () => {
      const result = await client.publish('', {});

      expect(result.success).toBe(true);
    });

    it('should handle empty payload', async () => {
      const result = await client.publish('test.subject', {});

      expect(result.success).toBe(true);
    });
  });

  describe('emit', () => {
    it('should return success result', async () => {
      const result = await client.emit('test.subject', { data: 'test' });

      expect(result).toEqual({ success: true });
    });

    it('should return NatsPublishResult type', async () => {
      const result = await client.emit('subject', {});

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should accept string subject', async () => {
      const result = await client.emit('valid.subject.name', {});

      expect(result.success).toBe(true);
    });

    it('should accept any payload type', async () => {
      const payloads = [
        { key: 'value' },
        'string payload',
        123,
        ['array', 'payload'],
        null,
        undefined,
      ];

      for (const payload of payloads) {
        const result = await client.emit('test.subject', payload);
        expect(result.success).toBe(true);
      }
    });

    it('should not throw errors', async () => {
      await expect(
        client.emit('any.subject', { any: 'data' }),
      ).resolves.not.toThrow();
    });
  });

  describe('publishProcessingError', () => {
    it('should return success result', async () => {
      const error = new Error('Test error');
      const result = await client.publishProcessingError('job-123', error);

      expect(result).toEqual({ success: true });
    });

    it('should accept jobId and error parameters', async () => {
      const result = await client.publishProcessingError(
        'job-id-string',
        new Error('Error message'),
      );

      expect(result.success).toBe(true);
    });

    it('should handle various error types', async () => {
      const errors = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new RangeError('Range error'),
        { message: 'Plain object error' } as Error,
      ];

      for (const error of errors) {
        const result = await client.publishProcessingError('job-id', error);
        expect(result.success).toBe(true);
      }
    });

    it('should not throw errors', async () => {
      await expect(
        client.publishProcessingError('job-123', new Error('Test')),
      ).resolves.not.toThrow();
    });

    it('should handle empty jobId', async () => {
      const result = await client.publishProcessingError('', new Error('Test'));

      expect(result.success).toBe(true);
    });
  });

  describe('publishAnalysisExtracted', () => {
    it('should return success result', async () => {
      const event = { jobId: 'job-123', extractedData: {} };
      const result = await client.publishAnalysisExtracted(event);

      expect(result).toEqual({ success: true });
    });

    it('should accept any event object', async () => {
      const events = [
        { jobId: 'job-1', extractedData: { skills: ['JS', 'TS'] } },
        { jobId: 'job-2', data: 'minimal' },
        {},
        null,
        undefined,
      ];

      for (const event of events) {
        const result = await client.publishAnalysisExtracted(event);
        expect(result.success).toBe(true);
      }
    });

    it('should not throw errors', async () => {
      await expect(
        client.publishAnalysisExtracted({ jobId: 'test' }),
      ).resolves.not.toThrow();
    });
  });

  describe('NatsPublishResult Type', () => {
    it('should have correct shape for success result', async () => {
      const result: NatsPublishResult = await client.publish('test', {});

      expect(result.success).toBe(true);
      expect(result.messageId).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should be serializable', async () => {
      const result = await client.publish('test', {});

      expect(() => JSON.stringify(result)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent publish calls', async () => {
      const promises = Array(10)
        .fill(null)
        .map((_, i) => client.publish(`subject.${i}`, { index: i }));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should complete quickly', async () => {
      const startTime = Date.now();

      await client.publish('test.subject', { data: 'test' });

      const duration = Date.now() - startTime;

      // Should complete in less than 10ms for mock implementation
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in subject', async () => {
      const specialSubjects = [
        'subject.with.dots',
        'subject-with-dashes',
        'subject_with_underscores',
        'subject:with:colons',
        'subject/with/slashes',
      ];

      for (const subject of specialSubjects) {
        const result = await client.publish(subject, {});
        expect(result.success).toBe(true);
      }
    });

    it('should handle large payloads', async () => {
      const largePayload = {
        data: 'x'.repeat(10000),
        array: Array(1000).fill({ key: 'value' }),
      };

      const result = await client.publish('test.subject', largePayload);

      expect(result.success).toBe(true);
    });

    it('should handle circular reference payloads gracefully', async () => {
      const circularPayload: Record<string, unknown> = { key: 'value' };
      circularPayload.self = circularPayload;

      // The mock doesn't actually serialize, so it should work
      const result = await client.publish('test.subject', circularPayload);

      expect(result.success).toBe(true);
    });
  });
});
