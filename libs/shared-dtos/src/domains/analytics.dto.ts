import { ValueObject } from '../base/value-object';
import { DomainEvent } from '../base/domain-event';

// Analytics聚合根 - 管理用户行为数据收集和分析的核心业务逻辑
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
    private retentionExpiry?: Date
  ) {}

  // 工厂方法 - 创建用户交互事件
  static createUserInteractionEvent(
    sessionId: string,
    userId: string,
    eventType: EventType,
    eventData: any,
    context?: any
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
      new Date()
    );

    event.addEvent(new AnalyticsEventCreatedEvent(
      eventId.getValue(),
      sessionId,
      userId,
      eventType,
      timestamp.toISOString(),
      new Date()
    ));

    return event;
  }

  // 工厂方法 - 创建系统性能事件
  static createSystemPerformanceEvent(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
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
      new Date()
    );

    event.addEvent(new SystemPerformanceEventCreatedEvent(
      eventId.getValue(),
      operation,
      duration,
      success,
      new Date()
    ));

    return event;
  }

  // 工厂方法 - 创建业务指标事件
  static createBusinessMetricEvent(
    metricName: string,
    metricValue: number,
    metricUnit: MetricUnit,
    dimensions?: Record<string, string>
  ): AnalyticsEvent {
    const eventId = AnalyticsEventId.generate();
    const session = UserSession.createSystemSession();
    const timestamp = EventTimestamp.now();
    const eventContext = EventContext.create({ dimensions: dimensions || {} });
    const data = EventData.createMetricEvent(metricName, metricValue, metricUnit);

    const event = new AnalyticsEvent(
      eventId,
      session,
      data,
      timestamp,
      eventContext,
      EventStatus.PENDING_PROCESSING,
      new Date()
    );

    event.addEvent(new BusinessMetricEventCreatedEvent(
      eventId.getValue(),
      metricName,
      metricValue,
      metricUnit,
      dimensions || {},
      new Date()
    ));

    return event;
  }

  // 工厂方法 - 从持久化数据恢复
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
      data.retentionExpiry ? new Date(data.retentionExpiry) : undefined
    );
  }

  // 核心业务方法 - 验证事件数据
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
      this.addEvent(new AnalyticsEventValidatedEvent(
        this.id.getValue(),
        this.session.getSessionId(),
        this.eventData.getEventType(),
        new Date()
      ));
    } else {
      this.addEvent(new AnalyticsEventValidationFailedEvent(
        this.id.getValue(),
        this.session.getSessionId(),
        validationErrors,
        new Date()
      ));
    }

    return result;
  }

  // 处理事件数据
  processEvent(): void {
    if (this.status !== EventStatus.PENDING_PROCESSING) {
      throw new Error(`Cannot process event in ${this.status} status`);
    }

    this.status = EventStatus.PROCESSED;
    this.processedAt = new Date();

    // 设置数据保留期限
    this.retentionExpiry = this.calculateRetentionExpiry();

    this.addEvent(new AnalyticsEventProcessedEvent(
      this.id.getValue(),
      this.session.getSessionId(),
      this.eventData.getEventType(),
      new Date()
    ));
  }

  // 匿名化处理敏感数据
  anonymizeData(): void {
    if (this.status === EventStatus.ANONYMIZED) {
      throw new Error('Event data is already anonymized');
    }

    // 执行数据匿名化
    this.session.anonymize();
    this.eventData.anonymize();
    this.context.anonymize();

    this.status = EventStatus.ANONYMIZED;

    this.addEvent(new AnalyticsEventAnonymizedEvent(
      this.id.getValue(),
      new Date()
    ));
  }

  // 标记为已过期，准备删除
  markAsExpired(): void {
    if (this.status === EventStatus.EXPIRED) {
      return;
    }

    this.status = EventStatus.EXPIRED;

    this.addEvent(new AnalyticsEventExpiredEvent(
      this.id.getValue(),
      this.session.getSessionId(),
      new Date()
    ));
  }

  // 隐私合规性验证
  private validatePrivacyCompliance(): PrivacyComplianceResult {
    const errors: string[] = [];

    // 检查是否包含敏感个人信息
    if (this.eventData.containsSensitiveData()) {
      errors.push('Event contains sensitive personal data without proper anonymization');
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
        return 90;  // 3个月
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
      daysSinceCreation: Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    });
  }

  // 领域事件管理
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  // Getters
  getId(): AnalyticsEventId {
    return this.id;
  }

  getStatus(): EventStatus {
    return this.status;
  }

  getSessionId(): string {
    return this.session.getSessionId();
  }

  getUserId(): string | undefined {
    return this.session.getUserId();
  }

  getEventType(): EventType {
    return this.eventData.getEventType();
  }

  getTimestamp(): string {
    return this.timestamp.toISOString();
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getRetentionExpiry(): Date | undefined {
    return this.retentionExpiry;
  }
}

// 值对象定义
export class AnalyticsEventId extends ValueObject<{ value: string }> {
  static generate(): AnalyticsEventId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new AnalyticsEventId({ value: `analytics_${timestamp}_${random}` });
  }
  
  getValue(): string {
    return this.props.value;
  }
}

export class UserSession extends ValueObject<{
  sessionId: string;
  userId?: string;
  deviceInfo?: DeviceInfo;
  geoLocation?: GeoLocation;
  consentStatus: ConsentStatus;
  isSystemSession: boolean;
}> {
  static create(sessionId: string, userId?: string, deviceInfo?: DeviceInfo, geoLocation?: GeoLocation): UserSession {
    return new UserSession({
      sessionId,
      userId,
      deviceInfo,
      geoLocation,
      consentStatus: ConsentStatus.GRANTED,
      isSystemSession: false
    });
  }

  static createSystemSession(): UserSession {
    return new UserSession({
      sessionId: `system_${Date.now()}`,
      consentStatus: ConsentStatus.NOT_APPLICABLE,
      isSystemSession: true
    });
  }

  static restore(data: any): UserSession {
    return new UserSession({
      sessionId: data.sessionId,
      userId: data.userId,
      deviceInfo: data.deviceInfo ? DeviceInfo.restore(data.deviceInfo) : undefined,
      geoLocation: data.geoLocation ? GeoLocation.restore(data.geoLocation) : undefined,
      consentStatus: data.consentStatus,
      isSystemSession: data.isSystemSession
    });
  }

  getSessionId(): string {
    return this.props.sessionId;
  }

  getUserId(): string | undefined {
    return this.props.userId;
  }

  hasValidConsent(): boolean {
    return this.props.consentStatus === ConsentStatus.GRANTED || 
           this.props.consentStatus === ConsentStatus.NOT_APPLICABLE;
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

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

  anonymize(): void {
    // 匿名化用户标识信息
    const newProps = { ...this.props };
    newProps.userId = undefined;
    newProps.deviceInfo = undefined;
    newProps.geoLocation = undefined;
    Object.defineProperty(this, 'props', { value: newProps, writable: false });
  }
}

export class DeviceInfo extends ValueObject<{
  userAgent: string;
  screenResolution: string;
  language: string;
  timezone: string;
}> {
  static restore(data: any): DeviceInfo {
    return new DeviceInfo(data);
  }

  isValid(): boolean {
    return !!(this.props.userAgent && this.props.language);
  }
}

export class GeoLocation extends ValueObject<{
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
}> {
  static restore(data: any): GeoLocation {
    return new GeoLocation(data);
  }

  isValid(): boolean {
    return !!(this.props.country && this.props.region);
  }
}

export class EventData extends ValueObject<{
  eventType: EventType;
  eventCategory: EventCategory;
  payload: any;
  sensitiveDataMask: string[];
}> {
  static create(eventType: EventType, payload: any): EventData {
    return new EventData({
      eventType,
      eventCategory: EventData.categorizeEvent(eventType),
      payload,
      sensitiveDataMask: []
    });
  }

  static createPerformanceEvent(operation: string, duration: number, success: boolean): EventData {
    return new EventData({
      eventType: EventType.SYSTEM_PERFORMANCE,
      eventCategory: EventCategory.SYSTEM,
      payload: { operation, duration, success },
      sensitiveDataMask: []
    });
  }

  static createMetricEvent(metricName: string, metricValue: number, metricUnit: MetricUnit): EventData {
    return new EventData({
      eventType: EventType.BUSINESS_METRIC,
      eventCategory: EventCategory.BUSINESS,
      payload: { metricName, metricValue, metricUnit },
      sensitiveDataMask: []
    });
  }

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

  getEventType(): EventType {
    return this.props.eventType;
  }

  getEventCategory(): EventCategory {
    return this.props.eventCategory;
  }

  containsSensitiveData(): boolean {
    // 检查是否包含敏感数据的逻辑
    const sensitiveKeys = ['email', 'phone', 'address', 'ssn', 'creditCard'];
    const payloadStr = JSON.stringify(this.props.payload).toLowerCase();
    
    return sensitiveKeys.some(key => payloadStr.includes(key));
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

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

  anonymize(): void {
    // 匿名化敏感数据
    if (this.containsSensitiveData()) {
      const newProps = { ...this.props };
      newProps.payload = { ...this.props.payload, _anonymized: true };
      Object.defineProperty(this, 'props', { value: newProps, writable: false });
    }
  }
}

export class EventTimestamp extends ValueObject<{
  timestamp: Date;
  timezone: string;
}> {
  static now(timezone?: string): EventTimestamp {
    return new EventTimestamp({
      timestamp: new Date(),
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  static restore(data: any): EventTimestamp {
    return new EventTimestamp({
      timestamp: new Date(data.timestamp),
      timezone: data.timezone
    });
  }

  toISOString(): string {
    return this.props.timestamp.toISOString();
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

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

export class EventContext extends ValueObject<{
  requestId?: string;
  userAgent?: string;
  referrer?: string;
  pageUrl?: string;
  dimensions: Record<string, string>;
  metadata: Record<string, any>;
}> {
  static create(context: any): EventContext {
    return new EventContext({
      requestId: context.requestId,
      userAgent: context.userAgent,
      referrer: context.referrer,
      pageUrl: context.pageUrl,
      dimensions: context.dimensions || {},
      metadata: context.metadata || {}
    });
  }

  static restore(data: any): EventContext {
    return new EventContext(data);
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

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

  anonymize(): void {
    // 匿名化上下文中的敏感信息
    const newProps = { ...this.props };
    newProps.userAgent = undefined;
    newProps.referrer = undefined;
    Object.defineProperty(this, 'props', { value: newProps, writable: false });
  }
}

// 结果类
export class EventValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[]
  ) {}
}

export class PrivacyComplianceResult {
  constructor(
    public readonly isCompliant: boolean,
    public readonly errors: string[]
  ) {}
}

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
  get id(): string { return this.props.id; }
  get sessionId(): string { return this.props.sessionId; }
  get userId(): string | undefined { return this.props.userId; }
  get eventType(): EventType { return this.props.eventType; }
  get status(): EventStatus { return this.props.status; }
  get isAnonymized(): boolean { return this.props.isAnonymized; }
  get daysSinceCreation(): number { return this.props.daysSinceCreation; }
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
  CONVERSION_EVENT = 'conversion_event'
}

export enum EventCategory {
  USER_BEHAVIOR = 'user_behavior',
  SYSTEM = 'system',
  BUSINESS = 'business',
  OTHER = 'other'
}

export enum EventStatus {
  PENDING_PROCESSING = 'pending_processing',
  PROCESSED = 'processed',
  ANONYMIZED = 'anonymized',
  EXPIRED = 'expired',
  ERROR = 'error'
}

export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PENDING = 'pending',
  NOT_APPLICABLE = 'not_applicable'
}

export enum MetricUnit {
  COUNT = 'count',
  PERCENTAGE = 'percentage',
  DURATION_MS = 'duration_ms',
  BYTES = 'bytes',
  CURRENCY = 'currency'
}

// 接口定义
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
export class AnalyticsEventCreatedEvent implements DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly userId: string | undefined,
    public readonly eventType: EventType,
    public readonly timestamp: string,
    public readonly occurredAt: Date
  ) {}
}

export class SystemPerformanceEventCreatedEvent implements DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly operation: string,
    public readonly duration: number,
    public readonly success: boolean,
    public readonly occurredAt: Date
  ) {}
}

export class BusinessMetricEventCreatedEvent implements DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly metricName: string,
    public readonly metricValue: number,
    public readonly metricUnit: MetricUnit,
    public readonly dimensions: Record<string, string>,
    public readonly occurredAt: Date
  ) {}
}

export class AnalyticsEventValidatedEvent implements DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly eventType: EventType,
    public readonly occurredAt: Date
  ) {}
}

export class AnalyticsEventValidationFailedEvent implements DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly errors: string[],
    public readonly occurredAt: Date
  ) {}
}

export class AnalyticsEventProcessedEvent implements DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly eventType: EventType,
    public readonly occurredAt: Date
  ) {}
}

export class AnalyticsEventAnonymizedEvent implements DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly occurredAt: Date
  ) {}
}

export class AnalyticsEventExpiredEvent implements DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly occurredAt: Date
  ) {}
}