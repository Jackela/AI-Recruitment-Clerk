import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsIntegrationService } from './analytics-integration.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { HttpStatus, NotFoundException } from '@nestjs/common';
import {
  UserDto,
  Permission,
} from '@ai-recruitment-clerk/user-management-domain';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: jest.Mocked<AnalyticsIntegrationService>;

  const mockUser: UserDto = {
    id: 'test-user-id',
    organizationId: 'test-org-id',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
    permissions: [
      Permission.READ_ANALYSIS,
      Permission.VIEW_ANALYTICS,
      Permission.TRACK_METRICS,
    ],
  };

  const mockRequest = {
    user: mockUser,
    headers: {
      'user-agent': 'test-agent',
    },
    ip: '127.0.0.1',
  };

  beforeEach(async () => {
    const mockAnalyticsService = {
      trackEvent: jest.fn(),
      recordMetric: jest.fn(),
      getDashboard: jest.fn(),
      getUserBehaviorAnalysis: jest.fn(),
      getUsageStatistics: jest.fn(),
      generateReport: jest.fn(),
      getReports: jest.fn(),
      getReport: jest.fn(),
      deleteReport: jest.fn(),
      getRealtimeData: jest.fn(),
      configureDataRetention: jest.fn(),
      exportData: jest.fn(),
      getHealthStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsIntegrationService,
          useValue: mockAnalyticsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    analyticsService = module.get(AnalyticsIntegrationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('trackEvent', () => {
    it('should track user event successfully', async () => {
      const eventData = {
        eventType: 'click',
        category: 'button',
        action: 'submit',
        label: 'create-job',
        value: 1,
        metadata: { page: 'job-creation' },
      };

      const mockEvent = {
        eventId: 'event-123',
        timestamp: new Date(),
        eventType: 'click',
        processed: true,
      };

      analyticsService.trackEvent.mockResolvedValue(mockEvent);

      const result = await controller.trackEvent(mockRequest as any, eventData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Event tracked successfully');
      expect(result.data?.eventId).toBe('event-123');
      expect(result.data?.eventType).toBe('click');
      expect(result.data?.processed).toBe(true);

      expect(analyticsService.trackEvent).toHaveBeenCalledWith({
        ...eventData,
        userId: mockUser.id,
        organizationId: mockUser.organizationId,
        timestamp: expect.any(Date),
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      });
    });

    it('should handle track event error', async () => {
      const eventData = {
        eventType: 'click',
        category: 'button',
        action: 'submit',
      };

      analyticsService.trackEvent.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await controller.trackEvent(mockRequest as any, eventData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to track event');
      expect(result.message).toBe('Database error');
    });
  });

  describe('recordPerformanceMetric', () => {
    it('should record performance metric successfully', async () => {
      const metricData = {
        metricName: 'api_response_time',
        value: 150,
        unit: 'milliseconds',
        operation: 'get_jobs',
        service: 'job-service',
        status: 'success' as const,
        duration: 150,
      };

      const mockMetric = {
        metricId: 'metric-123',
        metricName: 'api_response_time',
        value: 150,
        unit: 'milliseconds',
        category: 'performance',
        timestamp: new Date(),
        status: 'processed',
      };

      analyticsService.recordMetric.mockResolvedValue(mockMetric);

      const result = await controller.recordPerformanceMetric(
        mockRequest as any,
        metricData,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Performance metric recorded successfully');
      expect(result.data?.metricId).toBe('metric-123');
      expect(result.data?.metricName).toBe('api_response_time');
      expect(result.data?.value).toBe(150);

      expect(analyticsService.recordMetric).toHaveBeenCalledWith({
        ...metricData,
        organizationId: mockUser.organizationId,
        recordedBy: mockUser.id,
        timestamp: expect.any(Date),
        category: 'performance',
      });
    });

    it('should handle record metric error', async () => {
      const metricData = {
        metricName: 'api_response_time',
        value: 150,
        unit: 'milliseconds',
        operation: 'get_jobs',
        service: 'job-service',
        status: 'success' as const,
      };

      analyticsService.recordMetric.mockRejectedValue(
        new Error('Metric recording failed'),
      );

      const result = await controller.recordPerformanceMetric(
        mockRequest as any,
        metricData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to record performance metric');
      expect(result.message).toBe('Metric recording failed');
    });
  });

  describe('recordBusinessMetric', () => {
    it('should record business metric successfully', async () => {
      const metricData = {
        metricName: 'user_conversion_rate',
        value: 85.5,
        unit: 'percentage',
        category: 'conversion',
        dimensions: { channel: 'organic' },
        tags: ['quarterly', 'growth'],
      };

      const mockMetric = {
        metricId: 'metric-456',
        metricName: 'user_conversion_rate',
        value: 85.5,
        unit: 'percentage',
        category: 'conversion',
        timestamp: new Date(),
        status: 'processed',
      };

      analyticsService.recordMetric.mockResolvedValue(mockMetric);

      const result = await controller.recordBusinessMetric(
        mockRequest as any,
        metricData,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Business metric recorded successfully');
      expect(result.data?.metricId).toBe('metric-456');
      expect(result.data?.category).toBe('conversion');

      expect(analyticsService.recordMetric).toHaveBeenCalledWith({
        ...metricData,
        organizationId: mockUser.organizationId,
        recordedBy: mockUser.id,
        timestamp: expect.any(Date),
        category: 'business',
      });
    });
  });

  describe('getDashboard', () => {
    it('should get dashboard data successfully', async () => {
      const mockDashboard = {
        organizationId: mockUser.organizationId!,
        timeRange: '7d',
        metrics: ['totalUsers', 'activeUsers'],
        data: {
          totalEvents: 1000,
          uniqueUsers: 750,
          avgPerformance: 95.5,
          lastUpdated: new Date(),
        },
      };

      analyticsService.getDashboard.mockResolvedValue(mockDashboard);

      const result = await controller.getDashboard(
        mockRequest as any,
        '7d',
        'totalUsers,activeUsers',
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDashboard);

      expect(analyticsService.getDashboard).toHaveBeenCalledWith(
        mockUser.organizationId,
        '7d',
        ['totalUsers', 'activeUsers'],
      );
    });

    it('should handle dashboard error', async () => {
      analyticsService.getDashboard.mockRejectedValue(
        new Error('Dashboard error'),
      );

      const result = await controller.getDashboard(mockRequest as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve dashboard data');
      expect(result.message).toBe('Dashboard error');
    });
  });

  describe('getUserBehaviorAnalysis', () => {
    it('should get user behavior analysis successfully', async () => {
      const mockAnalysis = {
        organizationId: mockUser.organizationId!,
        options: {
          userId: 'user-123',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          segmentBy: 'activity',
        },
        analysis: {
          totalUsers: 500,
          activeUsers: 350,
          userJourney: [],
          popularActions: [],
        },
      };

      analyticsService.getUserBehaviorAnalysis.mockResolvedValue(mockAnalysis);

      const result = await controller.getUserBehaviorAnalysis(
        mockRequest as any,
        'user-123',
        '2024-01-01',
        '2024-01-31',
        'activity',
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAnalysis);

      expect(analyticsService.getUserBehaviorAnalysis).toHaveBeenCalledWith(
        mockUser.organizationId,
        {
          userId: 'user-123',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          segmentBy: 'activity',
        },
      );
    });
  });

  describe('getUsageStatistics', () => {
    it('should get usage statistics successfully', async () => {
      const mockStatistics = {
        organizationId: mockUser.organizationId!,
        options: {
          module: 'jobs',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          granularity: 'day',
        },
        statistics: {
          totalRequests: 5000,
          successRate: 0.95,
          avgResponseTime: 125,
          errorRate: 0.05,
        },
      };

      analyticsService.getUsageStatistics.mockResolvedValue(mockStatistics);

      const result = await controller.getUsageStatistics(
        mockRequest as any,
        'jobs',
        '2024-01-01',
        '2024-01-31',
        'day',
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatistics);
    });
  });

  describe('generateReport', () => {
    it('should generate report successfully', async () => {
      const reportRequest = {
        reportType: 'user_activity' as const,
        format: 'pdf' as const,
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        filters: { department: 'engineering' },
      };

      const mockReport = {
        reportId: 'report-123',
        reportType: reportRequest.reportType,
        status: 'generated',
        config: reportRequest,
        generatedAt: new Date(),
        downloadUrl: null,
        estimatedCompletionTime: new Date(Date.now() + 300000),
      };

      analyticsService.generateReport.mockResolvedValue(mockReport);

      const result = await controller.generateReport(
        mockRequest as any,
        reportRequest,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Report generation started successfully');
      expect(result.data?.reportId).toBe('report-123');
      expect(result.data?.reportType).toBe('user_activity');
    });
  });

  describe('getReports', () => {
    it('should get reports list successfully', async () => {
      const mockReports = {
        organizationId: mockUser.organizationId!,
        reports: [],
        total: 0,
        totalCount: 0,
        filters: { page: 1, limit: 20, requestedBy: mockUser.id },
      };

      analyticsService.getReports.mockResolvedValue(mockReports);

      const result = await controller.getReports(mockRequest as any, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data?.reports).toEqual(mockReports.reports);
      expect(result.data?.totalCount).toBe(0);
      expect(result.data?.page).toBe(1);
      expect(result.data?.totalPages).toBe(0);
      expect(result.data?.hasNext).toBe(false);
    });
  });

  describe('getReport', () => {
    it('should get specific report successfully', async () => {
      const mockReport = {
        reportId: 'report-123',
        organizationId: mockUser.organizationId!,
        status: 'not_found',
        data: null,
      };

      analyticsService.getReport.mockResolvedValue(mockReport);

      const result = await controller.getReport(
        mockRequest as any,
        'report-123',
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReport);
    });

    it('should handle report not found', async () => {
      const mockNotFoundReport = {
        reportId: 'nonexistent',
        organizationId: mockUser.organizationId!,
        status: 'not_found',
        data: null,
      };

      analyticsService.getReport.mockResolvedValue(mockNotFoundReport);

      const result = await controller.getReport(
        mockRequest as any,
        'nonexistent',
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotFoundReport);
    });
  });

  describe('deleteReport', () => {
    it('should delete report successfully', async () => {
      analyticsService.deleteReport.mockResolvedValue({
        reportId: 'report-123',
        organizationId: mockUser.organizationId!,
        userId: mockUser.id,
        reason: 'Test cleanup',
        hardDelete: false,
        deleted: false,
        message: 'Not implemented',
      });

      const result = await controller.deleteReport(
        mockRequest as any,
        'report-123',
        { reason: 'Test cleanup', hardDelete: false },
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Report deleted successfully');
      expect(result.data?.reportId).toBe('report-123');
      expect(result.data?.hardDelete).toBe(false);

      expect(analyticsService.deleteReport).toHaveBeenCalledWith(
        'report-123',
        mockUser.organizationId,
        mockUser.id,
        'Test cleanup',
        false,
      );
    });
  });

  describe('getRealtimeData', () => {
    it('should get realtime data successfully', async () => {
      const mockRealtimeData = {
        organizationId: mockUser.organizationId!,
        dataTypes: ['activeUsers', 'responseTime'],
        data: {
          activeUsers: 150,
          currentLoad: 75.5,
          responseTime: 125,
          errorRate: 0.2,
        },
        timestamp: new Date(),
      };

      analyticsService.getRealtimeData.mockResolvedValue(mockRealtimeData);

      const result = await controller.getRealtimeData(
        mockRequest as any,
        'activeUsers,responseTime',
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRealtimeData);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('configureDataRetention', () => {
    it('should configure data retention successfully', async () => {
      const retentionConfig = {
        eventDataRetentionDays: 365,
        metricDataRetentionDays: 730,
        reportRetentionDays: 1095,
        anonymizeAfterDays: 2555,
        enableAutoCleanup: true,
      };

      const mockConfig = {
        organizationId: mockUser.organizationId!,
        config: retentionConfig,
        applied: false,
        message: 'Not implemented',
      };
      analyticsService.configureDataRetention.mockResolvedValue(mockConfig);

      const result = await controller.configureDataRetention(
        mockRequest as any,
        retentionConfig,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Data retention policy configured successfully',
      );
      expect(result.data).toEqual(mockConfig);
    });
  });

  describe('exportAnalyticsData', () => {
    it('should export analytics data successfully', async () => {
      const exportRequest = {
        dataTypes: ['events', 'metrics'],
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        filters: { category: 'user_activity' },
      };

      const mockExportResult = {
        organizationId: mockUser.organizationId!,
        exportId: 'export-123',
        status: 'initiated',
        config: exportRequest,
        estimatedTime: new Date(Date.now() + 600000),
        downloadUrl: null,
        expiresAt: new Date(Date.now() + 86400000),
      };

      analyticsService.exportData.mockResolvedValue(mockExportResult);

      const result = await controller.exportAnalyticsData(
        mockRequest as any,
        'csv',
        exportRequest,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Data export started successfully');
      expect(result.data?.exportId).toBe('export-123');
      expect(result.data?.format).toBe('csv');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockHealth = {
        status: 'healthy',
        overall: 'healthy',
        timestamp: new Date(),
        database: 'healthy',
        eventProcessing: 'healthy',
        reportGeneration: 'healthy',
        realtimeData: 'healthy',
        dataRetention: 'healthy',
        services: {
          database: 'healthy',
          cache: 'healthy',
          nats: 'healthy',
        },
      };

      analyticsService.getHealthStatus.mockResolvedValue(mockHealth);

      const result = await controller.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.service).toBe('analytics-reporting');
      expect(result.details).toEqual({
        database: 'healthy',
        eventProcessing: 'healthy',
        reportGeneration: 'healthy',
        realtimeData: 'healthy',
        dataRetention: 'healthy',
      });
    });

    it('should handle health check error', async () => {
      analyticsService.getHealthStatus.mockRejectedValue(
        new Error('Health check failed'),
      );

      const result = await controller.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.service).toBe('analytics-reporting');
      expect(result.error).toBe('Health check failed');
    });
  });
});
