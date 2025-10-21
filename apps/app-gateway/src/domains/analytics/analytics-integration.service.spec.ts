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
});
