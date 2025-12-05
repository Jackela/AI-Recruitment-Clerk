import { AnalyticsEventRepository } from './analytics/analytics-event.repository';
import { AnalyticsIntegrationService } from './analytics/analytics-integration.service';

const createModelStub = () => {
  const store = new Map<string, any>();

  const findOneAndUpdate = jest.fn(async (filter: any, update: any) => {
    const existing = Array.from(store.values()).find(
      (doc) => doc.eventId === filter.eventId,
    );
    if (existing) {
      Object.assign(existing, update);
      return existing;
    }
    const doc = { ...update, eventId: filter.eventId };
    store.set(doc.eventId, doc);
    return doc;
  });

  const findOne = jest.fn(async (filter: any) => {
    const doc = Array.from(store.values()).find(
      (entry) => entry.eventId === filter.eventId,
    );
    return doc ? { ...doc } : null;
  });

  const countDocuments = jest.fn(() => ({
    exec: jest.fn(async () => store.size),
  }));

  const analyticsModel = {
    findOneAndUpdate,
    findOne,
    countDocuments,
  };

  return { analyticsModel, store };
};

// Create mock services for Sprint 4 refactored architecture
const createMockServices = () => ({
  eventTrackingService: {
    trackUserInteraction: jest.fn(),
    trackEvent: jest.fn(),
    processBatchEvents: jest.fn(),
  },
  metricsCollectionService: {
    recordMetric: jest.fn(),
    recordBusinessMetric: jest.fn(),
    trackSystemPerformance: jest.fn(),
  },
  sessionAnalyticsService: {
    getSessionAnalytics: jest.fn(),
    createSessionTracker: jest.fn(),
  },
  privacyComplianceService: {
    performPrivacyComplianceCheck: jest.fn(),
    generateDataRetentionReport: jest.fn(),
    configureDataRetention: jest.fn(),
  },
  reportGenerationService: {
    generateReport: jest.fn(),
    getReports: jest.fn(),
    getReport: jest.fn(),
    deleteReport: jest.fn(),
  },
  analyticsMetricsService: {
    getEventProcessingMetrics: jest.fn(),
    getDataPrivacyMetrics: jest.fn(),
    getUsageStatistics: jest.fn(),
    getDashboard: jest.fn(),
  },
  dataExportService: {
    exportData: jest.fn(),
    getRealtimeData: jest.fn(),
  },
  analyticsHealthService: {
    getHealthStatus: jest.fn(),
    validateReportingAccess: jest.fn(),
  },
});

const createAnalyticsService = () => {
  const cacheManager = {
    wrap: jest.fn(async (_key: string, compute: () => Promise<any>) =>
      compute(),
    ),
  } as any;

  const mockServices = createMockServices();

  const service = new AnalyticsIntegrationService(
    cacheManager,
    mockServices.eventTrackingService as any,
    mockServices.metricsCollectionService as any,
    mockServices.sessionAnalyticsService as any,
    mockServices.privacyComplianceService as any,
    mockServices.reportGenerationService as any,
    mockServices.analyticsMetricsService as any,
    mockServices.dataExportService as any,
    mockServices.analyticsHealthService as any,
  );

  return { service, cacheManager, ...mockServices };
};

describe('Domains module lightweight coverage', () => {
  describe('AnalyticsEventRepository', () => {
    it('counts session events using mocked model', async () => {
      const { analyticsModel, store } = createModelStub();
      const repository = new AnalyticsEventRepository(
        analyticsModel as any,
      );

      store.set('evt-1', {
        eventId: 'evt-1',
        sessionId: 'session-1',
        timestamp: new Date(),
      });

      const count = await repository.countSessionEvents('session-1');

      expect(count).toBe(store.size);
      expect(analyticsModel.countDocuments).toHaveBeenCalledWith({
        sessionId: 'session-1',
      });
    });
  });

  describe('AnalyticsIntegrationService', () => {
    it('returns processed event metadata when tracking event succeeds', async () => {
      const { service, eventTrackingService } = createAnalyticsService();
      eventTrackingService.trackEvent.mockResolvedValue({
        eventId: 'event-123',
        eventType: 'USER_INTERACTION',
        processed: true,
        timestamp: new Date('2024-01-01T00:00:00Z'),
      });

      const result = await service.trackEvent({
        category: 'ui',
        action: 'click',
        userId: 'user-1',
        organizationId: 'org-1',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      });

      expect(result.eventId).toBe('event-123');
      expect(result.eventType).toBe('USER_INTERACTION');
      expect(result.processed).toBe(true);
    });

    it('bubbles up errors from event tracking service', async () => {
      const { service, eventTrackingService } = createAnalyticsService();
      const failure = new Error('domain failure');
      eventTrackingService.trackEvent.mockRejectedValue(failure);

      await expect(
        service.trackEvent({
          category: 'ui',
          action: 'click',
          userId: 'user-1',
          organizationId: 'org-1',
          timestamp: new Date(),
        }),
      ).rejects.toThrow('domain failure');
    });
  });
});
