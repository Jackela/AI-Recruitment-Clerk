/**
 * Analytics Domain - Aggregate Root and Domain Events
 * Value objects have been extracted to analytics-value-objects.dto.ts
 */
import type { DomainEvent } from '../base/domain-event';
import {
  AnalyticsEventCreatedEvent,
  SystemPerformanceEventCreatedEvent,
  BusinessMetricEventCreatedEvent,
  AnalyticsEventValidatedEvent,
  AnalyticsEventValidationFailedEvent,
  AnalyticsEventProcessedEvent,
  AnalyticsEventAnonymizedEvent,
  AnalyticsEventExpiredEvent,
} from './analytics-event.dto';

// Re-export from value objects for backward compatibility
export {
  AnalyticsEventId,
  UserSession,
  DeviceInfo,
  GeoLocation,
  EventData,
  EventTimestamp,
  EventContext,
  AnalyticsEventSummary,
  EventValidationResult,
  PrivacyComplianceResult,
  EventType,
  EventCategory,
  EventStatus,
  ConsentStatus,
  MetricUnit,
  type UserSessionData,
  type DeviceInfoData,
  type GeoLocationData,
  type EventPayload,
  type EventContextData,
  type EventTimestampData,
  type EventDataStructure,
} from './analytics-value-objects.dto';

// Import types for internal use (runtime values only - types come from re-exports)
import type {
  MetricUnit} from './analytics-value-objects.dto';
import {
  AnalyticsEventId,
  UserSession,
  EventData,
  EventTimestamp,
  EventContext,
  AnalyticsEventSummary,
  EventValidationResult,
  PrivacyComplianceResult,
  EventType,
  EventStatus,
  type UserSessionData,
  type EventPayload,
  type EventContextData,
  type EventTimestampData,
  type EventDataStructure,
} from './analytics-value-objects.dto';

// Analytics聚合根 - 管理用户行为数据收集和分析的核心业务逻辑
/**
 * Represents the analytics event event.
 */
export class AnalyticsEvent {
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: AnalyticsEventId,
    private readonly session: UserSession,
    private readonly eventData: EventData,
    private readonly timestamp: EventTimestamp,
    private readonly context: EventContext,
    private status: EventStatus,
    private readonly createdAt: Date,
    private processedAt?: Date,
    private retentionExpiry?: Date,
  ) {}

  // 工厂方法 - 创建用户交互事件
  /**
   * Creates user interaction event.
   * @param sessionId - The session id.
   * @param userId - The user id.
   * @param eventType - The event type.
   * @param eventData - The event data.
   * @param context - The context.
   * @returns The AnalyticsEvent.
   */
  public static createUserInteractionEvent(
    sessionId: string,
    userId: string,
    eventType: EventType,
    eventData: EventPayload,
    context?: EventContextData,
  ): AnalyticsEvent {
    const eventId = AnalyticsEventId.generate();
    const session = UserSession.create(sessionId, userId);
    const eventTimestamp = EventTimestamp.now();
    const eventContext = EventContext.create(context || {});
    const data = EventData.create(eventType, eventData);

    const event = new AnalyticsEvent(
      eventId,
      session,
      data,
      eventTimestamp,
      eventContext,
      EventStatus.PENDING_PROCESSING,
      new Date(),
    );

    event.addEvent(
      new AnalyticsEventCreatedEvent(
        eventId.getValue(),
        sessionId,
        userId,
        eventType,
        eventTimestamp.toISOString(),
        new Date(),
      ),
    );

    return event;
  }

  // 工厂方法 - 创建系统性能事件
  /**
   * Creates system performance event.
   * @param operation - The operation.
   * @param duration - The duration.
   * @param success - The success.
   * @param metadata - The metadata.
   * @returns The AnalyticsEvent.
   */
  public static createSystemPerformanceEvent(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>,
  ): AnalyticsEvent {
    const eventId = AnalyticsEventId.generate();
    const session = UserSession.createSystemSession();
    const eventTimestamp = EventTimestamp.now();
    const eventContext = EventContext.create(metadata || {});
    const data = EventData.createPerformanceEvent(operation, duration, success);

    const event = new AnalyticsEvent(
      eventId,
      session,
      data,
      eventTimestamp,
      eventContext,
      EventStatus.PENDING_PROCESSING,
      new Date(),
    );

    event.addEvent(
      new SystemPerformanceEventCreatedEvent(
        eventId.getValue(),
        operation,
        duration,
        success,
        new Date(),
      ),
    );

    return event;
  }

  // 工厂方法 - 创建业务指标事件
  /**
   * Creates business metric event.
   * @param metricName - The metric name.
   * @param metricValue - The metric value.
   * @param metricUnit - The metric unit.
   * @param dimensions - The dimensions.
   * @returns The AnalyticsEvent.
   */
  public static createBusinessMetricEvent(
    metricName: string,
    metricValue: number,
    metricUnit: MetricUnit,
    dimensions?: Record<string, string>,
  ): AnalyticsEvent {
    const eventId = AnalyticsEventId.generate();
    const session = UserSession.createSystemSession();
    const eventTimestamp = EventTimestamp.now();
    const eventContext = EventContext.create({ dimensions: dimensions || {} });
    const data = EventData.createMetricEvent(
      metricName,
      metricValue,
      metricUnit,
    );

    const event = new AnalyticsEvent(
      eventId,
      session,
      data,
      eventTimestamp,
      eventContext,
      EventStatus.PENDING_PROCESSING,
      new Date(),
    );

    event.addEvent(
      new BusinessMetricEventCreatedEvent(
        eventId.getValue(),
        metricName,
        metricValue,
        metricUnit,
        dimensions || {},
        new Date(),
      ),
    );

    return event;
  }

  // 工厂方法 - 从持久化数据恢复
  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The AnalyticsEvent.
   */
  public static restore(data: AnalyticsEventData): AnalyticsEvent {
    return new AnalyticsEvent(
      new AnalyticsEventId({ value: data.id }),
      UserSession.restore(data.session),
      EventData.restore(data.eventData),
      EventTimestamp.restore(data.timestamp),
      EventContext.restore(data.context),
      data.status,
      new Date(data.createdAt),
      data.processedAt ? new Date(data.processedAt) : undefined,
      data.retentionExpiry ? new Date(data.retentionExpiry) : undefined,
    );
  }

  // 核心业务方法 - 验证事件数据
  /**
   * Validates event.
   * @returns The EventValidationResult.
   */
  public validateEvent(): EventValidationResult {
    const validationErrors: string[] = [];

    // 验证会话信息
    if (!this.session.isValid()) {
      validationErrors.push(...this.session.getValidationErrors());
    }

    // 验证事件数据
    if (!this.eventData.isValid()) {
      validationErrors.push(...this.eventData.getValidationErrors());
    }

    // 验证时间戳
    if (!this.timestamp.isValid()) {
      validationErrors.push(...this.timestamp.getValidationErrors());
    }

    // 验证事件上下文
    if (!this.context.isValid()) {
      validationErrors.push(...this.context.getValidationErrors());
    }

    // 验证数据隐私合规性
    const privacyValidation = this.validatePrivacyCompliance();
    if (!privacyValidation.isCompliant) {
      validationErrors.push(...privacyValidation.errors);
    }

    const isValid = validationErrors.length === 0;
    const result = new EventValidationResult(isValid, validationErrors);

    if (isValid) {
      this.addEvent(
        new AnalyticsEventValidatedEvent(
          this.id.getValue(),
          this.session.getSessionId(),
          this.eventData.getEventType(),
          new Date(),
        ),
      );
    } else {
      this.addEvent(
        new AnalyticsEventValidationFailedEvent(
          this.id.getValue(),
          this.session.getSessionId(),
          validationErrors,
          new Date(),
        ),
      );
    }

    return result;
  }

  // 处理事件数据
  /**
   * Performs the process event operation.
   */
  public processEvent(): void {
    if (this.status !== EventStatus.PENDING_PROCESSING) {
      throw new Error(`Cannot process event in ${this.status} status`);
    }

    this.status = EventStatus.PROCESSED;
    this.processedAt = new Date();

    // 设置数据保留期限
    this.retentionExpiry = this.calculateRetentionExpiry();

    this.addEvent(
      new AnalyticsEventProcessedEvent(
        this.id.getValue(),
        this.session.getSessionId(),
        this.eventData.getEventType(),
        new Date(),
      ),
    );
  }

  // 匿名化处理敏感数据
  /**
   * Performs the anonymize data operation.
   */
  public anonymizeData(): void {
    if (this.status === EventStatus.ANONYMIZED) {
      throw new Error('Event data is already anonymized');
    }

    // 执行数据匿名化
    this.session.anonymize();
    this.eventData.anonymize();
    this.context.anonymize();

    this.status = EventStatus.ANONYMIZED;

    this.addEvent(
      new AnalyticsEventAnonymizedEvent(this.id.getValue(), new Date()),
    );
  }

  // 标记为已过期，准备删除
  /**
   * Performs the mark as expired operation.
   */
  public markAsExpired(): void {
    if (this.status === EventStatus.EXPIRED) {
      return;
    }

    this.status = EventStatus.EXPIRED;

    this.addEvent(
      new AnalyticsEventExpiredEvent(
        this.id.getValue(),
        this.session.getSessionId(),
        new Date(),
      ),
    );
  }

  // 隐私合规性验证
  private validatePrivacyCompliance(): PrivacyComplianceResult {
    const errors: string[] = [];

    // 检查是否包含敏感个人信息
    if (this.eventData.containsSensitiveData()) {
      errors.push(
        'Event contains sensitive personal data without proper anonymization',
      );
    }

    // 检查数据保留政策合规性
    if (this.isRetentionPeriodExceeded()) {
      errors.push('Event data retention period has been exceeded');
    }

    // 检查用户同意状态
    if (!this.session.hasValidConsent()) {
      errors.push('User consent for data collection is missing or expired');
    }

    return new PrivacyComplianceResult(errors.length === 0, errors);
  }

  // 计算数据保留期限
  private calculateRetentionExpiry(): Date {
    const retentionDays = this.getRetentionPeriodDays();
    const expiry = new Date(this.createdAt);
    expiry.setDate(expiry.getDate() + retentionDays);
    return expiry;
  }

  // 获取保留期限天数
  private getRetentionPeriodDays(): number {
    switch (this.eventData.getEventType()) {
      case EventType.USER_INTERACTION:
        return 730; // 2年
      case EventType.SYSTEM_PERFORMANCE:
        return 90; // 3个月
      case EventType.BUSINESS_METRIC:
        return 1095; // 3年
      case EventType.ERROR_EVENT:
        return 365; // 1年
      default:
        return 365; // 默认1年
    }
  }

  // 检查是否超过保留期限
  private isRetentionPeriodExceeded(): boolean {
    if (!this.retentionExpiry) {
      return false;
    }
    return new Date() > this.retentionExpiry;
  }

  // 查询方法
  /**
   * Retrieves event summary.
   * @returns The AnalyticsEventSummary.
   */
  public getEventSummary(): AnalyticsEventSummary {
    return new AnalyticsEventSummary({
      id: this.id.getValue(),
      sessionId: this.session.getSessionId(),
      userId: this.session.getUserId(),
      eventType: this.eventData.getEventType(),
      eventCategory: this.eventData.getEventCategory(),
      timestamp: this.timestamp.toISOString(),
      status: this.status,
      createdAt: this.createdAt,
      processedAt: this.processedAt,
      retentionExpiry: this.retentionExpiry,
      isAnonymized: this.status === EventStatus.ANONYMIZED,
      daysSinceCreation: Math.floor(
        (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    });
  }

  // 领域事件管理
  /**
   * Retrieves uncommitted events.
   * @returns The an array of DomainEvent.
   */
  public getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Performs the mark events as committed operation.
   */
  public markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  // Getters
  /**
   * Retrieves id.
   * @returns The AnalyticsEventId.
   */
  public getId(): AnalyticsEventId {
    return this.id;
  }

  /**
   * Retrieves status.
   * @returns The EventStatus.
   */
  public getStatus(): EventStatus {
    return this.status;
  }

  /**
   * Retrieves session id.
   * @returns The string value.
   */
  public getSessionId(): string {
    return this.session.getSessionId();
  }

  /**
   * Retrieves user id.
   * @returns The string | undefined.
   */
  public getUserId(): string | undefined {
    return this.session.getUserId();
  }

  /**
   * Retrieves event type.
   * @returns The EventType.
   */
  public getEventType(): EventType {
    return this.eventData.getEventType();
  }

  /**
   * Retrieves timestamp.
   * @returns The string value.
   */
  public getTimestamp(): string {
    return this.timestamp.toISOString();
  }

  /**
   * Retrieves created at.
   * @returns The Date.
   */
  public getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Retrieves retention expiry.
   * @returns The Date | undefined.
   */
  public getRetentionExpiry(): Date | undefined {
    return this.retentionExpiry;
  }
}

// Interface for persistence/restore
/**
 * Defines the shape of the analytics event data.
 */
export interface AnalyticsEventData {
  id: string;
  session: UserSessionData;
  eventData: EventDataStructure;
  timestamp: EventTimestampData;
  context: EventContextData;
  status: EventStatus;
  createdAt: string;
  processedAt?: string;
  retentionExpiry?: string;
}
