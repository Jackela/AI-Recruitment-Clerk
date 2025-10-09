import {
  AnalyticsEvent,
  AnalyticsEventId,
  EventStatus,
  EventType,
  EventCategory,
  ConsentStatus,
  MetricUnit,
  AnalyticsEventSummary,
  AnalyticsEventData,
  UserSession
} from './analytics.dto';
import {
  AnalyticsRules,
  EventCreationEligibilityResult,
  BatchProcessingEligibilityResult,
  AnalyticsDataRetentionPolicy,
  PrivacyComplianceRiskAssessment,
  AnonymizationRequirementResult,
  ReportingPermissionsResult,
  ReportType,
  DataScope,
  SessionAnalytics,
  EventProcessingMetrics,
  DataPrivacyMetrics
} from './analytics.rules';

/**
 * Provides analytics domain functionality.
 */
export class AnalyticsDomainService {
  /**
   * Initializes a new instance of the Analytics Domain Service.
   * @param repository - The repository.
   * @param eventBus - The event bus.
   * @param auditLogger - The audit logger.
   * @param privacyService - The privacy service.
   * @param sessionTracker - The session tracker.
   */
  constructor(
    private readonly repository: IAnalyticsRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
    private readonly privacyService: IPrivacyService,
    private readonly sessionTracker: ISessionTracker
  ) {}

  /**
   * 创建用户交互事件
   */
  async createUserInteractionEvent(
    sessionId: string,
    userId: string,
    eventType: EventType,
    eventData: any,
    context?: any
  ): Promise<EventCreationResult> {
    try {
      // 获取会话中现有事件数量
      const sessionEventCount = await this.repository.countSessionEvents(sessionId);
      
      // 获取用户同意状态
      const consentStatus = await this.privacyService.getUserConsentStatus(userId);

      // 验证创建资格
      const eligibility = AnalyticsRules.canCreateEvent(
        sessionId,
        eventType,
        eventData,
        consentStatus,
        sessionEventCount
      );

      if (!eligibility.isEligible) {
        await this.auditLogger.logSecurityEvent('EVENT_CREATION_DENIED', {
          sessionId,
          userId,
          eventType,
          errors: eligibility.errors
        });
        return EventCreationResult.failed(eligibility.errors);
      }

      // 创建事件
      const event = AnalyticsEvent.createUserInteractionEvent(
        sessionId,
        userId,
        eventType,
        eventData,
        context
      );

      // 验证事件数据
      const validationResult = event.validateEvent();
      if (!validationResult.isValid) {
        return EventCreationResult.failed(validationResult.errors);
      }

      // 保存到存储
      await this.repository.save(event);

      // 发布领域事件
      const events = event.getUncommittedEvents();
      for (const domainEvent of events) {
        await this.eventBus.publish(domainEvent);
      }
      event.markEventsAsCommitted();

      // 更新会话追踪
      await this.sessionTracker.updateSessionActivity(sessionId, userId);

      // 记录审计日志
      await this.auditLogger.logBusinessEvent('USER_EVENT_CREATED', {
        eventId: event.getId().getValue(),
        sessionId,
        userId,
        eventType,
        priority: eligibility.priority.level
      });

      return EventCreationResult.success(event.getEventSummary());

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('CREATE_USER_EVENT_ERROR', {
        sessionId,
        userId,
        eventType,
        error: errorMessage
      });
      console.error('Error creating user interaction event:', error);
      return EventCreationResult.failed(['Internal error occurred while creating event']);
    }
  }

  /**
   * 创建系统性能事件
   */
  async createSystemPerformanceEvent(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
  ): Promise<EventCreationResult> {
    try {
      // 创建系统性能事件
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        operation,
        duration,
        success,
        metadata
      );

      // 验证事件数据
      const validationResult = event.validateEvent();
      if (!validationResult.isValid) {
        return EventCreationResult.failed(validationResult.errors);
      }

      // 保存到存储
      await this.repository.save(event);

      // 发布领域事件
      const events = event.getUncommittedEvents();
      for (const domainEvent of events) {
        await this.eventBus.publish(domainEvent);
      }
      event.markEventsAsCommitted();

      // 检查性能阈值告警
      if (duration > AnalyticsRules.CRITICAL_PERFORMANCE_THRESHOLD_MS) {
        await this.auditLogger.logSecurityEvent('PERFORMANCE_THRESHOLD_EXCEEDED', {
          operation,
          duration,
          threshold: AnalyticsRules.CRITICAL_PERFORMANCE_THRESHOLD_MS
        });
      }

      return EventCreationResult.success(event.getEventSummary());

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('CREATE_SYSTEM_EVENT_ERROR', {
        operation,
        duration,
        success,
        error: errorMessage
      });
      console.error('Error creating system performance event:', error);
      return EventCreationResult.failed(['Internal error occurred while creating system event']);
    }
  }

  /**
   * 创建业务指标事件
   */
  async createBusinessMetricEvent(
    metricName: string,
    metricValue: number,
    metricUnit: MetricUnit,
    dimensions?: Record<string, string>
  ): Promise<EventCreationResult> {
    try {
      // 创建业务指标事件
      const event = AnalyticsEvent.createBusinessMetricEvent(
        metricName,
        metricValue,
        metricUnit,
        dimensions
      );

      // 验证事件数据
      const validationResult = event.validateEvent();
      if (!validationResult.isValid) {
        return EventCreationResult.failed(validationResult.errors);
      }

      // 保存到存储
      await this.repository.save(event);

      // 发布领域事件
      const events = event.getUncommittedEvents();
      for (const domainEvent of events) {
        await this.eventBus.publish(domainEvent);
      }
      event.markEventsAsCommitted();

      await this.auditLogger.logBusinessEvent('BUSINESS_METRIC_RECORDED', {
        metricName,
        metricValue,
        metricUnit,
        dimensions: dimensions || {}
      });

      return EventCreationResult.success(event.getEventSummary());

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('CREATE_BUSINESS_METRIC_ERROR', {
        metricName,
        metricValue,
        metricUnit,
        error: errorMessage
      });
      console.error('Error creating business metric event:', error);
      return EventCreationResult.failed(['Internal error occurred while creating business metric']);
    }
  }

  /**
   * 批量处理事件
   */
  async processBatchEvents(eventIds: string[]): Promise<BatchProcessingResult> {
    try {
      // 获取所有事件
      const events = await this.repository.findByIds(eventIds);
      if (events.length === 0) {
        return BatchProcessingResult.failed(['No valid events found for processing']);
      }

      // 验证批量处理资格
      const batchValidation = AnalyticsRules.canBatchProcessEvents(events);
      if (!batchValidation.isEligible) {
        return BatchProcessingResult.failed(batchValidation.errors);
      }

      // 处理每个事件
      const results: BatchProcessingItem[] = [];
      let successCount = 0;

      for (const event of events) {
        if (event.getStatus() !== EventStatus.PENDING_PROCESSING) {
          results.push({
            eventId: event.getId().getValue(),
            success: false,
            error: `Event status is ${event.getStatus()}, expected pending_processing`
          });
          continue;
        }

        try {
          // 处理事件
          event.processEvent();
          await this.repository.save(event);

          // 发布领域事件
          const domainEvents = event.getUncommittedEvents();
          for (const domainEvent of domainEvents) {
            await this.eventBus.publish(domainEvent);
          }
          event.markEventsAsCommitted();

          results.push({
            eventId: event.getId().getValue(),
            success: true,
            processedAt: new Date()
          });

          successCount++;

        } catch (processingError) {
          const errorMessage = processingError instanceof Error ? processingError.message : 'Processing error';
          results.push({
            eventId: event.getId().getValue(),
            success: false,
            error: errorMessage
          });
        }
      }

      await this.auditLogger.logBusinessEvent('BATCH_EVENTS_PROCESSED', {
        totalEvents: eventIds.length,
        successCount,
        failureCount: eventIds.length - successCount
      });

      return BatchProcessingResult.success({
        totalEvents: eventIds.length,
        successCount,
        failureCount: eventIds.length - successCount,
        results
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('BATCH_PROCESSING_ERROR', {
        eventIds,
        error: errorMessage
      });
      console.error('Error processing batch events:', error);
      return BatchProcessingResult.failed(['Internal error occurred while processing batch events']);
    }
  }

  /**
   * 执行数据隐私合规检查
   */
  async performPrivacyComplianceCheck(
    eventId: string
  ): Promise<PrivacyComplianceResult> {
    try {
      const event = await this.repository.findById(eventId);
      if (!event) {
        return PrivacyComplianceResult.failed(['Event not found']);
      }

      const session = await this.sessionTracker.getSession(event.getSessionId());
      if (!session) {
        return PrivacyComplianceResult.failed(['Session information not found']);
      }

      // 评估隐私合规风险
      const riskAssessment = AnalyticsRules.assessPrivacyComplianceRisk(event, session);

      // 检查匿名化要求
      const anonymizationRequirement = AnalyticsRules.validateAnonymizationRequirement(event);

      // 执行必要的合规操作
      if (anonymizationRequirement.isRequired && event.getStatus() !== EventStatus.ANONYMIZED) {
        event.anonymizeData();
        await this.repository.save(event);
      }

      if (anonymizationRequirement.isOverdue && event.getStatus() !== EventStatus.EXPIRED) {
        event.markAsExpired();
        await this.repository.save(event);
      }

      await this.auditLogger.logSecurityEvent('PRIVACY_COMPLIANCE_CHECK', {
        eventId,
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.riskScore,
        anonymizationRequired: anonymizationRequirement.isRequired
      });

      return PrivacyComplianceResult.success({
        eventId,
        riskAssessment,
        anonymizationRequirement,
        complianceStatus: riskAssessment.riskLevel === 'LOW' ? 'COMPLIANT' : 'REQUIRES_ACTION'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('PRIVACY_COMPLIANCE_CHECK_ERROR', {
        eventId,
        error: errorMessage
      });
      console.error('Error performing privacy compliance check:', error);
      return PrivacyComplianceResult.failed(['Internal error occurred during privacy compliance check']);
    }
  }

  /**
   * 生成数据保留策略报告
   */
  async generateDataRetentionReport(
    startDate: Date,
    endDate: Date
  ): Promise<DataRetentionReportResult> {
    try {
      const events = await this.repository.findByDateRange(startDate, endDate);
      
      const retentionPolicies = events.map(event => 
        AnalyticsRules.generateRetentionPolicy(event)
      );

      // 统计分析
      const totalEvents = events.length;
      const eventsToDelete = retentionPolicies.filter(policy => 
        policy.daysUntilExpiry <= 0
      ).length;
      const eventsToAnonymize = retentionPolicies.filter(policy => 
        policy.daysUntilAnonymization <= 0
      ).length;

      // 生成按事件类型分组的统计
      const eventTypeStats = new Map<EventType, {
        total: number;
        toDelete: number;
        toAnonymize: number;
      }>();

      events.forEach(event => {
        const eventType = event.getEventType();
        const policy = retentionPolicies.find(p => p.eventId === event.getId().getValue());
        
        if (!eventTypeStats.has(eventType)) {
          eventTypeStats.set(eventType, { total: 0, toDelete: 0, toAnonymize: 0 });
        }

        const stats = eventTypeStats.get(eventType)!;
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
        retentionPolicies
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('DATA_RETENTION_REPORT_ERROR', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        error: errorMessage
      });
      console.error('Error generating data retention report:', error);
      return DataRetentionReportResult.failed(['Internal error occurred while generating retention report']);
    }
  }

  /**
   * 获取会话分析统计
   */
  async getSessionAnalytics(
    sessionId: string,
    timeRange?: { startDate: Date; endDate: Date }
  ): Promise<SessionAnalyticsResult> {
    try {
      // 获取会话事件
      const events = await this.repository.findBySession(sessionId, timeRange);
      if (events.length === 0) {
        return SessionAnalyticsResult.failed(['No events found for session']);
      }

      // 计算会话统计
      const sortedEvents = events.sort((a, b) => 
        new Date(a.getTimestamp()).getTime() - new Date(b.getTimestamp()).getTime()
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
      const averageEventInterval = sortedEvents.length > 1 ? 
        totalInterval / (sortedEvents.length - 1) : 0;

      // 检查会话是否仍然活跃
      const isActive = (Date.now() - lastActivityTime.getTime()) < 30 * 60 * 1000; // 30分钟内有活动

      const analytics: SessionAnalytics = {
        sessionId,
        userId: events[0].getUserId(),
        startTime,
        endTime,
        eventCount: events.length,
        lastActivityTime,
        isActive,
        averageEventInterval
      };

      return SessionAnalyticsResult.success(analytics);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('SESSION_ANALYTICS_ERROR', {
        sessionId,
        timeRange,
        error: errorMessage
      });
      console.error('Error getting session analytics:', error);
      return SessionAnalyticsResult.failed(['Internal error occurred while getting session analytics']);
    }
  }

  /**
   * 获取事件处理性能指标
   */
  async getEventProcessingMetrics(
    timeRange: { startDate: Date; endDate: Date }
  ): Promise<EventProcessingMetricsResult> {
    try {
      const events = await this.repository.findByDateRange(timeRange.startDate, timeRange.endDate);
      
      const totalEvents = events.length;
      const processedEvents = events.filter(e => e.getStatus() === EventStatus.PROCESSED).length;
      const failedEvents = events.filter(e => e.getStatus() === EventStatus.ERROR).length;
      
      // 计算平均处理时间
      const processedEventsWithTimes = events.filter(e => 
        e.getStatus() === EventStatus.PROCESSED && 
        e.getCreatedAt()
      );
      
      let totalProcessingTime = 0;
      processedEventsWithTimes.forEach(event => {
        // 估算处理时间（这里需要根据实际实现调整）
        totalProcessingTime += 100; // 默认100ms处理时间
      });
      
      const averageProcessingTime = processedEventsWithTimes.length > 0 ? 
        totalProcessingTime / processedEventsWithTimes.length : 0;

      // 计算吞吐量
      const timeSpanMs = timeRange.endDate.getTime() - timeRange.startDate.getTime();
      const timeSpanSeconds = timeSpanMs / 1000;
      const throughputPerSecond = timeSpanSeconds > 0 ? processedEvents / timeSpanSeconds : 0;

      // 计算错误率
      const errorRate = totalEvents > 0 ? (failedEvents / totalEvents) * 100 : 0;

      const metrics: EventProcessingMetrics = {
        totalEvents,
        processedEvents,
        failedEvents,
        averageProcessingTime,
        throughputPerSecond,
        errorRate
      };

      return EventProcessingMetricsResult.success(metrics);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('PROCESSING_METRICS_ERROR', {
        timeRange,
        error: errorMessage
      });
      console.error('Error getting event processing metrics:', error);
      return EventProcessingMetricsResult.failed(['Internal error occurred while getting processing metrics']);
    }
  }

  /**
   * 获取数据隐私合规指标
   */
  async getDataPrivacyMetrics(
    timeRange: { startDate: Date; endDate: Date }
  ): Promise<DataPrivacyMetricsResult> {
    try {
      const events = await this.repository.findByDateRange(timeRange.startDate, timeRange.endDate);
      
      const totalEvents = events.length;
      const anonymizedEvents = events.filter(e => e.getStatus() === EventStatus.ANONYMIZED).length;
      const expiredEvents = events.filter(e => e.getStatus() === EventStatus.EXPIRED).length;
      
      // 计算需要匿名化的事件数量
      const pendingAnonymization = events.filter(event => {
        const requirement = AnalyticsRules.validateAnonymizationRequirement(event);
        return requirement.isRequired && event.getStatus() !== EventStatus.ANONYMIZED;
      }).length;

      // 计算合规分数
      const compliantEvents = events.filter(event => {
        const session = new UserSession({
          sessionId: event.getSessionId(),
          userId: event.getUserId(),
          consentStatus: ConsentStatus.GRANTED,
          isSystemSession: false
        });
        const riskAssessment = AnalyticsRules.assessPrivacyComplianceRisk(event, session);
        return riskAssessment.riskLevel === 'LOW';
      }).length;
      
      const complianceScore = totalEvents > 0 ? (compliantEvents / totalEvents) * 100 : 100;
      
      // 确定整体风险等级
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (complianceScore >= 90) {
        riskLevel = 'LOW';
      } else if (complianceScore >= 75) {
        riskLevel = 'MEDIUM';
      } else if (complianceScore >= 50) {
        riskLevel = 'HIGH';
      } else {
        riskLevel = 'CRITICAL';
      }

      const metrics: DataPrivacyMetrics = {
        totalEvents,
        anonymizedEvents,
        expiredEvents,
        pendingAnonymization,
        complianceScore,
        riskLevel
      };

      return DataPrivacyMetricsResult.success(metrics);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('PRIVACY_METRICS_ERROR', {
        timeRange,
        error: errorMessage
      });
      console.error('Error getting data privacy metrics:', error);
      return DataPrivacyMetricsResult.failed(['Internal error occurred while getting privacy metrics']);
    }
  }

  /**
   * 验证报告访问权限
   */
  async validateReportingAccess(
    userRole: string,
    reportType: ReportType,
    dataScope: DataScope
  ): Promise<ReportingAccessResult> {
    try {
      const permissions = AnalyticsRules.calculateReportingPermissions(
        userRole,
        reportType,
        dataScope
      );

      await this.auditLogger.logSecurityEvent('REPORTING_ACCESS_CHECK', {
        userRole,
        reportType,
        dataScope,
        hasAccess: permissions.hasAccess,
        permissions: permissions.permissions,
        restrictions: permissions.restrictions
      });

      return ReportingAccessResult.success(permissions);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('REPORTING_ACCESS_ERROR', {
        userRole,
        reportType,
        dataScope,
        error: errorMessage
      });
      console.error('Error validating reporting access:', error);
      return ReportingAccessResult.failed(['Internal error occurred while validating reporting access']);
    }
  }
}

// 结果类定义
/**
 * Represents the event creation result.
 */
export class EventCreationResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: AnalyticsEventSummary,
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The EventCreationResult.
   */
  static success(data: AnalyticsEventSummary): EventCreationResult {
    return new EventCreationResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The EventCreationResult.
   */
  static failed(errors: string[]): EventCreationResult {
    return new EventCreationResult(false, undefined, errors);
  }
}

/**
 * Represents the batch processing result.
 */
export class BatchProcessingResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      totalEvents: number;
      successCount: number;
      failureCount: number;
      results: BatchProcessingItem[];
    },
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The BatchProcessingResult.
   */
  static success(data: {
    totalEvents: number;
    successCount: number;
    failureCount: number;
    results: BatchProcessingItem[];
  }): BatchProcessingResult {
    return new BatchProcessingResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The BatchProcessingResult.
   */
  static failed(errors: string[]): BatchProcessingResult {
    return new BatchProcessingResult(false, undefined, errors);
  }
}

/**
 * Represents the privacy compliance result.
 */
export class PrivacyComplianceResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      eventId: string;
      riskAssessment: PrivacyComplianceRiskAssessment;
      anonymizationRequirement: AnonymizationRequirementResult;
      complianceStatus: 'COMPLIANT' | 'REQUIRES_ACTION';
    },
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The PrivacyComplianceResult.
   */
  static success(data: {
    eventId: string;
    riskAssessment: PrivacyComplianceRiskAssessment;
    anonymizationRequirement: AnonymizationRequirementResult;
    complianceStatus: 'COMPLIANT' | 'REQUIRES_ACTION';
  }): PrivacyComplianceResult {
    return new PrivacyComplianceResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The PrivacyComplianceResult.
   */
  static failed(errors: string[]): PrivacyComplianceResult {
    return new PrivacyComplianceResult(false, undefined, errors);
  }
}

/**
 * Represents the data retention report result.
 */
export class DataRetentionReportResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      reportPeriod: { startDate: Date; endDate: Date };
      totalEvents: number;
      eventsToDelete: number;
      eventsToAnonymize: number;
      eventTypeStatistics: Record<string, any>;
      retentionPolicies: AnalyticsDataRetentionPolicy[];
    },
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The DataRetentionReportResult.
   */
  static success(data: {
    reportPeriod: { startDate: Date; endDate: Date };
    totalEvents: number;
    eventsToDelete: number;
    eventsToAnonymize: number;
    eventTypeStatistics: Record<string, any>;
    retentionPolicies: AnalyticsDataRetentionPolicy[];
  }): DataRetentionReportResult {
    return new DataRetentionReportResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The DataRetentionReportResult.
   */
  static failed(errors: string[]): DataRetentionReportResult {
    return new DataRetentionReportResult(false, undefined, errors);
  }
}

/**
 * Represents the session analytics result.
 */
export class SessionAnalyticsResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: SessionAnalytics,
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The SessionAnalyticsResult.
   */
  static success(data: SessionAnalytics): SessionAnalyticsResult {
    return new SessionAnalyticsResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The SessionAnalyticsResult.
   */
  static failed(errors: string[]): SessionAnalyticsResult {
    return new SessionAnalyticsResult(false, undefined, errors);
  }
}

/**
 * Represents the event processing metrics result.
 */
export class EventProcessingMetricsResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: EventProcessingMetrics,
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The EventProcessingMetricsResult.
   */
  static success(data: EventProcessingMetrics): EventProcessingMetricsResult {
    return new EventProcessingMetricsResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The EventProcessingMetricsResult.
   */
  static failed(errors: string[]): EventProcessingMetricsResult {
    return new EventProcessingMetricsResult(false, undefined, errors);
  }
}

/**
 * Represents the data privacy metrics result.
 */
export class DataPrivacyMetricsResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: DataPrivacyMetrics,
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The DataPrivacyMetricsResult.
   */
  static success(data: DataPrivacyMetrics): DataPrivacyMetricsResult {
    return new DataPrivacyMetricsResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The DataPrivacyMetricsResult.
   */
  static failed(errors: string[]): DataPrivacyMetricsResult {
    return new DataPrivacyMetricsResult(false, undefined, errors);
  }
}

/**
 * Represents the reporting access result.
 */
export class ReportingAccessResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: ReportingPermissionsResult,
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The ReportingAccessResult.
   */
  static success(data: ReportingPermissionsResult): ReportingAccessResult {
    return new ReportingAccessResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The ReportingAccessResult.
   */
  static failed(errors: string[]): ReportingAccessResult {
    return new ReportingAccessResult(false, undefined, errors);
  }
}

// 接口定义
/**
 * Defines the shape of the batch processing item.
 */
export interface BatchProcessingItem {
  eventId: string;
  success: boolean;
  processedAt?: Date;
  error?: string;
}

// 仓储接口定义
/**
 * Defines the shape of the i analytics repository.
 */
export interface IAnalyticsRepository {
  save(event: AnalyticsEvent): Promise<void>;
  findById(id: string): Promise<AnalyticsEvent | null>;
  findByIds(ids: string[]): Promise<AnalyticsEvent[]>;
  findBySession(sessionId: string, timeRange?: { startDate: Date; endDate: Date }): Promise<AnalyticsEvent[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<AnalyticsEvent[]>;
  countSessionEvents(sessionId: string): Promise<number>;
  deleteExpired(olderThanDays: number): Promise<number>;
  anonymizeOldEvents(olderThanDays: number): Promise<number>;
}

/**
 * Defines the shape of the i domain event bus.
 */
export interface IDomainEventBus {
  publish(event: any): Promise<void>;
}

/**
 * Defines the shape of the i audit logger.
 */
export interface IAuditLogger {
  logBusinessEvent(eventType: string, data: any): Promise<void>;
  logSecurityEvent(eventType: string, data: any): Promise<void>;
  logError(eventType: string, data: any): Promise<void>;
}

/**
 * Defines the shape of the i privacy service.
 */
export interface IPrivacyService {
  getUserConsentStatus(userId: string): Promise<ConsentStatus>;
  anonymizeUserData(userId: string): Promise<void>;
  deleteUserData(userId: string): Promise<void>;
}

/**
 * Defines the shape of the i session tracker.
 */
export interface ISessionTracker {
  updateSessionActivity(sessionId: string, userId: string): Promise<void>;
  getSession(sessionId: string): Promise<UserSession | null>;
  endSession(sessionId: string): Promise<void>;
}