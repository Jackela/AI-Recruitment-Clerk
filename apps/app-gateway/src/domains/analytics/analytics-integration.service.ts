import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventType } from '@ai-recruitment-clerk/shared-dtos';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// Import extracted services
import { EventTrackingService } from './services/event-tracking.service';
import { MetricsCollectionService } from './services/metrics-collection.service';
import { SessionAnalyticsService } from './services/session-analytics.service';
import { PrivacyComplianceService } from './services/privacy-compliance.service';
import { ReportGenerationService } from './services/report-generation.service';
import { AnalyticsMetricsService } from './services/analytics-metrics.service';
import { DataExportService } from './services/data-export.service';
import { AnalyticsHealthService } from './services/analytics-health.service';

enum MetricUnit {
  COUNT = 'count',
  PERCENTAGE = 'percentage',
  MILLISECONDS = 'milliseconds',
}

enum ReportType {
  SUMMARY = 'summary',
  DETAILED = 'detailed',
  TREND = 'trend',
}

enum DataScope {
  USER = 'user',
  ORGANIZATION = 'organization',
  SYSTEM = 'system',
}

/**
 * AnalyticsIntegrationService - Facade for analytics operations.
 * Delegates to specialized services following Single Responsibility Principle.
 *
 * Extracted services:
 * - EventTrackingService: Event tracking and batch processing
 * - MetricsCollectionService: Metrics recording and performance tracking
 * - SessionAnalyticsService: Session tracking and analytics
 * - PrivacyComplianceService: Privacy checks and data retention
 * - ReportGenerationService: Report generation and management
 * - AnalyticsMetricsService: Dashboard and BI metrics
 * - DataExportService: Data export and realtime data
 * - AnalyticsHealthService: Health monitoring
 */
@Injectable()
export class AnalyticsIntegrationService {
  private readonly logger = new Logger(AnalyticsIntegrationService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    // Extracted services
    private readonly eventTrackingService: EventTrackingService,
    private readonly metricsCollectionService: MetricsCollectionService,
    private readonly sessionAnalyticsService: SessionAnalyticsService,
    private readonly privacyComplianceService: PrivacyComplianceService,
    private readonly reportGenerationService: ReportGenerationService,
    private readonly analyticsMetricsService: AnalyticsMetricsService,
    private readonly dataExportService: DataExportService,
    private readonly analyticsHealthService: AnalyticsHealthService,
  ) {}

  // ===== Event Tracking =====

  async trackUserInteraction(
    sessionId: string,
    userId: string,
    eventType: EventType,
    eventData: any,
    context?: any,
  ) {
    return this.eventTrackingService.trackUserInteraction(
      sessionId,
      userId,
      eventType,
      eventData,
      context,
    );
  }

  async trackEvent(eventData: {
    category: string;
    action: string;
    label?: string;
    value?: number;
    metadata?: any;
    userId: string;
    organizationId: string;
    timestamp: Date;
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  }) {
    return this.eventTrackingService.trackEvent(eventData);
  }

  async processBatchEvents(eventIds: string[]) {
    return this.eventTrackingService.processBatchEvents(eventIds);
  }

  // ===== Metrics Collection =====

  async recordMetric(metricData: {
    metricName: string;
    value: number;
    unit: string;
    organizationId: string;
    recordedBy: string;
    timestamp: Date;
    category: string;
    operation?: string;
    service?: string;
    status?: 'success' | 'error' | 'timeout';
    duration?: number;
    dimensions?: Record<string, any>;
    tags?: string[];
    metadata?: any;
  }) {
    return this.metricsCollectionService.recordMetric(metricData);
  }

  async trackSystemPerformance(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any,
  ) {
    return this.metricsCollectionService.trackSystemPerformance(
      operation,
      duration,
      success,
      metadata,
    );
  }

  async recordBusinessMetric(
    metricName: string,
    metricValue: number,
    metricUnit: MetricUnit,
    dimensions?: Record<string, string>,
  ) {
    return this.metricsCollectionService.recordBusinessMetric(
      metricName,
      metricValue,
      metricUnit,
      dimensions,
    );
  }

  // ===== Session Analytics =====

  async getSessionAnalytics(
    sessionId: string,
    timeRange?: { startDate: Date; endDate: Date },
  ) {
    return this.sessionAnalyticsService.getSessionAnalytics(sessionId, timeRange);
  }

  // ===== Privacy Compliance =====

  async performPrivacyComplianceCheck(eventId: string) {
    return this.privacyComplianceService.performPrivacyComplianceCheck(eventId);
  }

  async generateDataRetentionReport(startDate: Date, endDate: Date) {
    return this.privacyComplianceService.generateDataRetentionReport(startDate, endDate);
  }

  async getDataPrivacyMetrics(timeRange: { startDate: Date; endDate: Date }) {
    return this.privacyComplianceService.getDataPrivacyMetrics(timeRange);
  }

  async configureDataRetention(
    organizationId: string,
    retentionConfig: any,
    _userId?: string,
  ) {
    return this.privacyComplianceService.configureDataRetention(
      organizationId,
      retentionConfig,
      _userId,
    );
  }

  // ===== Report Generation =====

  async generateReport(reportConfig: any) {
    return this.reportGenerationService.generateReport(reportConfig);
  }

  async getReports(organizationId: string, filters?: any) {
    return this.reportGenerationService.getReports(organizationId, filters);
  }

  async getReport(reportId: string, organizationId: string) {
    return this.reportGenerationService.getReport(reportId, organizationId);
  }

  async deleteReport(
    reportId: string,
    organizationId: string,
    userId?: string,
    reason?: string,
    hardDelete?: boolean,
  ) {
    return this.reportGenerationService.deleteReport(
      reportId,
      organizationId,
      userId,
      reason,
      hardDelete,
    );
  }

  async validateReportingAccess(
    userRole: string,
    reportType: ReportType,
    dataScope: DataScope,
  ) {
    return this.reportGenerationService.validateReportingAccess(
      userRole,
      reportType,
      dataScope,
    );
  }

  // ===== Analytics Metrics / BI =====

  async getEventProcessingMetrics(timeRange: { startDate: Date; endDate: Date }) {
    return this.analyticsMetricsService.getEventProcessingMetrics(timeRange);
  }

  async getDashboard(
    organizationId: string,
    timeRange = '7d',
    metrics?: string[],
  ) {
    return this.analyticsMetricsService.getDashboard(organizationId, timeRange, metrics);
  }

  async getUserBehaviorAnalysis(
    organizationId: string,
    options: {
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      segmentBy?: string;
    },
  ) {
    return this.analyticsMetricsService.getUserBehaviorAnalysis(organizationId, options);
  }

  async getUsageStatistics(
    organizationId: string,
    options: {
      module?: string;
      startDate?: Date;
      endDate?: Date;
      granularity?: string;
    },
  ) {
    return this.analyticsMetricsService.getUsageStatistics(organizationId, options);
  }

  // ===== Data Export =====

  async exportData(organizationId: string, exportConfig: any) {
    return this.dataExportService.exportData(organizationId, exportConfig);
  }

  async getRealtimeData(organizationId: string, dataTypes: string[]) {
    return this.dataExportService.getRealtimeData(organizationId, dataTypes);
  }

  // ===== Health Monitoring =====

  async getHealthStatus() {
    return this.analyticsHealthService.getHealthStatus();
  }
}
