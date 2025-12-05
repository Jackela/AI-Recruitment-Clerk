import { AnalyticsIntegrationService } from './analytics/analytics-integration.service';

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
    getDashboard: jest.fn().mockResolvedValue({
      organizationId: 'org-1',
      data: { totalEvents: 0 },
    }),
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

describe('DomainsModule lightweight smoke tests', () => {
  const createService = () => {
    const mockCache = {
      wrap: jest.fn(async (_key: string, fn: any) => fn()),
    } as any;

    const mockServices = createMockServices();

    return new AnalyticsIntegrationService(
      mockCache,
      mockServices.eventTrackingService as any,
      mockServices.metricsCollectionService as any,
      mockServices.sessionAnalyticsService as any,
      mockServices.privacyComplianceService as any,
      mockServices.reportGenerationService as any,
      mockServices.analyticsMetricsService as any,
      mockServices.dataExportService as any,
      mockServices.analyticsHealthService as any,
    );
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
