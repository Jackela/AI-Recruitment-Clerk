import {
  NatsStreamConfig,
  NatsConsumerConfig,
  NATS_STREAMS,
  NATS_CONNECTION_OPTIONS,
  CONSUMER_DEFAULTS,
  PUBLISH_OPTIONS,
  DLQ_CONFIG,
  HEALTH_CHECK_CONFIG,
} from './nats.config';

describe('NatsConfig', () => {
  describe('NatsStreamConfig interface', () => {
    it('should accept valid stream config', () => {
      const config: NatsStreamConfig = {
        name: 'TEST_STREAM',
        subjects: ['test.*'],
        retention: 'limits',
        max_age: 864000000000000,
        max_msgs: 1000,
        discard: 'old',
        duplicate_window: 120000000000,
      };

      expect(config.name).toBe('TEST_STREAM');
      expect(config.subjects).toContain('test.*');
      expect(config.retention).toBe('limits');
    });
  });

  describe('NatsConsumerConfig interface', () => {
    it('should accept valid consumer config', () => {
      const config: NatsConsumerConfig = {
        durable_name: 'test-consumer',
        filter_subject: 'test.subject',
        deliver_policy: 'all',
        ack_policy: 'explicit',
        max_deliver: 5,
        ack_wait: 30000000000,
      };

      expect(config.durable_name).toBe('test-consumer');
      expect(config.deliver_policy).toBe('all');
      expect(config.ack_policy).toBe('explicit');
    });
  });

  describe('NATS_STREAMS', () => {
    it('should have JOB_EVENTS stream configured', () => {
      const stream = NATS_STREAMS.JOB_EVENTS;

      expect(stream.name).toBe('JOB_EVENTS');
      expect(stream.subjects).toContain('job.*');
      expect(stream.subjects).toContain('analysis.*');
      expect(stream.retention).toBe('limits');
      expect(stream.max_msgs).toBe(10000);
      expect(stream.discard).toBe('old');
    });

    it('should have ERROR_EVENTS stream configured', () => {
      const stream = NATS_STREAMS.ERROR_EVENTS;

      expect(stream.name).toBe('ERROR_EVENTS');
      expect(stream.subjects).toContain('*.error');
      expect(stream.subjects).toContain('*.failed');
      expect(stream.max_msgs).toBe(50000);
      expect(stream.max_age).toBe(30 * 24 * 60 * 60 * 1000 * 1000000);
    });

    it('should have proper duplicate_window for deduplication', () => {
      expect(NATS_STREAMS.JOB_EVENTS.duplicate_window).toBe(
        2 * 60 * 1000 * 1000000,
      );
      expect(NATS_STREAMS.ERROR_EVENTS.duplicate_window).toBe(
        5 * 60 * 1000 * 1000000,
      );
    });
  });

  describe('NATS_CONNECTION_OPTIONS', () => {
    it('should have reconnection settings', () => {
      expect(NATS_CONNECTION_OPTIONS.maxReconnectAttempts).toBe(10);
      expect(NATS_CONNECTION_OPTIONS.reconnectTimeWait).toBe(2000);
    });

    it('should have timeout settings', () => {
      expect(NATS_CONNECTION_OPTIONS.timeout).toBe(10000);
    });

    it('should have ping settings', () => {
      expect(NATS_CONNECTION_OPTIONS.pingInterval).toBe(30000);
      expect(NATS_CONNECTION_OPTIONS.maxPingOut).toBe(3);
    });

    it('should have pedantic and verbose settings', () => {
      expect(NATS_CONNECTION_OPTIONS.pedantic).toBe(false);
      expect(NATS_CONNECTION_OPTIONS.verbose).toBe(false);
    });
  });

  describe('CONSUMER_DEFAULTS', () => {
    it('should have default deliver policy', () => {
      expect(CONSUMER_DEFAULTS.deliver_policy).toBe('new');
    });

    it('should have explicit ack policy', () => {
      expect(CONSUMER_DEFAULTS.ack_policy).toBe('explicit');
    });

    it('should have max deliver settings', () => {
      expect(CONSUMER_DEFAULTS.max_deliver).toBe(3);
    });

    it('should have ack wait in nanoseconds', () => {
      expect(CONSUMER_DEFAULTS.ack_wait).toBe(30 * 1000 * 1000000);
    });
  });

  describe('PUBLISH_OPTIONS', () => {
    it('should have timeout setting', () => {
      expect(PUBLISH_OPTIONS.timeout).toBe(5000);
    });

    it('should have retry settings', () => {
      expect(PUBLISH_OPTIONS.retries).toBe(3);
      expect(PUBLISH_OPTIONS.retryDelay).toBe(1000);
    });
  });

  describe('DLQ_CONFIG', () => {
    it('should have max deliver setting', () => {
      expect(DLQ_CONFIG.max_deliver).toBe(3);
    });

    it('should have ack wait setting', () => {
      expect(DLQ_CONFIG.ack_wait).toBe(30 * 1000 * 1000000);
    });

    it('should have exponential backoff retry strategy', () => {
      expect(DLQ_CONFIG.retry_backoff).toEqual([1000, 5000, 15000]);
    });
  });

  describe('HEALTH_CHECK_CONFIG', () => {
    it('should have interval setting', () => {
      expect(HEALTH_CHECK_CONFIG.interval).toBe(30000);
    });

    it('should have timeout setting', () => {
      expect(HEALTH_CHECK_CONFIG.timeout).toBe(5000);
    });

    it('should have retry setting', () => {
      expect(HEALTH_CHECK_CONFIG.retries).toBe(3);
    });
  });
});
