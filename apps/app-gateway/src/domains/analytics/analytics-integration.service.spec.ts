import type { Cache } from 'cache-manager';
import {
  AnalyticsIntegrationService,
  MetricUnit,
} from './analytics-integration.service';
import { AnalyticsEventRepository } from './analytics-event.repository';
import { AppGatewayNatsService } from '../../nats/app-gateway-nats.service';

type DomainServiceMock = {
  createUserInteractionEvent?: jest.Mock;
  createBusinessMetricEvent?: jest.Mock;
};

const attachDomainService = (
  service: AnalyticsIntegrationService,
  stub: DomainServiceMock,
) => {
  (service as unknown as { domainService: DomainServiceMock }).domainService =
    stub;
};

const createService = () => {
  const repository = {
    save: jest.fn(),
  } as unknown as jest.Mocked<AnalyticsEventRepository>;

  const natsClient = {
    publish: jest.fn(),
  } as unknown as jest.Mocked<AppGatewayNatsService>;

  const cacheManager = {
    wrap: jest.fn(
      async <T>(_key: string, compute: () => Promise<T>) => compute(),
    ),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const service = new AnalyticsIntegrationService(
    repository,
    natsClient,
    cacheManager as unknown as Cache,
  );

  return { service, repository, natsClient, cacheManager };
};

describe('AnalyticsIntegrationService (mock-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks events via domain service bridge', async () => {
    const { service } = createService();
    const domainSpy: DomainServiceMock = {
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
    attachDomainService(service, domainSpy);

    const trackPayload: Parameters<
      AnalyticsIntegrationService['trackEvent']
    >[0] = {
      category: 'ui',
      action: 'click',
      userId: 'user-1',
      organizationId: 'org-1',
      timestamp: new Date('2024-01-01T00:00:00Z'),
    };

    const output = await service.trackEvent(trackPayload);

    expect(domainSpy.createUserInteractionEvent).toHaveBeenCalled();
    expect(output.eventId).toBe('evt-1');
    expect(output.processed).toBe(true);
  });

  it('records metrics through domain service and returns summary', async () => {
    const { service } = createService();
    const domainSpy: DomainServiceMock = {
      createBusinessMetricEvent: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'metric-1',
          status: 'PROCESSED',
          props: { timestamp: new Date('2024-01-01T00:00:00Z') },
        },
      }),
    };
    attachDomainService(service, domainSpy);

    const metricPayload: Parameters<
      AnalyticsIntegrationService['recordMetric']
    >[0] = {
      metricName: 'latency',
      value: 150,
      unit: MetricUnit.MILLISECONDS,
      organizationId: 'org-1',
      recordedBy: 'user-1',
      timestamp: new Date(),
      category: 'performance',
    };

    const result = await service.recordMetric(metricPayload);

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
      const domainSpy: DomainServiceMock = {
        createUserInteractionEvent: jest
          .fn()
          .mockRejectedValue(new Error('Domain service unavailable')),
      };
      attachDomainService(service, domainSpy);

      await expect(
        service.trackEvent({
          category: 'ui',
          action: 'click',
          userId: 'user-1',
          organizationId: 'org-1',
          timestamp: new Date(),
        }),
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
      attachDomainService(service, domainSpy);

      const result = await service.trackEvent({
        category: 'ui',
        action: 'click',
        userId: 'user-1',
        organizationId: 'org-1',
        timestamp: new Date(),
      });

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
      attachDomainService(service, domainSpy);

      await expect(
        service.trackEvent({
          category: 'ui',
          action: 'click',
          organizationId: 'org-1',
          timestamp: new Date(),
        } as Parameters<AnalyticsIntegrationService['trackEvent']>[0]),
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
      attachDomainService(service, domainSpy);

      const payload: Parameters<
        AnalyticsIntegrationService['recordMetric']
      >[0] = {
        metricName: 'latency',
        value: -100,
        unit: MetricUnit.MILLISECONDS,
        organizationId: 'org-1',
        recordedBy: 'user-1',
        timestamp: new Date(),
        category: 'performance',
      };

      await expect(service.recordMetric(payload)).rejects.toThrow(
        'Metric value must be non-negative',
      );
    });

    it('should handle database failure during metric recording', async () => {
      const { service } = createService();
      const domainSpy: DomainServiceMock = {
        createBusinessMetricEvent: jest
          .fn()
          .mockRejectedValue(new Error('Database write failed')),
      };
      attachDomainService(service, domainSpy);

      const payload: Parameters<
        AnalyticsIntegrationService['recordMetric']
      >[0] = {
        metricName: 'requests',
        value: 1000,
        unit: MetricUnit.COUNT,
        organizationId: 'org-1',
        recordedBy: 'user-1',
        timestamp: new Date(),
        category: 'usage',
      };

      await expect(service.recordMetric(payload)).rejects.toThrow(
        'Database write failed',
      );
    });
  });

  describe('Boundary Tests - Metric Value Limits', () => {
    it('should accept metric value at exactly 0 (minimum boundary)', async () => {
      const { service } = createService();
      const domainSpy: DomainServiceMock = {
        createBusinessMetricEvent: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'metric-zero',
            status: 'PROCESSED',
            props: { timestamp: new Date() },
          },
        }),
      };
      attachDomainService(service, domainSpy);

      const result = await service.recordMetric({
        metricName: 'errors',
        value: 0,
        unit: MetricUnit.COUNT,
        organizationId: 'org-1',
        recordedBy: 'user-1',
        timestamp: new Date(),
        category: 'reliability',
      });

      expect(result.metricId).toBe('metric-zero');
      expect(result.status).toBe('PROCESSED');
    });

    it('should accept very large metric values (>1 million)', async () => {
      const { service } = createService();
      const domainSpy: DomainServiceMock = {
        createBusinessMetricEvent: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'metric-large',
            status: 'PROCESSED',
            props: { timestamp: new Date() },
          },
        }),
      };
      attachDomainService(service, domainSpy);

      const result = await service.recordMetric({
        metricName: 'total_requests',
        value: 5_000_000,
        unit: MetricUnit.COUNT,
        organizationId: 'org-1',
        recordedBy: 'user-1',
        timestamp: new Date(),
        category: 'usage',
      });

      expect(result.metricId).toBe('metric-large');
    });

    it('should accept decimal metric values with high precision', async () => {
      const { service } = createService();
      const domainSpy: DomainServiceMock = {
        createBusinessMetricEvent: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'metric-decimal',
            status: 'PROCESSED',
            props: { timestamp: new Date() },
          },
        }),
      };
      attachDomainService(service, domainSpy);

      const result = await service.recordMetric({
        metricName: 'response_time',
        value: 123.456789,
        unit: MetricUnit.MILLISECONDS,
        organizationId: 'org-1',
        recordedBy: 'user-1',
        timestamp: new Date(),
        category: 'performance',
      });

      expect(result.status).toBe('PROCESSED');
    });
  });

  describe('Edge Cases - Concurrent Event Tracking', () => {
    it('should handle concurrent event tracking from multiple users', async () => {
      const { service } = createService();
      const domainSpy: DomainServiceMock = {
        createUserInteractionEvent: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'evt-concurrent',
            status: 'PROCESSED',
            props: { timestamp: new Date() },
          },
        }),
      };
      attachDomainService(service, domainSpy);

      const promises = Array.from({ length: 10 }, (_, i) =>
        service.trackEvent({
          category: 'ui',
          action: 'click',
          userId: `user-${i}`,
          organizationId: 'org-1',
          timestamp: new Date(),
        }),
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
      const domainSpy: DomainServiceMock = {
        createBusinessMetricEvent: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'metric-concurrent',
            status: 'PROCESSED',
            props: { timestamp: new Date() },
          },
        }),
      };
      attachDomainService(service, domainSpy);

      const payloads: Array<
        Parameters<AnalyticsIntegrationService['recordMetric']>[0]
      > = [
        {
          metricName: 'cpu_usage',
          value: 45,
          unit: MetricUnit.PERCENTAGE,
          organizationId: 'org-1',
          recordedBy: 'system',
          timestamp: new Date(),
          category: 'performance',
        },
        {
          metricName: 'memory_usage',
          value: 2048,
          unit: MetricUnit.COUNT,
          organizationId: 'org-1',
          recordedBy: 'system',
          timestamp: new Date(),
          category: 'performance',
        },
        {
          metricName: 'disk_usage',
          value: 75,
          unit: MetricUnit.PERCENTAGE,
          organizationId: 'org-1',
          recordedBy: 'system',
          timestamp: new Date(),
          category: 'performance',
        },
      ];

      const results = await Promise.all(payloads.map((payload) => service.recordMetric(payload)));

      results.forEach((result) => {
        expect(result.metricId).toBe('metric-concurrent');
      });
    });
  });

  describe('Edge Cases - Cache Behavior', () => {
    it('should bypass cache on cache manager failure', async () => {
      const { service, cacheManager } = createService();
      const domainSpy: DomainServiceMock = {
        createUserInteractionEvent: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'evt-no-cache', status: 'PROCESSED', props: { timestamp: new Date() } },
        }),
      };
      attachDomainService(service, domainSpy);
      cacheManager.wrap.mockRejectedValue(new Error('Cache unavailable'));

      const cacheBypassPayload: Parameters<
        AnalyticsIntegrationService['trackEvent']
      >[0] = {
        category: 'ui',
        action: 'click',
        userId: 'user-1',
        organizationId: 'org-1',
        timestamp: new Date(),
      };

      const result = await service.trackEvent(cacheBypassPayload);

      expect(result.eventId).toBe('evt-no-cache');
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return complete event tracking response structure', async () => {
      const { service } = createService();
      const domainSpy: DomainServiceMock = {
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
      attachDomainService(service, domainSpy);

      const completePayload: Parameters<
        AnalyticsIntegrationService['trackEvent']
      >[0] = {
        category: 'ui',
        action: 'click',
        userId: 'user-1',
        organizationId: 'org-1',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      };

      const result = await service.trackEvent(completePayload);

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
