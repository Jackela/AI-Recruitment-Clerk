import type {
  EventType,
  MetricUnit,
} from './analytics.dto';
import {
  AnalyticsEvent,
} from './analytics.dto';
import { AnalyticsRules } from './analytics.rules';
import type {
  IAnalyticsRepository,
  IDomainEventBus,
  IAuditLogger,
  IPrivacyService,
  ISessionTracker,
} from './analytics-interfaces';
import { EventCreationResult } from './analytics-result-classes';

/**
 * Service for collecting analytics events.
 * Handles creation of user interaction, system performance, and business metric events.
 */
export class AnalyticsEventCollectionService {
  constructor(
    private readonly repository: IAnalyticsRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
    private readonly privacyService: IPrivacyService,
    private readonly sessionTracker: ISessionTracker,
  ) {}

  /**
   * 创建用户交互事件
   */
  public async createUserInteractionEvent(
    sessionId: string,
    userId: string,
    eventType: EventType,
    eventData: import('./analytics.dto').EventPayload,
    context?: Record<string, unknown>,
  ): Promise<EventCreationResult> {
    try {
      // 获取会话中现有事件数量
      const sessionEventCount =
        await this.repository.countSessionEvents(sessionId);

      // 获取用户同意状态
      const consentStatus =
        await this.privacyService.getUserConsentStatus(userId);

      // 验证创建资格
      const eligibility = AnalyticsRules.canCreateEvent(
        sessionId,
        eventType,
        eventData,
        consentStatus,
        sessionEventCount,
      );

      if (!eligibility.isEligible) {
        await this.auditLogger.logSecurityEvent('EVENT_CREATION_DENIED', {
          sessionId,
          userId,
          eventType,
          errors: eligibility.errors,
        });
        return EventCreationResult.failed(eligibility.errors);
      }

      // 创建事件
      const event = AnalyticsEvent.createUserInteractionEvent(
        sessionId,
        userId,
        eventType,
        eventData,
        context,
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
        priority: eligibility.priority.level,
      });

      return EventCreationResult.success(event.getEventSummary());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('CREATE_USER_EVENT_ERROR', {
        sessionId,
        userId,
        eventType,
        error: errorMessage,
      });
      console.error('Error creating user interaction event:', error);
      return EventCreationResult.failed([
        'Internal error occurred while creating event',
      ]);
    }
  }

  /**
   * 创建系统性能事件
   */
  public async createSystemPerformanceEvent(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>,
  ): Promise<EventCreationResult> {
    try {
      // 创建系统性能事件
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        operation,
        duration,
        success,
        metadata,
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
        await this.auditLogger.logSecurityEvent(
          'PERFORMANCE_THRESHOLD_EXCEEDED',
          {
            operation,
            duration,
            threshold: AnalyticsRules.CRITICAL_PERFORMANCE_THRESHOLD_MS,
          },
        );
      }

      return EventCreationResult.success(event.getEventSummary());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('CREATE_SYSTEM_EVENT_ERROR', {
        operation,
        duration,
        success,
        error: errorMessage,
      });
      console.error('Error creating system performance event:', error);
      return EventCreationResult.failed([
        'Internal error occurred while creating system event',
      ]);
    }
  }

  /**
   * 创建业务指标事件
   */
  public async createBusinessMetricEvent(
    metricName: string,
    metricValue: number,
    metricUnit: MetricUnit,
    dimensions?: Record<string, string>,
  ): Promise<EventCreationResult> {
    try {
      // 创建业务指标事件
      const event = AnalyticsEvent.createBusinessMetricEvent(
        metricName,
        metricValue,
        metricUnit,
        dimensions,
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
        dimensions: dimensions || {},
      });

      return EventCreationResult.success(event.getEventSummary());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('CREATE_BUSINESS_METRIC_ERROR', {
        metricName,
        metricValue,
        metricUnit,
        error: errorMessage,
      });
      console.error('Error creating business metric event:', error);
      return EventCreationResult.failed([
        'Internal error occurred while creating business metric',
      ]);
    }
  }
}
