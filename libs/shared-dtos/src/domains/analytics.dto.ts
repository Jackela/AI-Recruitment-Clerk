import { ValueObject } from '../base/value-object';
import type { DomainEvent } from '../base/domain-event';

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
  static createUserInteractionEvent(
    sessionId: string,
    userId: string,
    eventType: EventType,
    eventData: any,
    context?: any,
  ): AnalyticsEvent {
    const eventId = AnalyticsEventId.generate();
    const session = UserSession.create(sessionId, userId);
    const timestamp = EventTimestamp.now();
    const eventContext = EventContext.create(context || {});
    const data = EventData.create(eventType, eventData);

    const event = new AnalyticsEvent(
      eventId,
      session,
      data,
      timestamp,
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
        timestamp.toISOString(),
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
  static createSystemPerformanceEvent(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any,
  ): AnalyticsEvent {
    const eventId = AnalyticsEventId.generate();
    const session = UserSession.createSystemSession();
    const timestamp = EventTimestamp.now();
    const eventContext = EventContext.create(metadata || {});
    const data = EventData.createPerformanceEvent(operation, duration, success);

    const event = new AnalyticsEvent(
      eventId,
      session,
      data,
      timestamp,
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
  static createBusinessMetricEvent(
    metricName: string,
    metricValue: number,
    metricUnit: MetricUnit,
    dimensions?: Record<string, string>,
  ): AnalyticsEvent {
    const eventId = AnalyticsEventId.generate();
    const session = UserSession.createSystemSession();
    const timestamp = EventTimestamp.now();
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
      timestamp,
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
  static restore(data: AnalyticsEventData): AnalyticsEvent {
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
  validateEvent(): EventValidationResult {
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
  processEvent(): void {
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
  anonymizeData(): void {
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
  markAsExpired(): void {
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
  getEventSummary(): AnalyticsEventSummary {
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
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Performs the mark events as committed operation.
   */
  markEventsAsCommitted(): void {
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
  getId(): AnalyticsEventId {
    return this.id;
  }

  /**
   * Retrieves status.
   * @returns The EventStatus.
   */
  getStatus(): EventStatus {
    return this.status;
  }

  /**
   * Retrieves session id.
   * @returns The string value.
   */
  getSessionId(): string {
    return this.session.getSessionId();
  }

  /**
   * Retrieves user id.
   * @returns The string | undefined.
   */
  getUserId(): string | undefined {
    return this.session.getUserId();
  }

  /**
   * Retrieves event type.
   * @returns The EventType.
   */
  getEventType(): EventType {
    return this.eventData.getEventType();
  }

  /**
   * Retrieves timestamp.
   * @returns The string value.
   */
  getTimestamp(): string {
    return this.timestamp.toISOString();
  }

  /**
   * Retrieves created at.
   * @returns The Date.
   */
  getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Retrieves retention expiry.
   * @returns The Date | undefined.
   */
  getRetentionExpiry(): Date | undefined {
    return this.retentionExpiry;
  }
}

// 值对象定义
/**
 * Represents the analytics event id.
 */
export class AnalyticsEventId extends ValueObject<{ value: string }> {
  /**
   * Generates the result.
   * @returns The AnalyticsEventId.
   */
  static generate(): AnalyticsEventId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new AnalyticsEventId({ value: `analytics_${timestamp}_${random}` });
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  getValue(): string {
    return this.props.value;
  }
}

/**
 * Represents the user session.
 */
export class UserSession extends ValueObject<{
  sessionId: string;
  userId?: string;
  deviceInfo?: DeviceInfo;
  geoLocation?: GeoLocation;
  consentStatus: ConsentStatus;
  isSystemSession: boolean;
}> {
  /**
   * Creates the entity.
   * @param sessionId - The session id.
   * @param userId - The user id.
   * @param deviceInfo - The device info.
   * @param geoLocation - The geo location.
   * @returns The UserSession.
   */
  static create(
    sessionId: string,
    userId?: string,
    deviceInfo?: DeviceInfo,
    geoLocation?: GeoLocation,
  ): UserSession {
    return new UserSession({
      sessionId,
      userId,
      deviceInfo,
      geoLocation,
      consentStatus: ConsentStatus.GRANTED,
      isSystemSession: false,
    });
  }

  /**
   * Creates system session.
   * @returns The UserSession.
   */
  static createSystemSession(): UserSession {
    return new UserSession({
      sessionId: `system_${Date.now()}`,
      consentStatus: ConsentStatus.NOT_APPLICABLE,
      isSystemSession: true,
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The UserSession.
   */
  static restore(data: any): UserSession {
    return new UserSession({
      sessionId: data.sessionId,
      userId: data.userId,
      deviceInfo: data.deviceInfo
        ? DeviceInfo.restore(data.deviceInfo)
        : undefined,
      geoLocation: data.geoLocation
        ? GeoLocation.restore(data.geoLocation)
        : undefined,
      consentStatus: data.consentStatus,
      isSystemSession: data.isSystemSession,
    });
  }

  /**
   * Retrieves session id.
   * @returns The string value.
   */
  getSessionId(): string {
    return this.props.sessionId;
  }

  /**
   * Retrieves user id.
   * @returns The string | undefined.
   */
  getUserId(): string | undefined {
    return this.props.userId;
  }

  /**
   * Performs the has valid consent operation.
   * @returns The boolean value.
   */
  hasValidConsent(): boolean {
    return (
      this.props.consentStatus === ConsentStatus.GRANTED ||
      this.props.consentStatus === ConsentStatus.NOT_APPLICABLE
    );
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.props.sessionId || this.props.sessionId.trim().length === 0) {
      errors.push('Session ID is required');
    }

    if (!this.props.isSystemSession && !this.props.userId) {
      errors.push('User ID is required for user sessions');
    }

    if (!Object.values(ConsentStatus).includes(this.props.consentStatus)) {
      errors.push('Invalid consent status');
    }

    return errors;
  }

  /**
   * Performs the anonymize operation.
   */
  anonymize(): void {
    // 匿名化用户标识信息
    const newProps = { ...this.props };
    newProps.userId = undefined;
    newProps.deviceInfo = undefined;
    newProps.geoLocation = undefined;
    Object.defineProperty(this, 'props', { value: newProps, writable: false });
  }
}

/**
 * Represents the device info.
 */
export class DeviceInfo extends ValueObject<{
  userAgent: string;
  screenResolution: string;
  language: string;
  timezone: string;
}> {
  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The DeviceInfo.
   */
  static restore(data: any): DeviceInfo {
    return new DeviceInfo(data);
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  isValid(): boolean {
    return !!(this.props.userAgent && this.props.language);
  }
}

/**
 * Represents the geo location.
 */
export class GeoLocation extends ValueObject<{
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
}> {
  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The GeoLocation.
   */
  static restore(data: any): GeoLocation {
    return new GeoLocation(data);
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  isValid(): boolean {
    return !!(this.props.country && this.props.region);
  }
}

/**
 * Represents the event data.
 */
export class EventData extends ValueObject<{
  eventType: EventType;
  eventCategory: EventCategory;
  payload: any;
  sensitiveDataMask: string[];
}> {
  /**
   * Creates the entity.
   * @param eventType - The event type.
   * @param payload - The payload.
   * @returns The EventData.
   */
  static create(eventType: EventType, payload: any): EventData {
    return new EventData({
      eventType,
      eventCategory: EventData.categorizeEvent(eventType),
      payload,
      sensitiveDataMask: [],
    });
  }

  /**
   * Creates performance event.
   * @param operation - The operation.
   * @param duration - The duration.
   * @param success - The success.
   * @returns The EventData.
   */
  static createPerformanceEvent(
    operation: string,
    duration: number,
    success: boolean,
  ): EventData {
    return new EventData({
      eventType: EventType.SYSTEM_PERFORMANCE,
      eventCategory: EventCategory.SYSTEM,
      payload: { operation, duration, success },
      sensitiveDataMask: [],
    });
  }

  /**
   * Creates metric event.
   * @param metricName - The metric name.
   * @param metricValue - The metric value.
   * @param metricUnit - The metric unit.
   * @returns The EventData.
   */
  static createMetricEvent(
    metricName: string,
    metricValue: number,
    metricUnit: MetricUnit,
  ): EventData {
    return new EventData({
      eventType: EventType.BUSINESS_METRIC,
      eventCategory: EventCategory.BUSINESS,
      payload: { metricName, metricValue, metricUnit },
      sensitiveDataMask: [],
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The EventData.
   */
  static restore(data: any): EventData {
    return new EventData(data);
  }

  private static categorizeEvent(eventType: EventType): EventCategory {
    switch (eventType) {
      case EventType.USER_INTERACTION:
      case EventType.PAGE_VIEW:
      case EventType.FORM_SUBMISSION:
        return EventCategory.USER_BEHAVIOR;

      case EventType.SYSTEM_PERFORMANCE:
      case EventType.ERROR_EVENT:
      case EventType.API_CALL:
        return EventCategory.SYSTEM;

      case EventType.BUSINESS_METRIC:
      case EventType.CONVERSION_EVENT:
        return EventCategory.BUSINESS;

      default:
        return EventCategory.OTHER;
    }
  }

  /**
   * Retrieves event type.
   * @returns The EventType.
   */
  getEventType(): EventType {
    return this.props.eventType;
  }

  /**
   * Retrieves event category.
   * @returns The EventCategory.
   */
  getEventCategory(): EventCategory {
    return this.props.eventCategory;
  }

  /**
   * Performs the contains sensitive data operation.
   * @returns The boolean value.
   */
  containsSensitiveData(): boolean {
    // 检查是否包含敏感数据的逻辑
    const sensitiveKeys = ['email', 'phone', 'address', 'ssn', 'creditCard'];
    const payloadStr = JSON.stringify(this.props.payload).toLowerCase();

    return sensitiveKeys.some((key) => payloadStr.includes(key));
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!Object.values(EventType).includes(this.props.eventType)) {
      errors.push('Invalid event type');
    }

    if (!Object.values(EventCategory).includes(this.props.eventCategory)) {
      errors.push('Invalid event category');
    }

    if (!this.props.payload) {
      errors.push('Event payload is required');
    }

    return errors;
  }

  /**
   * Performs the anonymize operation.
   */
  anonymize(): void {
    // 匿名化敏感数据
    if (this.containsSensitiveData()) {
      const newProps = { ...this.props };
      newProps.payload = { ...this.props.payload, _anonymized: true };
      Object.defineProperty(this, 'props', {
        value: newProps,
        writable: false,
      });
    }
  }
}

/**
 * Represents the event timestamp.
 */
export class EventTimestamp extends ValueObject<{
  timestamp: Date;
  timezone: string;
}> {
  /**
   * Performs the now operation.
   * @param timezone - The timezone.
   * @returns The EventTimestamp.
   */
  static now(timezone?: string): EventTimestamp {
    return new EventTimestamp({
      timestamp: new Date(),
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The EventTimestamp.
   */
  static restore(data: any): EventTimestamp {
    return new EventTimestamp({
      timestamp: new Date(data.timestamp),
      timezone: data.timezone,
    });
  }

  /**
   * Performs the to iso string operation.
   * @returns The string value.
   */
  toISOString(): string {
    return this.props.timestamp.toISOString();
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.props.timestamp || isNaN(this.props.timestamp.getTime())) {
      errors.push('Invalid timestamp');
    }

    if (!this.props.timezone) {
      errors.push('Timezone is required');
    }

    // 检查时间戳是否在合理范围内
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (this.props.timestamp < oneYearAgo) {
      errors.push('Timestamp is too old (>1 year)');
    }

    if (this.props.timestamp > oneDayFromNow) {
      errors.push('Timestamp cannot be in the future (>1 day)');
    }

    return errors;
  }
}

/**
 * Represents the event context.
 */
export class EventContext extends ValueObject<{
  requestId?: string;
  userAgent?: string;
  referrer?: string;
  pageUrl?: string;
  dimensions: Record<string, string>;
  metadata: Record<string, any>;
}> {
  /**
   * Creates the entity.
   * @param context - The context.
   * @returns The EventContext.
   */
  static create(context: any): EventContext {
    return new EventContext({
      requestId: context.requestId,
      userAgent: context.userAgent,
      referrer: context.referrer,
      pageUrl: context.pageUrl,
      dimensions: context.dimensions || {},
      metadata: context.metadata || {},
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The EventContext.
   */
  static restore(data: any): EventContext {
    return new EventContext(data);
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (typeof this.props.dimensions !== 'object') {
      errors.push('Dimensions must be an object');
    }

    if (typeof this.props.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }

    return errors;
  }

  /**
   * Performs the anonymize operation.
   */
  anonymize(): void {
    // 匿名化上下文中的敏感信息
    const newProps = { ...this.props };
    newProps.userAgent = undefined;
    newProps.referrer = undefined;
    Object.defineProperty(this, 'props', { value: newProps, writable: false });
  }
}

// 结果类
/**
 * Represents the event validation result.
 */
export class EventValidationResult {
  /**
   * Initializes a new instance of the Event Validation Result.
   * @param isValid - The is valid.
   * @param errors - The errors.
   */
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
  ) {}
}

/**
 * Represents the privacy compliance result.
 */
export class PrivacyComplianceResult {
  /**
   * Initializes a new instance of the Privacy Compliance Result.
   * @param isCompliant - The is compliant.
   * @param errors - The errors.
   */
  constructor(
    public readonly isCompliant: boolean,
    public readonly errors: string[],
  ) {}
}

/**
 * Represents the analytics event summary.
 */
export class AnalyticsEventSummary extends ValueObject<{
  id: string;
  sessionId: string;
  userId?: string;
  eventType: EventType;
  eventCategory: EventCategory;
  timestamp: string;
  status: EventStatus;
  createdAt: Date;
  processedAt?: Date;
  retentionExpiry?: Date;
  isAnonymized: boolean;
  daysSinceCreation: number;
}> {
  /**
   * Performs the id operation.
   * @returns The string value.
   */
  get id(): string {
    return this.props.id;
  }
  /**
   * Performs the session id operation.
   * @returns The string value.
   */
  get sessionId(): string {
    return this.props.sessionId;
  }
  /**
   * Performs the user id operation.
   * @returns The string | undefined.
   */
  get userId(): string | undefined {
    return this.props.userId;
  }
  /**
   * Performs the event type operation.
   * @returns The EventType.
   */
  get eventType(): EventType {
    return this.props.eventType;
  }
  /**
   * Performs the status operation.
   * @returns The EventStatus.
   */
  get status(): EventStatus {
    return this.props.status;
  }
  /**
   * Performs the is anonymized operation.
   * @returns The boolean value.
   */
  get isAnonymized(): boolean {
    return this.props.isAnonymized;
  }
  /**
   * Performs the days since creation operation.
   * @returns The number value.
   */
  get daysSinceCreation(): number {
    return this.props.daysSinceCreation;
  }
}

// 枚举定义
export enum EventType {
  USER_INTERACTION = 'user_interaction',
  PAGE_VIEW = 'page_view',
  FORM_SUBMISSION = 'form_submission',
  SYSTEM_PERFORMANCE = 'system_performance',
  ERROR_EVENT = 'error_event',
  API_CALL = 'api_call',
  BUSINESS_METRIC = 'business_metric',
  CONVERSION_EVENT = 'conversion_event',
}

export enum EventCategory {
  USER_BEHAVIOR = 'user_behavior',
  SYSTEM = 'system',
  BUSINESS = 'business',
  OTHER = 'other',
}

export enum EventStatus {
  PENDING_PROCESSING = 'pending_processing',
  PROCESSED = 'processed',
  ANONYMIZED = 'anonymized',
  EXPIRED = 'expired',
  ERROR = 'error',
}

export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PENDING = 'pending',
  NOT_APPLICABLE = 'not_applicable',
}

export enum MetricUnit {
  COUNT = 'count',
  PERCENTAGE = 'percentage',
  DURATION_MS = 'duration_ms',
  BYTES = 'bytes',
  CURRENCY = 'currency',
}

// 接口定义
/**
 * Defines the shape of the analytics event data.
 */
export interface AnalyticsEventData {
  id: string;
  session: any;
  eventData: any;
  timestamp: any;
  context: any;
  status: EventStatus;
  createdAt: string;
  processedAt?: string;
  retentionExpiry?: string;
}

// 领域事件
/**
 * Represents the analytics event created event event.
 */
export class AnalyticsEventCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Created Event.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param userId - The user id.
   * @param eventType - The event type.
   * @param timestamp - The timestamp.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly userId: string | undefined,
    public readonly eventType: EventType,
    public readonly timestamp: string,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the system performance event created event event.
 */
export class SystemPerformanceEventCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the System Performance Event Created Event.
   * @param eventId - The event id.
   * @param operation - The operation.
   * @param duration - The duration.
   * @param success - The success.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly operation: string,
    public readonly duration: number,
    public readonly success: boolean,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the business metric event created event event.
 */
export class BusinessMetricEventCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Business Metric Event Created Event.
   * @param eventId - The event id.
   * @param metricName - The metric name.
   * @param metricValue - The metric value.
   * @param metricUnit - The metric unit.
   * @param dimensions - The dimensions.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly metricName: string,
    public readonly metricValue: number,
    public readonly metricUnit: MetricUnit,
    public readonly dimensions: Record<string, string>,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the analytics event validated event event.
 */
export class AnalyticsEventValidatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Validated Event.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param eventType - The event type.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly eventType: EventType,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the analytics event validation failed event event.
 */
export class AnalyticsEventValidationFailedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Validation Failed Event.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param errors - The errors.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly errors: string[],
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the analytics event processed event event.
 */
export class AnalyticsEventProcessedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Processed Event.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param eventType - The event type.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly eventType: EventType,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the analytics event anonymized event event.
 */
export class AnalyticsEventAnonymizedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Anonymized Event.
   * @param eventId - The event id.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the analytics event expired event event.
 */
export class AnalyticsEventExpiredEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Expired Event.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly occurredAt: Date,
  ) {}
}
