/**
 * Analytics Value Objects
 * Extracted from analytics.dto.ts for file size reduction
 */
import { ValueObject } from '../base/value-object';

// Type definitions for analytics data structures (used by value objects)
/**
 * Represents user session data for storage/restore.
 */
export interface UserSessionData {
  sessionId: string;
  userId?: string;
  deviceInfo?: DeviceInfoData;
  geoLocation?: GeoLocationData;
  consentStatus: ConsentStatus;
  isSystemSession: boolean;
}

/**
 * Represents device info data for storage/restore.
 */
export interface DeviceInfoData {
  userAgent: string;
  screenResolution: string;
  language: string;
  timezone: string;
}

/**
 * Represents geolocation data for storage/restore.
 */
export interface GeoLocationData {
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Represents event data payload structure.
 */
export interface EventPayload {
  [key: string]: string | number | boolean | undefined | null | EventPayload | EventPayload[];
}

/**
 * Represents event context data for storage/restore.
 */
export interface EventContextData {
  requestId?: string;
  userAgent?: string;
  referrer?: string;
  pageUrl?: string;
  dimensions?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/**
 * Represents event timestamp data for storage/restore.
 */
export interface EventTimestampData {
  timestamp: string | Date;
  timezone: string;
}

/**
 * Represents event data structure for storage/restore.
 */
export interface EventDataStructure {
  eventType: EventType;
  eventCategory: EventCategory;
  payload: EventPayload;
  sensitiveDataMask?: string[];
}

// Enum definitions
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

// Value Object definitions
/**
 * Represents the analytics event id.
 */
export class AnalyticsEventId extends ValueObject<{ value: string }> {
  /**
   * Generates the result.
   * @returns The AnalyticsEventId.
   */
  public static generate(): AnalyticsEventId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new AnalyticsEventId({ value: `analytics_${timestamp}_${random}` });
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  public getValue(): string {
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
  public static create(
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
  public static createSystemSession(): UserSession {
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
  public static restore(data: UserSessionData): UserSession {
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
  public getSessionId(): string {
    return this.props.sessionId;
  }

  /**
   * Retrieves user id.
   * @returns The string | undefined.
   */
  public getUserId(): string | undefined {
    return this.props.userId;
  }

  /**
   * Performs the has valid consent operation.
   * @returns The boolean value.
   */
  public hasValidConsent(): boolean {
    return (
      this.props.consentStatus === ConsentStatus.GRANTED ||
      this.props.consentStatus === ConsentStatus.NOT_APPLICABLE
    );
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  public getValidationErrors(): string[] {
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
  public anonymize(): void {
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
  public static restore(data: DeviceInfoData): DeviceInfo {
    return new DeviceInfo(data);
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
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
  public static restore(data: GeoLocationData): GeoLocation {
    return new GeoLocation(data);
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
    return !!(this.props.country && this.props.region);
  }
}

/**
 * Represents the event data.
 */
export class EventData extends ValueObject<{
  eventType: EventType;
  eventCategory: EventCategory;
  payload: EventPayload;
  sensitiveDataMask: string[];
}> {
  /**
   * Creates the entity.
   * @param eventType - The event type.
   * @param payload - The payload.
   * @returns The EventData.
   */
  public static create(eventType: EventType, payload: EventPayload): EventData {
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
  public static createPerformanceEvent(
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
  public static createMetricEvent(
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
  public static restore(data: EventDataStructure): EventData {
    return new EventData({
      eventType: data.eventType,
      eventCategory: data.eventCategory,
      payload: data.payload,
      sensitiveDataMask: data.sensitiveDataMask ?? [],
    });
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
  public getEventType(): EventType {
    return this.props.eventType;
  }

  /**
   * Retrieves event category.
   * @returns The EventCategory.
   */
  public getEventCategory(): EventCategory {
    return this.props.eventCategory;
  }

  /**
   * Performs the contains sensitive data operation.
   * @returns The boolean value.
   */
  public containsSensitiveData(): boolean {
    // 检查是否包含敏感数据的逻辑
    const sensitiveKeys = ['email', 'phone', 'address', 'ssn', 'creditCard'];
    const payloadStr = JSON.stringify(this.props.payload).toLowerCase();

    return sensitiveKeys.some((key) => payloadStr.includes(key));
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  public getValidationErrors(): string[] {
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
  public anonymize(): void {
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
  public static now(timezone?: string): EventTimestamp {
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
  public static restore(data: EventTimestampData): EventTimestamp {
    return new EventTimestamp({
      timestamp: new Date(data.timestamp),
      timezone: data.timezone,
    });
  }

  /**
   * Performs the to iso string operation.
   * @returns The string value.
   */
  public toISOString(): string {
    return this.props.timestamp.toISOString();
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  public getValidationErrors(): string[] {
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
  metadata: Record<string, unknown>;
}> {
  /**
   * Creates the entity.
   * @param context - The context.
   * @returns The EventContext.
   */
  public static create(context: EventContextData): EventContext {
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
  public static restore(data: EventContextData): EventContext {
    return new EventContext({
      requestId: data.requestId,
      userAgent: data.userAgent,
      referrer: data.referrer,
      pageUrl: data.pageUrl,
      dimensions: data.dimensions || {},
      metadata: data.metadata || {},
    });
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  public getValidationErrors(): string[] {
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
  public anonymize(): void {
    // 匿名化上下文中的敏感信息
    const newProps = { ...this.props };
    newProps.userAgent = undefined;
    newProps.referrer = undefined;
    Object.defineProperty(this, 'props', { value: newProps, writable: false });
  }
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
  public get id(): string {
    return this.props.id;
  }
  /**
   * Performs the session id operation.
   * @returns The string value.
   */
  public get sessionId(): string {
    return this.props.sessionId;
  }
  /**
   * Performs the user id operation.
   * @returns The string | undefined.
   */
  public get userId(): string | undefined {
    return this.props.userId;
  }
  /**
   * Performs the event type operation.
   * @returns The EventType.
   */
  public get eventType(): EventType {
    return this.props.eventType;
  }
  /**
   * Performs the status operation.
   * @returns The EventStatus.
   */
  public get status(): EventStatus {
    return this.props.status;
  }
  /**
   * Performs the is anonymized operation.
   * @returns The boolean value.
   */
  public get isAnonymized(): boolean {
    return this.props.isAnonymized;
  }
  /**
   * Performs the days since creation operation.
   * @returns The number value.
   */
  public get daysSinceCreation(): number {
    return this.props.daysSinceCreation;
  }
}

// Result classes (used by AnalyticsEvent validation)
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
