"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEventExpiredEvent = exports.AnalyticsEventAnonymizedEvent = exports.AnalyticsEventProcessedEvent = exports.AnalyticsEventValidationFailedEvent = exports.AnalyticsEventValidatedEvent = exports.BusinessMetricEventCreatedEvent = exports.SystemPerformanceEventCreatedEvent = exports.AnalyticsEventCreatedEvent = exports.MetricUnit = exports.ConsentStatus = exports.EventStatus = exports.EventCategory = exports.EventType = exports.AnalyticsEventSummary = exports.PrivacyComplianceResult = exports.EventValidationResult = exports.EventContext = exports.EventTimestamp = exports.EventData = exports.GeoLocation = exports.DeviceInfo = exports.UserSession = exports.AnalyticsEventId = exports.AnalyticsEvent = void 0;
const value_object_1 = require("../base/value-object");
// Analytics聚合根 - 管理用户行为数据收集和分析的核心业务逻辑
class AnalyticsEvent {
    constructor(id, session, eventData, timestamp, context, status, createdAt, processedAt, retentionExpiry) {
        this.id = id;
        this.session = session;
        this.eventData = eventData;
        this.timestamp = timestamp;
        this.context = context;
        this.status = status;
        this.createdAt = createdAt;
        this.processedAt = processedAt;
        this.retentionExpiry = retentionExpiry;
        this.uncommittedEvents = [];
    }
    // 工厂方法 - 创建用户交互事件
    static createUserInteractionEvent(sessionId, userId, eventType, eventData, context) {
        const eventId = AnalyticsEventId.generate();
        const session = UserSession.create(sessionId, userId);
        const timestamp = EventTimestamp.now();
        const eventContext = EventContext.create(context || {});
        const data = EventData.create(eventType, eventData);
        const event = new AnalyticsEvent(eventId, session, data, timestamp, eventContext, EventStatus.PENDING_PROCESSING, new Date());
        event.addEvent(new AnalyticsEventCreatedEvent(eventId.getValue(), sessionId, userId, eventType, timestamp.toISOString(), new Date()));
        return event;
    }
    // 工厂方法 - 创建系统性能事件
    static createSystemPerformanceEvent(operation, duration, success, metadata) {
        const eventId = AnalyticsEventId.generate();
        const session = UserSession.createSystemSession();
        const timestamp = EventTimestamp.now();
        const eventContext = EventContext.create(metadata || {});
        const data = EventData.createPerformanceEvent(operation, duration, success);
        const event = new AnalyticsEvent(eventId, session, data, timestamp, eventContext, EventStatus.PENDING_PROCESSING, new Date());
        event.addEvent(new SystemPerformanceEventCreatedEvent(eventId.getValue(), operation, duration, success, new Date()));
        return event;
    }
    // 工厂方法 - 创建业务指标事件
    static createBusinessMetricEvent(metricName, metricValue, metricUnit, dimensions) {
        const eventId = AnalyticsEventId.generate();
        const session = UserSession.createSystemSession();
        const timestamp = EventTimestamp.now();
        const eventContext = EventContext.create({ dimensions: dimensions || {} });
        const data = EventData.createMetricEvent(metricName, metricValue, metricUnit);
        const event = new AnalyticsEvent(eventId, session, data, timestamp, eventContext, EventStatus.PENDING_PROCESSING, new Date());
        event.addEvent(new BusinessMetricEventCreatedEvent(eventId.getValue(), metricName, metricValue, metricUnit, dimensions || {}, new Date()));
        return event;
    }
    // 工厂方法 - 从持久化数据恢复
    static restore(data) {
        return new AnalyticsEvent(new AnalyticsEventId({ value: data.id }), UserSession.restore(data.session), EventData.restore(data.eventData), EventTimestamp.restore(data.timestamp), EventContext.restore(data.context), data.status, new Date(data.createdAt), data.processedAt ? new Date(data.processedAt) : undefined, data.retentionExpiry ? new Date(data.retentionExpiry) : undefined);
    }
    // 核心业务方法 - 验证事件数据
    validateEvent() {
        const validationErrors = [];
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
            this.addEvent(new AnalyticsEventValidatedEvent(this.id.getValue(), this.session.getSessionId(), this.eventData.getEventType(), new Date()));
        }
        else {
            this.addEvent(new AnalyticsEventValidationFailedEvent(this.id.getValue(), this.session.getSessionId(), validationErrors, new Date()));
        }
        return result;
    }
    // 处理事件数据
    processEvent() {
        if (this.status !== EventStatus.PENDING_PROCESSING) {
            throw new Error(`Cannot process event in ${this.status} status`);
        }
        this.status = EventStatus.PROCESSED;
        this.processedAt = new Date();
        // 设置数据保留期限
        this.retentionExpiry = this.calculateRetentionExpiry();
        this.addEvent(new AnalyticsEventProcessedEvent(this.id.getValue(), this.session.getSessionId(), this.eventData.getEventType(), new Date()));
    }
    // 匿名化处理敏感数据
    anonymizeData() {
        if (this.status === EventStatus.ANONYMIZED) {
            throw new Error('Event data is already anonymized');
        }
        // 执行数据匿名化
        this.session.anonymize();
        this.eventData.anonymize();
        this.context.anonymize();
        this.status = EventStatus.ANONYMIZED;
        this.addEvent(new AnalyticsEventAnonymizedEvent(this.id.getValue(), new Date()));
    }
    // 标记为已过期，准备删除
    markAsExpired() {
        if (this.status === EventStatus.EXPIRED) {
            return;
        }
        this.status = EventStatus.EXPIRED;
        this.addEvent(new AnalyticsEventExpiredEvent(this.id.getValue(), this.session.getSessionId(), new Date()));
    }
    // 隐私合规性验证
    validatePrivacyCompliance() {
        const errors = [];
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
    calculateRetentionExpiry() {
        const retentionDays = this.getRetentionPeriodDays();
        const expiry = new Date(this.createdAt);
        expiry.setDate(expiry.getDate() + retentionDays);
        return expiry;
    }
    // 获取保留期限天数
    getRetentionPeriodDays() {
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
    isRetentionPeriodExceeded() {
        if (!this.retentionExpiry) {
            return false;
        }
        return new Date() > this.retentionExpiry;
    }
    // 查询方法
    getEventSummary() {
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
    getUncommittedEvents() {
        return [...this.uncommittedEvents];
    }
    markEventsAsCommitted() {
        this.uncommittedEvents = [];
    }
    addEvent(event) {
        this.uncommittedEvents.push(event);
    }
    // Getters
    getId() {
        return this.id;
    }
    getStatus() {
        return this.status;
    }
    getSessionId() {
        return this.session.getSessionId();
    }
    getUserId() {
        return this.session.getUserId();
    }
    getEventType() {
        return this.eventData.getEventType();
    }
    getTimestamp() {
        return this.timestamp.toISOString();
    }
    getCreatedAt() {
        return this.createdAt;
    }
    getRetentionExpiry() {
        return this.retentionExpiry;
    }
}
exports.AnalyticsEvent = AnalyticsEvent;
// 值对象定义
class AnalyticsEventId extends value_object_1.ValueObject {
    static generate() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return new AnalyticsEventId({ value: `analytics_${timestamp}_${random}` });
    }
    getValue() {
        return this.props.value;
    }
}
exports.AnalyticsEventId = AnalyticsEventId;
class UserSession extends value_object_1.ValueObject {
    static create(sessionId, userId, deviceInfo, geoLocation) {
        return new UserSession({
            sessionId,
            userId,
            deviceInfo,
            geoLocation,
            consentStatus: ConsentStatus.GRANTED,
            isSystemSession: false
        });
    }
    static createSystemSession() {
        return new UserSession({
            sessionId: `system_${Date.now()}`,
            consentStatus: ConsentStatus.NOT_APPLICABLE,
            isSystemSession: true
        });
    }
    static restore(data) {
        return new UserSession({
            sessionId: data.sessionId,
            userId: data.userId,
            deviceInfo: data.deviceInfo ? DeviceInfo.restore(data.deviceInfo) : undefined,
            geoLocation: data.geoLocation ? GeoLocation.restore(data.geoLocation) : undefined,
            consentStatus: data.consentStatus,
            isSystemSession: data.isSystemSession
        });
    }
    getSessionId() {
        return this.props.sessionId;
    }
    getUserId() {
        return this.props.userId;
    }
    hasValidConsent() {
        return this.props.consentStatus === ConsentStatus.GRANTED ||
            this.props.consentStatus === ConsentStatus.NOT_APPLICABLE;
    }
    isValid() {
        const errors = this.getValidationErrors();
        return errors.length === 0;
    }
    getValidationErrors() {
        const errors = [];
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
    anonymize() {
        // 匿名化用户标识信息
        const newProps = { ...this.props };
        newProps.userId = undefined;
        newProps.deviceInfo = undefined;
        newProps.geoLocation = undefined;
        Object.defineProperty(this, 'props', { value: newProps, writable: false });
    }
}
exports.UserSession = UserSession;
class DeviceInfo extends value_object_1.ValueObject {
    static restore(data) {
        return new DeviceInfo(data);
    }
    isValid() {
        return !!(this.props.userAgent && this.props.language);
    }
}
exports.DeviceInfo = DeviceInfo;
class GeoLocation extends value_object_1.ValueObject {
    static restore(data) {
        return new GeoLocation(data);
    }
    isValid() {
        return !!(this.props.country && this.props.region);
    }
}
exports.GeoLocation = GeoLocation;
class EventData extends value_object_1.ValueObject {
    static create(eventType, payload) {
        return new EventData({
            eventType,
            eventCategory: EventData.categorizeEvent(eventType),
            payload,
            sensitiveDataMask: []
        });
    }
    static createPerformanceEvent(operation, duration, success) {
        return new EventData({
            eventType: EventType.SYSTEM_PERFORMANCE,
            eventCategory: EventCategory.SYSTEM,
            payload: { operation, duration, success },
            sensitiveDataMask: []
        });
    }
    static createMetricEvent(metricName, metricValue, metricUnit) {
        return new EventData({
            eventType: EventType.BUSINESS_METRIC,
            eventCategory: EventCategory.BUSINESS,
            payload: { metricName, metricValue, metricUnit },
            sensitiveDataMask: []
        });
    }
    static restore(data) {
        return new EventData(data);
    }
    static categorizeEvent(eventType) {
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
    getEventType() {
        return this.props.eventType;
    }
    getEventCategory() {
        return this.props.eventCategory;
    }
    containsSensitiveData() {
        // 检查是否包含敏感数据的逻辑
        const sensitiveKeys = ['email', 'phone', 'address', 'ssn', 'creditCard'];
        const payloadStr = JSON.stringify(this.props.payload).toLowerCase();
        return sensitiveKeys.some(key => payloadStr.includes(key));
    }
    isValid() {
        const errors = this.getValidationErrors();
        return errors.length === 0;
    }
    getValidationErrors() {
        const errors = [];
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
    anonymize() {
        // 匿名化敏感数据
        if (this.containsSensitiveData()) {
            const newProps = { ...this.props };
            newProps.payload = { ...this.props.payload, _anonymized: true };
            Object.defineProperty(this, 'props', { value: newProps, writable: false });
        }
    }
}
exports.EventData = EventData;
class EventTimestamp extends value_object_1.ValueObject {
    static now(timezone) {
        return new EventTimestamp({
            timestamp: new Date(),
            timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    }
    static restore(data) {
        return new EventTimestamp({
            timestamp: new Date(data.timestamp),
            timezone: data.timezone
        });
    }
    toISOString() {
        return this.props.timestamp.toISOString();
    }
    isValid() {
        const errors = this.getValidationErrors();
        return errors.length === 0;
    }
    getValidationErrors() {
        const errors = [];
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
exports.EventTimestamp = EventTimestamp;
class EventContext extends value_object_1.ValueObject {
    static create(context) {
        return new EventContext({
            requestId: context.requestId,
            userAgent: context.userAgent,
            referrer: context.referrer,
            pageUrl: context.pageUrl,
            dimensions: context.dimensions || {},
            metadata: context.metadata || {}
        });
    }
    static restore(data) {
        return new EventContext(data);
    }
    isValid() {
        const errors = this.getValidationErrors();
        return errors.length === 0;
    }
    getValidationErrors() {
        const errors = [];
        if (typeof this.props.dimensions !== 'object') {
            errors.push('Dimensions must be an object');
        }
        if (typeof this.props.metadata !== 'object') {
            errors.push('Metadata must be an object');
        }
        return errors;
    }
    anonymize() {
        // 匿名化上下文中的敏感信息
        const newProps = { ...this.props };
        newProps.userAgent = undefined;
        newProps.referrer = undefined;
        Object.defineProperty(this, 'props', { value: newProps, writable: false });
    }
}
exports.EventContext = EventContext;
// 结果类
class EventValidationResult {
    constructor(isValid, errors) {
        this.isValid = isValid;
        this.errors = errors;
    }
}
exports.EventValidationResult = EventValidationResult;
class PrivacyComplianceResult {
    constructor(isCompliant, errors) {
        this.isCompliant = isCompliant;
        this.errors = errors;
    }
}
exports.PrivacyComplianceResult = PrivacyComplianceResult;
class AnalyticsEventSummary extends value_object_1.ValueObject {
    get id() { return this.props.id; }
    get sessionId() { return this.props.sessionId; }
    get userId() { return this.props.userId; }
    get eventType() { return this.props.eventType; }
    get status() { return this.props.status; }
    get isAnonymized() { return this.props.isAnonymized; }
    get daysSinceCreation() { return this.props.daysSinceCreation; }
}
exports.AnalyticsEventSummary = AnalyticsEventSummary;
// 枚举定义
var EventType;
(function (EventType) {
    EventType["USER_INTERACTION"] = "user_interaction";
    EventType["PAGE_VIEW"] = "page_view";
    EventType["FORM_SUBMISSION"] = "form_submission";
    EventType["SYSTEM_PERFORMANCE"] = "system_performance";
    EventType["ERROR_EVENT"] = "error_event";
    EventType["API_CALL"] = "api_call";
    EventType["BUSINESS_METRIC"] = "business_metric";
    EventType["CONVERSION_EVENT"] = "conversion_event";
})(EventType || (exports.EventType = EventType = {}));
var EventCategory;
(function (EventCategory) {
    EventCategory["USER_BEHAVIOR"] = "user_behavior";
    EventCategory["SYSTEM"] = "system";
    EventCategory["BUSINESS"] = "business";
    EventCategory["OTHER"] = "other";
})(EventCategory || (exports.EventCategory = EventCategory = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["PENDING_PROCESSING"] = "pending_processing";
    EventStatus["PROCESSED"] = "processed";
    EventStatus["ANONYMIZED"] = "anonymized";
    EventStatus["EXPIRED"] = "expired";
    EventStatus["ERROR"] = "error";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
var ConsentStatus;
(function (ConsentStatus) {
    ConsentStatus["GRANTED"] = "granted";
    ConsentStatus["DENIED"] = "denied";
    ConsentStatus["PENDING"] = "pending";
    ConsentStatus["NOT_APPLICABLE"] = "not_applicable";
})(ConsentStatus || (exports.ConsentStatus = ConsentStatus = {}));
var MetricUnit;
(function (MetricUnit) {
    MetricUnit["COUNT"] = "count";
    MetricUnit["PERCENTAGE"] = "percentage";
    MetricUnit["DURATION_MS"] = "duration_ms";
    MetricUnit["BYTES"] = "bytes";
    MetricUnit["CURRENCY"] = "currency";
})(MetricUnit || (exports.MetricUnit = MetricUnit = {}));
// 领域事件
class AnalyticsEventCreatedEvent {
    constructor(eventId, sessionId, userId, eventType, timestamp, occurredAt) {
        this.eventId = eventId;
        this.sessionId = sessionId;
        this.userId = userId;
        this.eventType = eventType;
        this.timestamp = timestamp;
        this.occurredAt = occurredAt;
    }
}
exports.AnalyticsEventCreatedEvent = AnalyticsEventCreatedEvent;
class SystemPerformanceEventCreatedEvent {
    constructor(eventId, operation, duration, success, occurredAt) {
        this.eventId = eventId;
        this.operation = operation;
        this.duration = duration;
        this.success = success;
        this.occurredAt = occurredAt;
    }
}
exports.SystemPerformanceEventCreatedEvent = SystemPerformanceEventCreatedEvent;
class BusinessMetricEventCreatedEvent {
    constructor(eventId, metricName, metricValue, metricUnit, dimensions, occurredAt) {
        this.eventId = eventId;
        this.metricName = metricName;
        this.metricValue = metricValue;
        this.metricUnit = metricUnit;
        this.dimensions = dimensions;
        this.occurredAt = occurredAt;
    }
}
exports.BusinessMetricEventCreatedEvent = BusinessMetricEventCreatedEvent;
class AnalyticsEventValidatedEvent {
    constructor(eventId, sessionId, eventType, occurredAt) {
        this.eventId = eventId;
        this.sessionId = sessionId;
        this.eventType = eventType;
        this.occurredAt = occurredAt;
    }
}
exports.AnalyticsEventValidatedEvent = AnalyticsEventValidatedEvent;
class AnalyticsEventValidationFailedEvent {
    constructor(eventId, sessionId, errors, occurredAt) {
        this.eventId = eventId;
        this.sessionId = sessionId;
        this.errors = errors;
        this.occurredAt = occurredAt;
    }
}
exports.AnalyticsEventValidationFailedEvent = AnalyticsEventValidationFailedEvent;
class AnalyticsEventProcessedEvent {
    constructor(eventId, sessionId, eventType, occurredAt) {
        this.eventId = eventId;
        this.sessionId = sessionId;
        this.eventType = eventType;
        this.occurredAt = occurredAt;
    }
}
exports.AnalyticsEventProcessedEvent = AnalyticsEventProcessedEvent;
class AnalyticsEventAnonymizedEvent {
    constructor(eventId, occurredAt) {
        this.eventId = eventId;
        this.occurredAt = occurredAt;
    }
}
exports.AnalyticsEventAnonymizedEvent = AnalyticsEventAnonymizedEvent;
class AnalyticsEventExpiredEvent {
    constructor(eventId, sessionId, occurredAt) {
        this.eventId = eventId;
        this.sessionId = sessionId;
        this.occurredAt = occurredAt;
    }
}
exports.AnalyticsEventExpiredEvent = AnalyticsEventExpiredEvent;
