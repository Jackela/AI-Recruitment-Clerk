import { MetricsController } from './metrics.controller';
import type { AnalyticsIntegrationService } from './analytics-integration.service';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';

const createServiceMock = () => ({
  trackEvent: jest.fn(),
  recordMetric: jest.fn(),
  getDashboard: jest.fn(),
  getRealtimeData: jest.fn(),
  getHealthStatus: jest.fn(),
}) as unknown as jest.Mocked<AnalyticsIntegrationService>;

const createRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    user: {
      id: 'user-1',
      organizationId: 'org-1',
      permissions: [Permission.READ_ANALYSIS, Permission.TRACK_METRICS],
    },
    headers: { 'user-agent': 'jest-agent' },
    ip: '203.0.113.10',
    ...overrides,
  } as any);

describe('MetricsController (mocked service)', () => {
  let controller: MetricsController;
  let service: jest.Mocked<AnalyticsIntegrationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createServiceMock();
    controller = new MetricsController(service);
  });

  describe('trackEvent', () => {
    const eventBody = {
      eventType: 'click',
      category: 'ui',
      action: 'open-modal',
    };

    it('returns success payload when analytics service resolves', async () => {
      service.trackEvent.mockResolvedValue({
        eventId: 'event-123',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        eventType: 'USER_INTERACTION',
        processed: true,
      });

      const result = await controller.trackEvent(createRequest(), eventBody);

      expect(service.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          organizationId: 'org-1',
          category: 'ui',
        }),
      );
      expect(result.success).toBe(true);
      expect(result.data?.eventId).toBe('event-123');
    });

    it('returns error payload when analytics service throws', async () => {
      service.trackEvent.mockRejectedValue(new Error('failure'));

      const result = await controller.trackEvent(createRequest(), eventBody);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to track event');
    });
  });

  describe('recordPerformanceMetric', () => {
    it('delegates metric recording to service', async () => {
      service.recordMetric.mockResolvedValue({
        metricId: 'metric-1',
        metricName: 'latency',
        value: 120,
        timestamp: new Date(),
      } as any);

      const response = await controller.recordPerformanceMetric(
        createRequest(),
        {
          metricName: 'latency',
          value: 120,
          unit: 'ms',
          operation: 'GET /jobs',
          service: 'app-gateway',
          status: 'success',
        },
      );

      expect(service.recordMetric).toHaveBeenCalled();
      expect(response.success).toBe(true);
    });
  });

  describe('recordBusinessMetric', () => {
    it('delegates business metric recording to service', async () => {
      service.recordMetric.mockResolvedValue({
        metricId: 'metric-2',
        metricName: 'conversion_rate',
        value: 0.15,
        category: 'business',
        timestamp: new Date(),
      } as any);

      const response = await controller.recordBusinessMetric(
        createRequest(),
        {
          metricName: 'conversion_rate',
          value: 0.15,
          unit: 'percentage',
          category: 'sales',
        },
      );

      expect(service.recordMetric).toHaveBeenCalled();
      expect(response.success).toBe(true);
    });
  });

  describe('getDashboard', () => {
    it('returns dashboard data from service', async () => {
      service.getDashboard.mockResolvedValue({
        summary: { events: 5 },
      } as any);

      const result = await controller.getDashboard(createRequest());

      expect(service.getDashboard).toHaveBeenCalledWith('org-1', '7d', undefined);
      expect(result.success).toBe(true);
      expect((result.data as any).summary.events).toBe(5);
    });
  });

  describe('getRealtimeData', () => {
    it('returns realtime data from service', async () => {
      service.getRealtimeData.mockResolvedValue({
        activeUsers: 10,
        eventsPerMinute: 50,
      } as any);

      const result = await controller.getRealtimeData(createRequest());

      expect(service.getRealtimeData).toHaveBeenCalledWith('org-1', []);
      expect(result.success).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('returns health status from service', async () => {
      service.getHealthStatus.mockResolvedValue({
        overall: 'healthy',
        database: 'connected',
        eventProcessing: 'active',
        reportGeneration: 'available',
        realtimeData: 'available',
        dataRetention: 'configured',
      } as any);

      const result = await controller.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.service).toBe('analytics-reporting');
    });
  });
});
