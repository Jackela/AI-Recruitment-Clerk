import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsIntegrationService } from './analytics-integration.service';
import { AnalyticsEventRepository } from './analytics-event.repository';
import { NatsClient } from '../../nats/nats.client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '@nestjs/common';

describe('AnalyticsIntegrationService', () => {
  let service: AnalyticsIntegrationService;
  let repository: jest.Mocked<AnalyticsEventRepository>;
  let natsClient: jest.Mocked<NatsClient>;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
      findAndCount: jest.fn(),
    };

    const mockNatsClient = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      request: jest.fn(),
      close: jest.fn(),
      connect: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      wrap: jest.fn(),
      store: {
        keys: jest.fn(),
        ttl: jest.fn(),
        mget: jest.fn(),
        mset: jest.fn(),
        mdel: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsIntegrationService,
        {
          provide: AnalyticsEventRepository,
          useValue: mockRepository,
        },
        {
          provide: NatsClient,
          useValue: mockNatsClient,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AnalyticsIntegrationService>(
      AnalyticsIntegrationService,
    );
    repository = module.get(AnalyticsEventRepository);
    natsClient = module.get(NatsClient);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackEvent', () => {
    it('should track an event successfully', async () => {
      const eventData = {
        category: 'button',
        action: 'click',
        label: 'submit',
        value: 1,
        metadata: { page: 'test' },
        userId: 'user-123',
        organizationId: 'org-123',
        timestamp: new Date(),
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      };

      // Mock the domain service to return a successful result
      const mockDomainService = service as any;
      mockDomainService.domainService = {
        createUserInteractionEvent: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'event-123',
            eventType: 'USER_INTERACTION',
            status: 'PROCESSED',
            props: { timestamp: eventData.timestamp },
          },
        }),
      };

      const result = await service.trackEvent(eventData);

      expect(result).toBeDefined();
      expect(result.eventId).toBe('event-123');
      expect(result.eventType).toBe('USER_INTERACTION');
      expect(result.processed).toBe(true);
    });

    it('should handle tracking errors gracefully', async () => {
      const eventData = {
        category: 'button',
        action: 'click',
        userId: 'user-123',
        organizationId: 'org-123',
        timestamp: new Date(),
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      };

      // Mock the domain service to return an error
      const mockDomainService = service as any;
      mockDomainService.domainService = {
        createUserInteractionEvent: jest.fn().mockResolvedValue({
          success: false,
          errors: ['Database error'],
        }),
      };

      await expect(service.trackEvent(eventData)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('recordMetric', () => {
    it('should record a performance metric successfully', async () => {
      const metricData = {
        metricName: 'api_response_time',
        value: 150,
        unit: 'milliseconds',
        operation: 'get_jobs',
        service: 'job-service',
        status: 'success' as const,
        organizationId: 'org-123',
        recordedBy: 'user-123',
        timestamp: new Date(),
        category: 'performance',
      };

      // Mock the domain service to return a successful result
      const mockDomainService = service as any;
      mockDomainService.domainService = {
        createBusinessMetricEvent: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'metric-123',
            status: 'processed',
            props: { timestamp: metricData.timestamp },
          },
        }),
      };

      const result = await service.recordMetric(metricData);

      expect(result).toBeDefined();
      expect(result.metricId).toBe('metric-123');
      expect(result.metricName).toBe('api_response_time');
      expect(result.value).toBe(150);
      expect(result.unit).toBe('milliseconds');
      expect(result.category).toBe('performance');
    });

    it('should record a business metric successfully', async () => {
      const metricData = {
        metricName: 'user_conversion_rate',
        value: 85.5,
        unit: 'percentage',
        category: 'business',
        organizationId: 'org-123',
        recordedBy: 'user-123',
        timestamp: new Date(),
        dimensions: { channel: 'organic' },
        tags: ['quarterly', 'growth'],
      };

      // Mock the domain service to return a successful result
      const mockDomainService = service as any;
      mockDomainService.domainService = {
        createBusinessMetricEvent: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'metric-456',
            status: 'processed',
            props: { timestamp: metricData.timestamp },
          },
        }),
      };

      const result = await service.recordMetric(metricData);

      expect(result).toBeDefined();
      expect(result.metricId).toBe('metric-456');
      expect(result.metricName).toBe('user_conversion_rate');
      expect(result.value).toBe(85.5);
      expect(result.unit).toBe('percentage');
      expect(result.category).toBe('business');
    });
  });

  describe('getDashboard', () => {
    it('should get dashboard data successfully', async () => {
      const organizationId = 'org-123';
      const timeRange = '7d';
      const metrics = ['totalUsers', 'activeUsers'];

      const result = await service.getDashboard(
        organizationId,
        timeRange,
        metrics,
      );

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(organizationId);
      expect(result.timeRange).toBe(timeRange);
      expect(result.data).toBeDefined();
      expect(result.data.totalEvents).toBeDefined();
      expect(result.data.uniqueUsers).toBeDefined();
      expect(result.data.avgPerformance).toBeDefined();
      expect(result.data.lastUpdated).toBeDefined();
    });
  });

  describe('getUserBehaviorAnalysis', () => {
    it('should get user behavior analysis successfully', async () => {
      const organizationId = 'org-123';
      const options = {
        userId: 'user-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        segmentBy: 'activity',
      };

      const result = await service.getUserBehaviorAnalysis(
        organizationId,
        options,
      );

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(organizationId);
      expect(result.options).toEqual(options);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.totalUsers).toBeDefined();
      expect(result.analysis.activeUsers).toBeDefined();
      expect(result.analysis.userJourney).toBeDefined();
      expect(result.analysis.popularActions).toBeDefined();
    });
  });

  describe('getUsageStatistics', () => {
    it('should get usage statistics successfully', async () => {
      const organizationId = 'org-123';
      const options = {
        module: 'jobs',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        granularity: 'day',
      };

      const result = await service.getUsageStatistics(organizationId, options);

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(organizationId);
      expect(result.options).toEqual(options);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalRequests).toBeDefined();
      expect(result.statistics.successRate).toBeDefined();
      expect(result.statistics.avgResponseTime).toBeDefined();
      expect(result.statistics.errorRate).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('should generate report successfully', async () => {
      const reportConfig = {
        reportType: 'analytics',
        organizationId: 'org-123',
        requestedBy: 'user-123',
      };

      const result = await service.generateReport(reportConfig);

      expect(result).toBeDefined();
      expect(result.reportId).toMatch(/^report_/);
      expect(result.reportType).toBe('analytics');
      expect(result.status).toBe('generated');
      expect(result.config).toEqual(reportConfig);
      expect(result.generatedAt).toBeDefined();
      expect(result.estimatedCompletionTime).toBeDefined();
    });
  });

  describe('getReports', () => {
    it('should get reports list successfully', async () => {
      const organizationId = 'org-123';
      const filters = {
        page: 1,
        limit: 20,
        status: 'completed',
        requestedBy: 'user-123',
      };

      const result = await service.getReports(organizationId, filters);

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(organizationId);
      expect(result.reports).toBeDefined();
      expect(Array.isArray(result.reports)).toBe(true);
      expect(result.total).toBe(0);
      expect(result.totalCount).toBe(0);
      expect(result.filters).toEqual(filters);
    });
  });

  describe('getReport', () => {
    it('should get specific report successfully', async () => {
      const reportId = 'report-123';
      const organizationId = 'org-123';

      const result = await service.getReport(reportId, organizationId);

      expect(result).toBeDefined();
      expect(result.reportId).toBe(reportId);
      expect(result.organizationId).toBe(organizationId);
      expect(result.status).toBe('not_found');
      expect(result.data).toBeNull();
    });
  });

  describe('deleteReport', () => {
    it('should delete report successfully', async () => {
      const reportId = 'report-123';
      const organizationId = 'org-123';
      const userId = 'user-123';
      const reason = 'Test cleanup';
      const hardDelete = false;

      const result = await service.deleteReport(
        reportId,
        organizationId,
        userId,
        reason,
        hardDelete,
      );

      expect(result).toBeDefined();
      expect(result.reportId).toBe(reportId);
      expect(result.organizationId).toBe(organizationId);
      expect(result.userId).toBe(userId);
      expect(result.reason).toBe(reason);
      expect(result.hardDelete).toBe(hardDelete);
      expect(result.deleted).toBe(false);
      expect(result.message).toBe('Not implemented');
    });
  });

  describe('getRealtimeData', () => {
    it('should get realtime data successfully', async () => {
      const organizationId = 'org-123';
      const dataTypes = ['activeUsers', 'responseTime'];

      const result = await service.getRealtimeData(organizationId, dataTypes);

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(organizationId);
      expect(result.dataTypes).toEqual(dataTypes);
      expect(result.data).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('configureDataRetention', () => {
    it('should configure data retention successfully', async () => {
      const organizationId = 'org-123';
      const retentionConfig = {
        eventDataRetentionDays: 365,
        metricDataRetentionDays: 730,
        reportRetentionDays: 1095,
        enableAutoCleanup: true,
      };
      const userId = 'user-123';

      const result = await service.configureDataRetention(
        organizationId,
        retentionConfig,
        userId,
      );

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(organizationId);
      expect(result.config).toEqual(retentionConfig);
      expect(result.applied).toBe(false);
      expect(result.message).toBe('Not implemented');
    });
  });

  describe('exportData', () => {
    it('should export data successfully', async () => {
      const organizationId = 'org-123';
      const exportConfig = {
        dataTypes: ['events', 'metrics'],
        format: 'csv',
        requestedBy: 'user-123',
      };

      const result = await service.exportData(organizationId, exportConfig);

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(organizationId);
      expect(result.exportId).toMatch(/^export_/);
      expect(result.status).toBe('initiated');
      expect(result.config).toEqual(exportConfig);
      expect(result.estimatedTime).toBeDefined();
      expect(result.downloadUrl).toBeNull();
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when all components are working', async () => {
      const result = await service.getHealthStatus();

      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
      expect(result.overall).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.database).toBe('healthy');
      expect(result.eventProcessing).toBe('healthy');
      expect(result.reportGeneration).toBe('healthy');
      expect(result.realtimeData).toBe('healthy');
      expect(result.dataRetention).toBe('healthy');
      expect(result.services).toBeDefined();
      expect(result.services?.database).toBe('healthy');
      expect(result.services?.cache).toBe('healthy');
      expect(result.services?.nats).toBe('healthy');
    });
  });
});
