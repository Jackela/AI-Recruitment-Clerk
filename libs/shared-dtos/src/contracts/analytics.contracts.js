"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsContractViolation = exports.AnalyticsContracts = void 0;
exports.requireValidEvent = requireValidEvent;
exports.requirePendingEvent = requirePendingEvent;
exports.requirePrivacyCompliance = requirePrivacyCompliance;
exports.monitorAnalyticsPerformance = monitorAnalyticsPerformance;
exports.validateEventDataQuality = validateEventDataQuality;
const analytics_dto_1 = require("../domains/analytics.dto");
const analytics_rules_1 = require("../domains/analytics.rules");
/**
 * 分析系统的契约式编程实现
 * 提供前置条件、后置条件和不变式的验证
 */
class AnalyticsContracts {
    /**
     * 创建用户交互事件的契约验证
     */
    static createUserInteractionEvent(sessionId, userId, eventType, eventData, context) {
        // 前置条件验证
        this.requireValidSessionId(sessionId, 'createUserInteractionEvent');
        this.require(!!(userId && userId.trim().length > 0), 'User ID is required for user interaction event', 'createUserInteractionEvent');
        this.require(Object.values(analytics_dto_1.EventType).includes(eventType), 'Valid event type is required', 'createUserInteractionEvent');
        this.require(eventData !== null && eventData !== undefined, 'Event data is required', 'createUserInteractionEvent');
        this.require(!analytics_rules_1.AnalyticsRules.isSystemEventType(eventType), 'Cannot create system event type with user interaction method', 'createUserInteractionEvent');
        // 执行创建
        const event = analytics_dto_1.AnalyticsEvent.createUserInteractionEvent(sessionId, userId, eventType, eventData, context);
        // 后置条件验证
        this.ensure(event !== null && event !== undefined, 'Event creation must return a valid instance', 'createUserInteractionEvent');
        this.ensure(event.getSessionId() === sessionId, 'Created event must have correct session ID', 'createUserInteractionEvent');
        this.ensure(event.getUserId() === userId, 'Created event must have correct user ID', 'createUserInteractionEvent');
        this.ensure(event.getEventType() === eventType, 'Created event must have correct event type', 'createUserInteractionEvent');
        this.ensure(event.getStatus() === analytics_dto_1.EventStatus.PENDING_PROCESSING, 'New event must be in pending processing status', 'createUserInteractionEvent');
        return event;
    }
    /**
     * 创建系统性能事件的契约验证
     */
    static createSystemPerformanceEvent(operation, duration, success, metadata) {
        // 前置条件验证
        this.require(!!(operation && operation.trim().length > 0), 'Operation name is required for performance event', 'createSystemPerformanceEvent');
        this.require(typeof duration === 'number' && duration >= 0, 'Duration must be a non-negative number', 'createSystemPerformanceEvent');
        this.require(duration <= 300000, // 5分钟上限
        'Duration cannot exceed 5 minutes (300000ms)', 'createSystemPerformanceEvent');
        this.require(typeof success === 'boolean', 'Success flag must be a boolean value', 'createSystemPerformanceEvent');
        // 执行创建
        const event = analytics_dto_1.AnalyticsEvent.createSystemPerformanceEvent(operation, duration, success, metadata);
        // 后置条件验证
        this.ensure(event !== null && event !== undefined, 'Performance event creation must return a valid instance', 'createSystemPerformanceEvent');
        this.ensure(event.getEventType() === analytics_dto_1.EventType.SYSTEM_PERFORMANCE, 'Created event must be a system performance event', 'createSystemPerformanceEvent');
        this.ensure(event.getStatus() === analytics_dto_1.EventStatus.PENDING_PROCESSING, 'New performance event must be in pending processing status', 'createSystemPerformanceEvent');
        this.ensure(event.getUserId() === undefined, 'System performance event should not have user ID', 'createSystemPerformanceEvent');
        return event;
    }
    /**
     * 创建业务指标事件的契约验证
     */
    static createBusinessMetricEvent(metricName, metricValue, metricUnit, dimensions) {
        // 前置条件验证
        this.require(!!(metricName && metricName.trim().length > 0), 'Metric name is required for business metric event', 'createBusinessMetricEvent');
        this.require(typeof metricValue === 'number' && !isNaN(metricValue), 'Metric value must be a valid number', 'createBusinessMetricEvent');
        this.require(Object.values(analytics_dto_1.MetricUnit).includes(metricUnit), 'Valid metric unit is required', 'createBusinessMetricEvent');
        this.require(metricValue >= 0, 'Metric value cannot be negative', 'createBusinessMetricEvent');
        // 验证dimensions格式（如果提供）
        if (dimensions) {
            this.require(typeof dimensions === 'object' && dimensions !== null, 'Dimensions must be an object', 'createBusinessMetricEvent');
            this.require(Object.keys(dimensions).length <= 20, 'Dimensions cannot have more than 20 keys', 'createBusinessMetricEvent');
        }
        // 执行创建
        const event = analytics_dto_1.AnalyticsEvent.createBusinessMetricEvent(metricName, metricValue, metricUnit, dimensions);
        // 后置条件验证
        this.ensure(event !== null && event !== undefined, 'Business metric event creation must return a valid instance', 'createBusinessMetricEvent');
        this.ensure(event.getEventType() === analytics_dto_1.EventType.BUSINESS_METRIC, 'Created event must be a business metric event', 'createBusinessMetricEvent');
        this.ensure(event.getStatus() === analytics_dto_1.EventStatus.PENDING_PROCESSING, 'New business metric event must be in pending processing status', 'createBusinessMetricEvent');
        return event;
    }
    /**
     * 事件验证的契约检查
     */
    static validateEvent(event) {
        // 前置条件验证
        this.require(event !== null && event !== undefined, 'Event is required for validation', 'validateEvent');
        this.require(event.getStatus() !== analytics_dto_1.EventStatus.EXPIRED, 'Cannot validate expired event', 'validateEvent');
        // 验证不变式
        this.validateInvariants(event);
        // 执行验证
        const result = event.validateEvent();
        // 后置条件验证
        this.ensure(result !== null && result !== undefined, 'Validation must return a result', 'validateEvent');
        this.ensure(typeof result.isValid === 'boolean', 'Validation result must have boolean validity flag', 'validateEvent');
        this.ensure(Array.isArray(result.errors), 'Validation result must have errors array', 'validateEvent');
        // 验证逻辑一致性
        if (result.isValid) {
            this.ensure(result.errors.length === 0, 'Valid event must have no errors', 'validateEvent');
        }
        else {
            this.ensure(result.errors.length > 0, 'Invalid event must have at least one error', 'validateEvent');
        }
        return result;
    }
    /**
     * 事件处理的契约检查
     */
    static processEvent(event) {
        // 记录原始状态用于后置条件检查
        const originalStatus = event.getStatus();
        // 前置条件验证
        this.require(event !== null && event !== undefined, 'Event is required for processing', 'processEvent');
        this.require(originalStatus === analytics_dto_1.EventStatus.PENDING_PROCESSING, 'Only pending events can be processed', 'processEvent');
        // 验证事件有效性
        const validationResult = event.validateEvent();
        this.require(validationResult.isValid, `Cannot process invalid event: ${validationResult.errors.join(', ')}`, 'processEvent');
        // 验证不变式
        this.validateInvariants(event);
        // 执行处理
        event.processEvent();
        // 后置条件验证
        this.ensure(event.getStatus() === analytics_dto_1.EventStatus.PROCESSED, 'Processed event must be in processed status', 'processEvent');
        this.ensure(event.getStatus() !== originalStatus, 'Event status must change after processing', 'processEvent');
    }
    /**
     * 数据匿名化的契约检查
     */
    static anonymizeEventData(event) {
        // 记录原始状态
        const originalStatus = event.getStatus();
        // 前置条件验证
        this.require(event !== null && event !== undefined, 'Event is required for anonymization', 'anonymizeEventData');
        this.require(originalStatus !== analytics_dto_1.EventStatus.EXPIRED, 'Cannot anonymize expired event', 'anonymizeEventData');
        this.require(originalStatus !== analytics_dto_1.EventStatus.ANONYMIZED, 'Event is already anonymized', 'anonymizeEventData');
        // 验证匿名化需求
        const anonymizationRequirement = analytics_rules_1.AnalyticsRules.validateAnonymizationRequirement(event);
        this.require(anonymizationRequirement.isRequired, 'Event does not require anonymization yet', 'anonymizeEventData');
        // 验证不变式
        this.validateInvariants(event);
        // 执行匿名化
        event.anonymizeData();
        // 后置条件验证
        this.ensure(event.getStatus() === analytics_dto_1.EventStatus.ANONYMIZED, 'Anonymized event must be in anonymized status', 'anonymizeEventData');
    }
    /**
     * 事件过期标记的契约检查
     */
    static markEventAsExpired(event) {
        // 记录原始状态
        const originalStatus = event.getStatus();
        // 前置条件验证
        this.require(event !== null && event !== undefined, 'Event is required for expiry marking', 'markEventAsExpired');
        this.require(originalStatus !== analytics_dto_1.EventStatus.EXPIRED, 'Event is already marked as expired', 'markEventAsExpired');
        // 验证过期条件
        const retentionExpiry = event.getRetentionExpiry();
        this.require(retentionExpiry !== undefined, 'Event must have retention expiry date to be marked as expired', 'markEventAsExpired');
        this.require(!!(retentionExpiry && Date.now() > retentionExpiry.getTime()), 'Event can only be marked as expired after retention period', 'markEventAsExpired');
        // 验证不变式
        this.validateInvariants(event);
        // 执行过期标记
        event.markAsExpired();
        // 后置条件验证
        this.ensure(event.getStatus() === analytics_dto_1.EventStatus.EXPIRED, 'Expired event must be in expired status', 'markEventAsExpired');
    }
    /**
     * 分析事件系统不变式验证
     */
    static validateInvariants(event) {
        // 基本属性不变式
        this.invariant(event.getId() !== null && event.getId() !== undefined, 'Event must always have a valid ID', 'AnalyticsEvent');
        this.invariant(!!(event.getSessionId() && event.getSessionId().length > 0), 'Event must always have a session ID', 'AnalyticsEvent');
        this.invariant(Object.values(analytics_dto_1.EventType).includes(event.getEventType()), 'Event must always have a valid event type', 'AnalyticsEvent');
        this.invariant(Object.values(analytics_dto_1.EventStatus).includes(event.getStatus()), 'Event must always have a valid status', 'AnalyticsEvent');
        this.invariant(event.getCreatedAt() instanceof Date, 'Event must always have a valid creation date', 'AnalyticsEvent');
        // 时间相关不变式
        const now = new Date();
        this.invariant(event.getCreatedAt() <= now, 'Event creation date must not be in the future', 'AnalyticsEvent');
        // 时间戳有效性
        const timestamp = event.getTimestamp();
        this.invariant(!!(timestamp && typeof timestamp === 'string' && timestamp.length > 0), 'Event must always have a valid timestamp', 'AnalyticsEvent');
        // 用户相关不变式
        const eventType = event.getEventType();
        const userId = event.getUserId();
        if (!analytics_rules_1.AnalyticsRules.isSystemEventType(eventType)) {
            this.invariant(userId !== undefined && userId.length > 0, 'User events must have a valid user ID', 'AnalyticsEvent');
        }
        // 状态转换不变式
        const status = event.getStatus();
        if (status === analytics_dto_1.EventStatus.PROCESSED) {
            // 处理过的事件应该有处理时间戳
            // 这里可以添加更多处理状态的验证
        }
        if (status === analytics_dto_1.EventStatus.ANONYMIZED) {
            // 匿名化的事件应该没有敏感信息
            // 这里可以添加匿名化验证逻辑
        }
        // 保留期限不变式
        const retentionExpiry = event.getRetentionExpiry();
        if (retentionExpiry) {
            this.invariant(retentionExpiry > event.getCreatedAt(), 'Retention expiry must be after creation date', 'AnalyticsEvent');
        }
        // 会话ID格式验证
        const sessionId = event.getSessionId();
        this.invariant(sessionId.length >= 10 && sessionId.length <= 100, 'Session ID must be between 10 and 100 characters', 'AnalyticsEvent');
    }
    /**
     * 批量操作的契约验证
     */
    static validateBatchOperation(items, maxBatchSize, operationName) {
        this.require(Array.isArray(items), `${operationName} requires an array of items`, operationName);
        this.require(items.length > 0, `${operationName} requires at least one item`, operationName);
        this.require(items.length <= maxBatchSize, `${operationName} batch size cannot exceed ${maxBatchSize}`, operationName);
    }
    /**
     * 隐私合规性验证
     */
    static validatePrivacyCompliance(event, userSession) {
        this.require(event !== null && event !== undefined, 'Event is required for privacy compliance validation', 'validatePrivacyCompliance');
        this.require(userSession !== null && userSession !== undefined, 'User session is required for privacy compliance validation', 'validatePrivacyCompliance');
        // 验证用户同意
        const eventType = event.getEventType();
        if (!analytics_rules_1.AnalyticsRules.isSystemEventType(eventType)) {
            this.require(userSession.hasValidConsent(), 'Valid user consent is required for user data collection', 'validatePrivacyCompliance');
        }
        // 验证数据保留期限
        const retentionExpiry = event.getRetentionExpiry();
        if (retentionExpiry) {
            this.require(Date.now() <= retentionExpiry.getTime(), 'Event data retention period has been exceeded', 'validatePrivacyCompliance');
        }
    }
    /**
     * 性能契约验证
     */
    static performanceContract(operation, maxExecutionTimeMs, operationName) {
        const startTime = Date.now();
        try {
            const result = operation();
            const executionTime = Date.now() - startTime;
            this.ensure(executionTime <= maxExecutionTimeMs, `${operationName} exceeded maximum execution time: ${executionTime}ms > ${maxExecutionTimeMs}ms`, operationName);
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            console.warn(`${operationName} failed after ${executionTime}ms:`, error);
            throw error;
        }
    }
    /**
     * 数据质量契约验证
     */
    static validateDataQuality(eventType, eventData) {
        this.require(Object.values(analytics_dto_1.EventType).includes(eventType), 'Valid event type is required for data quality validation', 'validateDataQuality');
        this.require(eventData !== null && eventData !== undefined, 'Event data is required for quality validation', 'validateDataQuality');
        // 验证数据结构
        const dataValidation = analytics_rules_1.AnalyticsRules.validateEventDataStructure(eventType, eventData);
        this.require(dataValidation.isValid, `Data quality validation failed: ${dataValidation.errors.join(', ')}`, 'validateDataQuality');
        // 验证数据大小
        const dataSize = JSON.stringify(eventData).length;
        this.require(dataSize <= analytics_rules_1.AnalyticsRules.MAX_EVENT_SIZE_BYTES, `Event data size exceeds limit: ${dataSize} > ${analytics_rules_1.AnalyticsRules.MAX_EVENT_SIZE_BYTES} bytes`, 'validateDataQuality');
    }
    // 私有辅助方法
    static require(condition, message, operation) {
        if (!condition) {
            throw new AnalyticsContractViolation(`Precondition failed in ${operation}: ${message}`);
        }
    }
    static ensure(condition, message, operation) {
        if (!condition) {
            throw new AnalyticsContractViolation(`Postcondition failed in ${operation}: ${message}`);
        }
    }
    static invariant(condition, message, entity) {
        if (!condition) {
            throw new AnalyticsContractViolation(`Invariant violated in ${entity}: ${message}`);
        }
    }
    static requireValidSessionId(sessionId, operation) {
        this.require(!!(sessionId && typeof sessionId === 'string' && sessionId.trim().length > 0), 'Session ID is required', operation);
        this.require(sessionId.length >= 10 && sessionId.length <= 100, 'Session ID must be between 10 and 100 characters', operation);
    }
}
exports.AnalyticsContracts = AnalyticsContracts;
/**
 * 分析系统契约违反异常
 */
class AnalyticsContractViolation extends Error {
    constructor(message) {
        super(message);
        this.name = 'AnalyticsContractViolation';
    }
}
exports.AnalyticsContractViolation = AnalyticsContractViolation;
/**
 * 分析系统设计契约装饰器
 */
function requireValidEvent(target, propertyName, descriptor) {
    const method = descriptor.value;
    descriptor.value = function (...args) {
        const event = args[0];
        if (!event) {
            throw new AnalyticsContractViolation(`Method ${propertyName} requires a valid analytics event as first argument`);
        }
        AnalyticsContracts.validateInvariants(event);
        return method.apply(this, args);
    };
}
/**
 * 事件处理契约装饰器
 */
function requirePendingEvent(target, propertyName, descriptor) {
    const method = descriptor.value;
    descriptor.value = function (...args) {
        const event = args[0];
        if (!event || event.getStatus() !== analytics_dto_1.EventStatus.PENDING_PROCESSING) {
            throw new AnalyticsContractViolation(`Method ${propertyName} requires a pending analytics event`);
        }
        return method.apply(this, args);
    };
}
/**
 * 隐私合规契约装饰器
 */
function requirePrivacyCompliance(target, propertyName, descriptor) {
    const method = descriptor.value;
    descriptor.value = function (...args) {
        const event = args[0];
        const userSession = args[1];
        if (event && userSession) {
            AnalyticsContracts.validatePrivacyCompliance(event, userSession);
        }
        return method.apply(this, args);
    };
}
/**
 * 性能监控契约装饰器
 */
function monitorAnalyticsPerformance(maxTimeMs) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = function (...args) {
            return AnalyticsContracts.performanceContract(() => method.apply(this, args), maxTimeMs, `${target.constructor.name}.${propertyName}`);
        };
    };
}
/**
 * 数据质量验证装饰器
 */
function validateEventDataQuality(target, propertyName, descriptor) {
    const method = descriptor.value;
    descriptor.value = function (...args) {
        // 假设第一个参数是eventType，第二个是eventData
        if (args.length >= 2) {
            const eventType = args[0];
            const eventData = args[1];
            AnalyticsContracts.validateDataQuality(eventType, eventData);
        }
        return method.apply(this, args);
    };
}
