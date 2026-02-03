import { AnalyticsController } from './analytics.controller';
import type { AnalyticsIntegrationService } from './analytics-integration.service';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';

const createServiceMock = () => ({
  trackEvent: jest.fn(),
  recordMetric: jest.fn(),
  getDashboard: jest.fn(),
  getReports: jest.fn(),
  getReport: jest.fn(),
  deleteReport: jest.fn(),
  getRealtimeData: jest.fn(),
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

describe('AnalyticsController (mocked service)', () => {
  let controller: AnalyticsController;
  let service: jest.Mocked<AnalyticsIntegrationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createServiceMock();
    controller = new AnalyticsController(service);
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
        status: 'PROCESSED',
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
});
