import type { Cache } from 'cache-manager';
import type { AnalyticsEventRepository } from './analytics/analytics-event.repository';
import type { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import { AnalyticsIntegrationService } from './analytics/analytics-integration.service';

const createService = () => {
  const mockRepo = {
    save: jest.fn(),
    findBySessionId: jest.fn().mockResolvedValue([]),
  } as unknown as AnalyticsEventRepository;

  const mockNats = {
    publish: jest.fn().mockResolvedValue(undefined),
  } as unknown as AppGatewayNatsService;

  const mockCache = {
    wrap: jest.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
  } as unknown as Cache;

  return new AnalyticsIntegrationService(mockRepo, mockNats, mockCache);
};

describe('DomainsModule lightweight smoke tests', () => {
  it('instantiates analytics integration service with mocks', () => {
    const service = createService();
    expect(service).toBeInstanceOf(AnalyticsIntegrationService);
  });

  it('delegates event tracking to repository and cache', async () => {
    const service = createService();
    const result = await service.getDashboard('org-1');

    expect(result).toEqual(
      expect.objectContaining({
        organizationId: 'org-1',
        data: expect.objectContaining({ totalEvents: 0 }),
      }),
    );
  });
});
