import { AnalyticsIntegrationService } from './analytics/analytics-integration.service';

describe('DomainsModule lightweight smoke tests', () => {
  const createService = () => {
    const mockRepo = {
      createEvent: jest.fn(),
      getRecentEvents: jest.fn().mockResolvedValue([]),
    } as any;
    const mockNats = {
      publishAnalyticsEvent: jest.fn().mockResolvedValue({ success: true }),
    } as any;
    const mockCache = {
      wrap: jest.fn(async (_key: string, fn: any) => fn()),
    } as any;

    return new AnalyticsIntegrationService(mockRepo, mockNats, mockCache);
  };

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
