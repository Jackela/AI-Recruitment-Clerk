/**
 * Provides analytics domain functionality.
 *
 * This service re-exports functionality from specialized services:
 * - AnalyticsEventCollectionService: Event creation (user interaction, system performance, business metrics)
 * - AnalyticsAggregationService: Batch processing and metrics calculation
 * - AnalyticsReportingService: Session analytics, reporting, and privacy compliance
 *
 * Result classes and interfaces are also re-exported for backward compatibility.
 */

// Event collection service
export { AnalyticsEventCollectionService } from './analytics-event-collection.service';

// Aggregation service
export { AnalyticsAggregationService } from './analytics-aggregation.service';

// Reporting service
export { AnalyticsReportingService } from './analytics-reporting.service';

// Result classes
export type {
  BatchProcessingItem,
} from './analytics-result-classes';
export {
  EventCreationResult,
  BatchProcessingResult,
  PrivacyComplianceResult,
  DataRetentionReportResult,
  SessionAnalyticsResult,
  EventProcessingMetricsResult,
  DataPrivacyMetricsResult,
  ReportingAccessResult,
} from './analytics-result-classes';

// Interfaces
export type {
  IAnalyticsRepository,
  IDomainEventBus,
  IAuditLogger,
  IPrivacyService,
  ISessionTracker,
} from './analytics-interfaces';

// Legacy facade class for backward compatibility
import { AnalyticsEventCollectionService } from './analytics-event-collection.service';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { AnalyticsReportingService } from './analytics-reporting.service';
import type {
  IAnalyticsRepository,
  IDomainEventBus,
  IAuditLogger,
  IPrivacyService,
  ISessionTracker,
} from './analytics-interfaces';

/**
 * Main analytics domain service.
 * Provides unified access to all analytics functionality.
 *
 * @deprecated Use individual services (AnalyticsEventCollectionService, AnalyticsAggregationService, AnalyticsReportingService) directly.
 */
export class AnalyticsDomainService {
  private eventCollection: AnalyticsEventCollectionService;
  private aggregation: AnalyticsAggregationService;
  private reporting: AnalyticsReportingService;

  constructor(
    private readonly repository: IAnalyticsRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
    private readonly privacyService: IPrivacyService,
    private readonly sessionTracker: ISessionTracker,
  ) {
    this.eventCollection = new AnalyticsEventCollectionService(
      repository,
      eventBus,
      auditLogger,
      privacyService,
      sessionTracker,
    );
    this.aggregation = new AnalyticsAggregationService(
      repository,
      eventBus,
      auditLogger,
    );
    this.reporting = new AnalyticsReportingService(
      repository,
      eventBus,
      auditLogger,
      privacyService,
      sessionTracker,
    );
  }

  // Event collection methods
  public createUserInteractionEvent = (
    sessionId: string,
    userId: string,
    eventType: import('./analytics.dto').EventType,
    eventData: Record<string, unknown>,
    context?: Record<string, unknown>,
  ) => this.eventCollection.createUserInteractionEvent(sessionId, userId, eventType, eventData, context);

  public createSystemPerformanceEvent = (
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>,
  ) => this.eventCollection.createSystemPerformanceEvent(operation, duration, success, metadata);

  public createBusinessMetricEvent = (
    metricName: string,
    metricValue: number,
    metricUnit: import('./analytics.dto').MetricUnit,
    dimensions?: Record<string, string>,
  ) => this.eventCollection.createBusinessMetricEvent(metricName, metricValue, metricUnit, dimensions);

  // Aggregation methods
  public processBatchEvents = (eventIds: string[]) =>
    this.aggregation.processBatchEvents(eventIds);

  public getEventProcessingMetrics = (timeRange: { startDate: Date; endDate: Date }) =>
    this.aggregation.getEventProcessingMetrics(timeRange);

  public getDataPrivacyMetrics = (timeRange: { startDate: Date; endDate: Date }) =>
    this.aggregation.getDataPrivacyMetrics(timeRange);

  // Reporting methods
  public performPrivacyComplianceCheck = (eventId: string) =>
    this.reporting.performPrivacyComplianceCheck(eventId);

  public generateDataRetentionReport = (startDate: Date, endDate: Date) =>
    this.reporting.generateDataRetentionReport(startDate, endDate);

  public getSessionAnalytics = (
    sessionId: string,
    timeRange?: { startDate: Date; endDate: Date },
  ) => this.reporting.getSessionAnalytics(sessionId, timeRange);

  public validateReportingAccess = (
    userRole: string,
    reportType: import('./analytics.rules').ReportType,
    dataScope: import('./analytics.rules').DataScope,
  ) => this.reporting.validateReportingAccess(userRole, reportType, dataScope);
}
