import { AnalyticsIntegrationService } from './analytics-integration.service';

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

const createService = () => {
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

describe('AnalyticsIntegrationService (mock-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks events via eventTrackingService', async () => {
    const { service, eventTrackingService } = createService();
    const mockResult = {
      eventId: 'evt-1',
      processed: true,
    };
    eventTrackingService.trackEvent.mockResolvedValue(mockResult);

    const output = await service.trackEvent({
      category: 'ui',
      action: 'click',
      userId: 'user-1',
      organizationId: 'org-1',
      timestamp: new Date('2024-01-01T00:00:00Z'),
    } as any);

    expect(eventTrackingService.trackEvent).toHaveBeenCalled();
    expect(output.eventId).toBe('evt-1');
    expect(output.processed).toBe(true);
  });

  it('records metrics through metricsCollectionService', async () => {
    const { service, metricsCollectionService } = createService();
    const mockResult = {
      metricId: 'metric-1',
      status: 'PROCESSED',
    };
    metricsCollectionService.recordMetric.mockResolvedValue(mockResult);

    const result = await service.recordMetric({
      metricName: 'latency',
      value: 150,
      unit: 'ms',
      organizationId: 'org-1',
      recordedBy: 'user-1',
      timestamp: new Date(),
      category: 'performance',
    } as any);

    expect(metricsCollectionService.recordMetric).toHaveBeenCalled();
    expect(result.metricId).toBe('metric-1');
    expect(result.status).toBe('PROCESSED');
  });

  it('returns realtime data snapshot', async () => {
    const { service, dataExportService } = createService();
    const mockSnapshot = {
      organizationId: 'org-1',
      dataTypes: ['events'],
      timestamp: new Date(),
    };
    dataExportService.getRealtimeData.mockResolvedValue(mockSnapshot);

    const snapshot = await service.getRealtimeData('org-1', ['events']);

    expect(dataExportService.getRealtimeData).toHaveBeenCalledWith('org-1', ['events']);
    expect(snapshot.organizationId).toBe('org-1');
    expect(snapshot.dataTypes).toEqual(['events']);
    expect(snapshot.timestamp).toBeInstanceOf(Date);
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - Event Tracking Failures', () => {
    it('should handle event tracking service failure', async () => {
      const { service, eventTrackingService } = createService();
      eventTrackingService.trackEvent.mockRejectedValue(
        new Error('Domain service unavailable'),
      );

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

    it('should handle event tracking success', async () => {
      const { service, eventTrackingService } = createService();
      eventTrackingService.trackEvent.mockResolvedValue({
        eventId: 'evt-1',
        processed: true,
        timestamp: new Date(),
      });

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
      const { service, eventTrackingService } = createService();
      eventTrackingService.trackEvent.mockRejectedValue(
        new Error('Missing required field: userId'),
      );

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
      const { service, metricsCollectionService } = createService();
      metricsCollectionService.recordMetric.mockRejectedValue(
        new Error('Metric value must be non-negative'),
      );

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
      const { service, metricsCollectionService } = createService();
      metricsCollectionService.recordMetric.mockRejectedValue(
        new Error('Database write failed'),
      );

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
      const { service, metricsCollectionService } = createService();
      metricsCollectionService.recordMetric.mockResolvedValue({
        metricId: 'metric-zero',
        status: 'PROCESSED',
        timestamp: new Date(),
      });

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
      const { service, metricsCollectionService } = createService();
      metricsCollectionService.recordMetric.mockResolvedValue({
        metricId: 'metric-large',
        status: 'PROCESSED',
        timestamp: new Date(),
      });

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
      const { service, metricsCollectionService } = createService();
      metricsCollectionService.recordMetric.mockResolvedValue({
        metricId: 'metric-decimal',
        status: 'PROCESSED',
        timestamp: new Date(),
      });

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
      const { service, eventTrackingService } = createService();
      eventTrackingService.trackEvent.mockResolvedValue({
        eventId: 'evt-concurrent',
        processed: true,
        timestamp: new Date(),
      });

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
      expect(eventTrackingService.trackEvent).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent metric recording', async () => {
      const { service, metricsCollectionService } = createService();
      metricsCollectionService.recordMetric.mockResolvedValue({
        metricId: 'metric-concurrent',
        status: 'PROCESSED',
        timestamp: new Date(),
      });

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
      const { service, eventTrackingService, cacheManager } = createService();
      eventTrackingService.trackEvent.mockResolvedValue({
        eventId: 'evt-no-cache',
        processed: true,
        timestamp: new Date(),
      });
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
      const { service, eventTrackingService } = createService();
      eventTrackingService.trackEvent.mockResolvedValue({
        eventId: 'evt-complete',
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
      } as any);

      expect(result).toMatchObject({
        eventId: expect.stringMatching(/^evt-/),
        processed: expect.any(Boolean),
      });
      expect(result.eventId).toBe('evt-complete');
      expect(result.processed).toBe(true);
    });

    it('should return complete realtime data snapshot structure', async () => {
      const { service, dataExportService } = createService();
      dataExportService.getRealtimeData.mockResolvedValue({
        organizationId: 'org-complete',
        dataTypes: ['events', 'metrics'],
        timestamp: new Date(),
      });

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
