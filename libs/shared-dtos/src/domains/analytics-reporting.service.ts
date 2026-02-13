import type { EventType } from './analytics.dto';
import {
  AnalyticsEvent,
  EventStatus,
} from './analytics.dto';
import { AnalyticsRules } from './analytics.rules';
import type {
  AnalyticsDataRetentionPolicy,
  AnonymizationRequirementResult,
  PrivacyComplianceRiskAssessment,
  ReportType,
  DataScope,
  SessionAnalytics,
  ReportingPermissionsResult,
} from './analytics.rules';
import type {
  IAnalyticsRepository,
  IDomainEventBus,
  IAuditLogger,
  IPrivacyService,
  ISessionTracker,
} from './analytics-interfaces';
import type {
  PrivacyComplianceResult,
  DataRetentionReportResult,
  SessionAnalyticsResult,
  ReportingAccessResult,
} from './analytics-result-classes';

/**
 * Service for analytics reporting and compliance.
 * Handles session analytics, data retention reporting, and privacy compliance.
 */
export class AnalyticsReportingService {
  constructor(
    private readonly repository: IAnalyticsRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
    private readonly privacyService: IPrivacyService,
    private readonly sessionTracker: ISessionTracker,
  ) {}

  /**
   * 执行数据隐私合规检查
   */
  public async performPrivacyComplianceCheck(
    eventId: string,
  ): Promise<PrivacyComplianceResult> {
    try {
      const event = await this.repository.findById(eventId);
      if (!event) {
        return PrivacyComplianceResult.failed(['Event not found']);
      }

      const session = await this.sessionTracker.getSession(
        event.getSessionId(),
      );
      if (!session) {
        return PrivacyComplianceResult.failed([
          'Session information not found',
        ]);
      }

      // 评估隐私合规风险
      const riskAssessment = AnalyticsRules.assessPrivacyComplianceRisk(
        event,
        session,
      );

      // 检查匿名化要求
      const anonymizationRequirement =
        AnalyticsRules.validateAnonymizationRequirement(event);

      // 执行必要的合规操作
      if (
        anonymizationRequirement.isRequired &&
        event.getStatus() !== EventStatus.ANONYMIZED
      ) {
        event.anonymizeData();
        await this.repository.save(event);
      }

      if (
        anonymizationRequirement.isOverdue &&
        event.getStatus() !== EventStatus.EXPIRED
      ) {
        event.markAsExpired();
        await this.repository.save(event);
      }

      await this.auditLogger.logSecurityEvent('PRIVACY_COMPLIANCE_CHECK', {
        eventId,
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.riskScore,
        anonymizationRequired: anonymizationRequirement.isRequired,
      });

      return PrivacyComplianceResult.success({
        eventId,
        riskAssessment,
        anonymizationRequirement,
        complianceStatus:
          riskAssessment.riskLevel === 'LOW' ? 'COMPLIANT' : 'REQUIRES_ACTION',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('PRIVACY_COMPLIANCE_CHECK_ERROR', {
        eventId,
        error: errorMessage,
      });
      console.error('Error performing privacy compliance check:', error);
      return PrivacyComplianceResult.failed([
        'Internal error occurred during privacy compliance check',
      ]);
    }
  }

  /**
   * 生成数据保留策略报告
   */
  public async generateDataRetentionReport(
    startDate: Date,
    endDate: Date,
  ): Promise<DataRetentionReportResult> {
    try {
      const events = await this.repository.findByDateRange(startDate, endDate);

      const retentionPolicies = events.map((event) =>
        AnalyticsRules.generateRetentionPolicy(event),
      );

      // 统计分析
      const totalEvents = events.length;
      const eventsToDelete = retentionPolicies.filter(
        (policy) => policy.daysUntilExpiry <= 0,
      ).length;
      const eventsToAnonymize = retentionPolicies.filter(
        (policy) => policy.daysUntilAnonymization <= 0,
      ).length;

      // 生成按事件类型分组的统计
      const eventTypeStats = new Map<
        EventType,
        {
          total: number;
          toDelete: number;
          toAnonymize: number;
        }
      >();

      events.forEach((event) => {
        const eventType = event.getEventType();
        const policy = retentionPolicies.find(
          (p) => p.eventId === event.getId().getValue(),
        );

        if (!eventTypeStats.has(eventType)) {
          eventTypeStats.set(eventType, {
            total: 0,
            toDelete: 0,
            toAnonymize: 0,
          });
        }

        const stats = eventTypeStats.get(eventType) ?? { total: 0, toDelete: 0, toAnonymize: 0 };
        stats.total++;

        if (policy && policy.daysUntilExpiry <= 0) {
          stats.toDelete++;
        }
        if (policy && policy.daysUntilAnonymization <= 0) {
          stats.toAnonymize++;
        }
      });

      return DataRetentionReportResult.success({
        reportPeriod: { startDate, endDate },
        totalEvents,
        eventsToDelete,
        eventsToAnonymize,
        eventTypeStatistics: Object.fromEntries(eventTypeStats),
        retentionPolicies,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('DATA_RETENTION_REPORT_ERROR', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        error: errorMessage,
      });
      console.error('Error generating data retention report:', error);
      return DataRetentionReportResult.failed([
        'Internal error occurred while generating retention report',
      ]);
    }
  }

  /**
   * 获取会话分析统计
   */
  public async getSessionAnalytics(
    sessionId: string,
    timeRange?: { startDate: Date; endDate: Date },
  ): Promise<SessionAnalyticsResult> {
    try {
      // 获取会话事件
      const events = await this.repository.findBySession(sessionId, timeRange);
      if (events.length === 0) {
        return SessionAnalyticsResult.failed(['No events found for session']);
      }

      // 计算会话统计
      const sortedEvents = events.sort(
        (a, b) =>
          new Date(a.getTimestamp()).getTime() -
          new Date(b.getTimestamp()).getTime(),
      );

      const startTime = new Date(sortedEvents[0].getTimestamp());
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      const endTime = new Date(lastEvent.getTimestamp());
      const lastActivityTime = new Date(lastEvent.getTimestamp());

      // 计算平均事件间隔
      let totalInterval = 0;
      for (let i = 1; i < sortedEvents.length; i++) {
        const prevTime = new Date(sortedEvents[i - 1].getTimestamp()).getTime();
        const currTime = new Date(sortedEvents[i].getTimestamp()).getTime();
        totalInterval += currTime - prevTime;
      }
      const averageEventInterval =
        sortedEvents.length > 1 ? totalInterval / (sortedEvents.length - 1) : 0;

      // 检查会话是否仍然活跃
      const isActive = Date.now() - lastActivityTime.getTime() < 30 * 60 * 1000; // 30分钟内有活动

      const analytics: SessionAnalytics = {
        sessionId,
        userId: events[0].getUserId(),
        startTime,
        endTime,
        eventCount: events.length,
        lastActivityTime,
        isActive,
        averageEventInterval,
      };

      return SessionAnalyticsResult.success(analytics);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('SESSION_ANALYTICS_ERROR', {
        sessionId,
        timeRange,
        error: errorMessage,
      });
      console.error('Error getting session analytics:', error);
      return SessionAnalyticsResult.failed([
        'Internal error occurred while getting session analytics',
      ]);
    }
  }

  /**
   * 验证报告访问权限
   */
  public async validateReportingAccess(
    userRole: string,
    reportType: ReportType,
    dataScope: DataScope,
  ): Promise<ReportingAccessResult> {
    try {
      const permissions = AnalyticsRules.calculateReportingPermissions(
        userRole,
        reportType,
        dataScope,
      );

      await this.auditLogger.logSecurityEvent('REPORTING_ACCESS_CHECK', {
        userRole,
        reportType,
        dataScope,
        hasAccess: permissions.hasAccess,
        permissions: permissions.permissions,
        restrictions: permissions.restrictions,
      });

      return ReportingAccessResult.success(permissions);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('REPORTING_ACCESS_ERROR', {
        userRole,
        reportType,
        dataScope,
        error: errorMessage,
      });
      console.error('Error validating reporting access:', error);
      return ReportingAccessResult.failed([
        'Internal error occurred while validating reporting access',
      ]);
    }
  }
}
