import { ReportsController } from './reports.controller';
import type { AnalyticsIntegrationService } from './analytics-integration.service';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';

const createServiceMock = () => ({
  getUserBehaviorAnalysis: jest.fn(),
  getUsageStatistics: jest.fn(),
  generateReport: jest.fn(),
  getReports: jest.fn(),
  getReport: jest.fn(),
  deleteReport: jest.fn(),
  configureDataRetention: jest.fn(),
  exportData: jest.fn(),
}) as unknown as jest.Mocked<AnalyticsIntegrationService>;

const createRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    user: {
      id: 'user-1',
      organizationId: 'org-1',
      permissions: [Permission.VIEW_ANALYTICS, Permission.GENERATE_REPORT],
    },
    headers: { 'user-agent': 'jest-agent' },
    ip: '203.0.113.10',
    ...overrides,
  } as any);

describe('ReportsController (mocked service)', () => {
  let controller: ReportsController;
  let service: jest.Mocked<AnalyticsIntegrationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createServiceMock();
    controller = new ReportsController(service);
  });

  describe('getUserBehaviorAnalysis', () => {
    it('returns user behavior analysis from service', async () => {
      service.getUserBehaviorAnalysis.mockResolvedValue({
        totalEvents: 100,
        uniqueUsers: 25,
      } as any);

      const result = await controller.getUserBehaviorAnalysis(createRequest());

      expect(service.getUserBehaviorAnalysis).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('getUsageStatistics', () => {
    it('returns usage statistics from service', async () => {
      service.getUsageStatistics.mockResolvedValue({
        dailyActiveUsers: 50,
        totalSessions: 200,
      } as any);

      const result = await controller.getUsageStatistics(createRequest());

      expect(service.getUsageStatistics).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('generates report via service', async () => {
      service.generateReport.mockResolvedValue({
        reportId: 'report-123',
        reportType: 'user_activity',
        status: 'processing',
        estimatedCompletionTime: '5 minutes',
        downloadUrl: null,
      } as any);

      const result = await controller.generateReport(createRequest(), {
        reportType: 'user_activity',
        format: 'pdf',
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      });

      expect(service.generateReport).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data?.reportId).toBe('report-123');
    });
  });

  describe('getReports', () => {
    it('returns reports list from service', async () => {
      service.getReports.mockResolvedValue({
        reports: [{ reportId: 'report-1', status: 'completed' }],
        totalCount: 1,
      } as any);

      const result = await controller.getReports(createRequest());

      expect(service.getReports).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('getReport', () => {
    it('returns specific report from service', async () => {
      service.getReport.mockResolvedValue({
        reportId: 'report-1',
        status: 'completed',
        downloadUrl: 'https://example.com/report.pdf',
      } as any);

      const result = await controller.getReport(createRequest(), 'report-1');

      expect(service.getReport).toHaveBeenCalledWith('report-1', 'org-1');
      expect(result.success).toBe(true);
    });
  });

  describe('deleteReport', () => {
    it('deletes report via service', async () => {
      service.deleteReport.mockResolvedValue(undefined);

      const result = await controller.deleteReport(
        createRequest(),
        'report-1',
        {},
      );

      expect(service.deleteReport).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('configureDataRetention', () => {
    it('configures data retention via service', async () => {
      service.configureDataRetention.mockResolvedValue({
        eventDataRetentionDays: 90,
        enableAutoCleanup: true,
      } as any);

      const result = await controller.configureDataRetention(createRequest(), {
        eventDataRetentionDays: 90,
        metricDataRetentionDays: 180,
        reportRetentionDays: 365,
        enableAutoCleanup: true,
      });

      expect(service.configureDataRetention).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('exportAnalyticsData', () => {
    it('exports data via service', async () => {
      service.exportData.mockResolvedValue({
        exportId: 'export-1',
        estimatedTime: '2 minutes',
        downloadUrl: 'https://example.com/export.csv',
        expiresAt: new Date(),
      } as any);

      const result = await controller.exportAnalyticsData(
        createRequest(),
        'csv',
        {
          dataTypes: ['events', 'metrics'],
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          },
        },
      );

      expect(service.exportData).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
