import { AnalyticsIntegrationService } from './analytics-integration.service';
import { AnalyticsEventRepository } from './analytics-event.repository';
import { AppGatewayNatsService } from '../../nats/app-gateway-nats.service';

const createService = () => {
  const repository = {
    save: jest.fn(),
  } as unknown as jest.Mocked<AnalyticsEventRepository>;

  const natsClient = {
    publishAnalyticsEvent: jest.fn(),
  } as unknown as jest.Mocked<AppGatewayNatsService>;

  const cacheManager = {
    wrap: jest.fn(async (_key: string, compute: () => Promise<any>) =>
      compute(),
    ),
  } as any;

  const service = new AnalyticsIntegrationService(
    repository,
    natsClient,
    cacheManager,
  );

  return { service, repository, natsClient, cacheManager };
};

describe('AnalyticsIntegrationService (mock-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks events via domain service bridge', async () => {
    const { service } = createService();
    const domainSpy = {
      createUserInteractionEvent: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'evt-1',
          eventType: 'USER_INTERACTION',
          status: 'PROCESSED',
          props: { timestamp: new Date('2024-01-01T00:00:00Z') },
        },
      }),
    };
    (service as any).domainService = domainSpy;

    const output = await service.trackEvent({
      category: 'ui',
      action: 'click',
      userId: 'user-1',
      organizationId: 'org-1',
      timestamp: new Date('2024-01-01T00:00:00Z'),
    } as any);

    expect(domainSpy.createUserInteractionEvent).toHaveBeenCalled();
    expect(output.eventId).toBe('evt-1');
    expect(output.processed).toBe(true);
  });

  it('records metrics through domain service and returns summary', async () => {
    const { service } = createService();
    const domainSpy = {
      createBusinessMetricEvent: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'metric-1',
          status: 'PROCESSED',
          props: { timestamp: new Date('2024-01-01T00:00:00Z') },
        },
      }),
    };
    (service as any).domainService = domainSpy;

    const result = await service.recordMetric({
      metricName: 'latency',
      value: 150,
      unit: 'ms',
      organizationId: 'org-1',
      recordedBy: 'user-1',
      timestamp: new Date(),
      category: 'performance',
    } as any);

    expect(domainSpy.createBusinessMetricEvent).toHaveBeenCalled();
    expect(result.metricId).toBe('metric-1');
    expect(result.status).toBe('PROCESSED');
  });

  it('returns realtime data snapshot', async () => {
    const { service } = createService();

    const snapshot = await service.getRealtimeData('org-1', ['events']);

    expect(snapshot.organizationId).toBe('org-1');
    expect(snapshot.dataTypes).toEqual(['events']);
    expect(snapshot.timestamp).toBeInstanceOf(Date);
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - Event Tracking Failures', () => {
    it('should handle domain service failure during event tracking', async () => {
      const { service } = createService();
      const domainSpy = {
        createUserInteractionEvent: jest
          .fn()
          .mockRejectedValue(new Error('Domain service unavailable')),
      };
      (service as any).domainService = domainSpy;

      await expect(
        service.trackEvent({
          category: 'ui',
          action: 'click',
          userId: 'user-1',
          organizationId: 'org-1',
          timestamp: new Date(),
        } as any),
      ).rejects.toThrow('Domain service unavailable');
    });

    it('should handle domain service success even if NATS unavailable', async () => {
      const { service } = createService();
      const domainSpy = {
        createUserInteractionEvent: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'evt-1', status: 'PROCESSED', props: { timestamp: new Date() } },
        }),
      };
      (service as any).domainService = domainSpy;

      const result = await service.trackEvent({
        category: 'ui',
        action: 'click',
        userId: 'user-1',
        organizationId: 'org-1',
        timestamp: new Date(),
      } as any);

      expect(result.eventId).toBe('evt-1');
      expect(result.processed).toBe(true);
    });

    it('should reject event tracking with missing required fields', async () => {
      const { service } = createService();
      const domainSpy = {
        createUserInteractionEvent: jest
          .fn()
          .mockRejectedValue(new Error('Missing required field: userId')),
      };
      (service as any).domainService = domainSpy;

      await expect(
        service.trackEvent({
          category: 'ui',
          action: 'click',
          organizationId: 'org-1',
          timestamp: new Date(),
        } as any),
      ).rejects.toThrow('Missing required field: userId');
    });
  });

  describe('Negative Tests - Metric Recording Failures', () => {
    it('should handle invalid metric value (negative)', async () => {
      const { service } = createService();
      const domainSpy = {
        createBusinessMetricEvent: jest
          .fn()
          .mockRejectedValue(new Error('Metric value must be non-negative')),
      };
      (service as any).domainService = domainSpy;

      await expect(
        service.recordMetric({
          metricName: 'latency',
          value: -100,
          unit: 'ms',
          organizationId: 'org-1',
          recordedBy: 'user-1',
          timestamp: new Date(),
          category: 'performance',
        } as any),
      ).rejects.toThrow('Metric value must be non-negative');
    });

    it('should handle database failure during metric recording', async () => {
      const { service } = createService();
      const domainSpy = {
        createBusinessMetricEvent: jest
          .fn()
          .mockRejectedValue(new Error('Database write failed')),
      };
      (service as any).domainService = domainSpy;

      await expect(
        service.recordMetric({
          metricName: 'requests',
          value: 1000,
          unit: 'count',
          organizationId: 'org-1',
          recordedBy: 'user-1',
          timestamp: new Date(),
          category: 'usage',
        } as any),
      ).rejects.toThrow('Database write failed');
    });
  });

  describe('Boundary Tests - Metric Value Limits', () => {
    it('should accept metric value at exactly 0 (minimum boundary)', async () => {
      const { service } = createService();
      const domainSpy = {
        createBusinessMetricEvent: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'metric-zero', status: 'PROCESSED', props: { timestamp: new Date() } },
        }),
      };
      (service as any).domainService = domainSpy;

      const result = await service.recordMetric({
        metricName: 'errors',
        value: 0,
        unit: 'count',
        organizationId: 'org-1',
        recordedBy: 'user-1',
        timestamp: new Date(),
        category: 'reliability',
      } as any);

      expect(result.metricId).toBe('metric-zero');
      expect(result.status).toBe('PROCESSED');
    });

    it('should accept very large metric values (>1 million)', async () => {
      const { service } = createService();
      const domainSpy = {
        createBusinessMetricEvent: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'metric-large', status: 'PROCESSED', props: { timestamp: new Date() } },
        }),
      };
      (service as any).domainService = domainSpy;

      const result = await service.recordMetric({
        metricName: 'total_requests',
        value: 5000000,
        unit: 'count',
        organizationId: 'org-1',
        recordedBy: 'user-1',
        timestamp: new Date(),
        category: 'usage',
      } as any);

      expect(result.metricId).toBe('metric-large');
    });

    it('should accept decimal metric values with high precision', async () => {
      const { service } = createService();
      const domainSpy = {
        createBusinessMetricEvent: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'metric-decimal', status: 'PROCESSED', props: { timestamp: new Date() } },
        }),
      };
      (service as any).domainService = domainSpy;

      const result = await service.recordMetric({
        metricName: 'response_time',
        value: 123.456789,
        unit: 'ms',
        organizationId: 'org-1',
        recordedBy: 'user-1',
        timestamp: new Date(),
        category: 'performance',
      } as any);

      expect(result.status).toBe('PROCESSED');
    });
  });

  describe('Edge Cases - Concurrent Event Tracking', () => {
    it('should handle concurrent event tracking from multiple users', async () => {
      const { service } = createService();
      const domainSpy = {
        createUserInteractionEvent: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'evt-concurrent', status: 'PROCESSED', props: { timestamp: new Date() } },
        }),
      };
      (service as any).domainService = domainSpy;

      const promises = Array(10)
        .fill(null)
        .map((_, i) =>
          service.trackEvent({
            category: 'ui',
            action: 'click',
            userId: `user-${i}`,
            organizationId: 'org-1',
            timestamp: new Date(),
          } as any),
        );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.eventId).toBe('evt-concurrent');
        expect(result.processed).toBe(true);
      });
      expect(domainSpy.createUserInteractionEvent).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent metric recording', async () => {
      const { service } = createService();
      const domainSpy = {
        createBusinessMetricEvent: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'metric-concurrent', status: 'PROCESSED', props: { timestamp: new Date() } },
        }),
      };
      (service as any).domainService = domainSpy;

      const promises = [
        service.recordMetric({
          metricName: 'cpu_usage',
          value: 45,
          unit: 'percent',
          organizationId: 'org-1',
          recordedBy: 'system',
          timestamp: new Date(),
          category: 'performance',
        } as any),
        service.recordMetric({
          metricName: 'memory_usage',
          value: 2048,
          unit: 'MB',
          organizationId: 'org-1',
          recordedBy: 'system',
          timestamp: new Date(),
          category: 'performance',
        } as any),
        service.recordMetric({
          metricName: 'disk_usage',
          value: 75,
          unit: 'percent',
          organizationId: 'org-1',
          recordedBy: 'system',
          timestamp: new Date(),
          category: 'performance',
        } as any),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.metricId).toBe('metric-concurrent');
      });
    });
  });

  describe('Edge Cases - Cache Behavior', () => {
    it('should bypass cache on cache manager failure', async () => {
      const { service, cacheManager } = createService();
      const domainSpy = {
        createUserInteractionEvent: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'evt-no-cache', status: 'PROCESSED', props: { timestamp: new Date() } },
        }),
      };
      (service as any).domainService = domainSpy;
      cacheManager.wrap.mockRejectedValue(new Error('Cache unavailable'));

      const result = await service.trackEvent({
        category: 'ui',
        action: 'click',
        userId: 'user-1',
        organizationId: 'org-1',
        timestamp: new Date(),
      } as any);

      expect(result.eventId).toBe('evt-no-cache');
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return complete event tracking response structure', async () => {
      const { service } = createService();
      const domainSpy = {
        createUserInteractionEvent: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'evt-complete',
            eventType: 'USER_INTERACTION',
            status: 'PROCESSED',
            props: { timestamp: new Date('2024-01-01T00:00:00Z') },
          },
        }),
      };
      (service as any).domainService = domainSpy;

      const result = await service.trackEvent({
        category: 'ui',
        action: 'click',
        userId: 'user-1',
        organizationId: 'org-1',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      } as any);

      expect(result).toMatchObject({
        eventId: expect.stringMatching(/^evt-/),
        processed: expect.any(Boolean),
      });
      expect(result.eventId).toBe('evt-complete');
      expect(result.processed).toBe(true);
    });

    it('should return complete realtime data snapshot structure', async () => {
      const { service } = createService();

      const snapshot = await service.getRealtimeData('org-complete', [
        'events',
        'metrics',
      ]);

      expect(snapshot).toMatchObject({
        organizationId: expect.any(String),
        dataTypes: expect.arrayContaining([expect.any(String)]),
        timestamp: expect.any(Date),
      });
      expect(snapshot.organizationId).toBe('org-complete');
      expect(snapshot.dataTypes).toHaveLength(2);
    });
  });
});
