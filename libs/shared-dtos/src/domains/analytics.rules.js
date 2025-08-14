"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataScope = exports.ReportType = exports.ReportingPermissionsResult = exports.AnonymizationRequirementResult = exports.PrivacyComplianceRiskAssessment = exports.AnalyticsDataRetentionPolicy = exports.BatchProcessingEligibilityResult = exports.EventPriority = exports.EventDataValidationResult = exports.EventCreationEligibilityResult = exports.AnalyticsRules = void 0;
const analytics_dto_1 = require("./analytics.dto");
class AnalyticsRules {
    /**
     * 验证事件创建的资格条件
     */
    static canCreateEvent(sessionId, eventType, eventData, consentStatus, existingEventsInSession) {
        const errors = [];
        // 验证会话ID
        if (!sessionId || sessionId.trim().length === 0) {
            errors.push('Valid session ID is required');
        }
        // 验证事件类型
        if (!Object.values(analytics_dto_1.EventType).includes(eventType)) {
            errors.push('Invalid event type');
        }
        // 验证用户同意状态
        if (!this.isConsentValid(consentStatus, eventType)) {
            errors.push('Valid user consent is required for this event type');
        }
        // 验证会话事件数量限制
        const sessionEvents = existingEventsInSession || 0;
        if (sessionEvents >= this.MAX_EVENTS_PER_SESSION) {
            errors.push(`Session event limit exceeded (${this.MAX_EVENTS_PER_SESSION} events max)`);
        }
        // 验证事件数据大小
        const eventSizeBytes = JSON.stringify(eventData).length;
        if (eventSizeBytes > this.MAX_EVENT_SIZE_BYTES) {
            errors.push(`Event size exceeds limit (${eventSizeBytes} > ${this.MAX_EVENT_SIZE_BYTES} bytes)`);
        }
        // 验证事件数据完整性
        const dataValidation = this.validateEventDataStructure(eventType, eventData);
        if (!dataValidation.isValid) {
            errors.push(...dataValidation.errors);
        }
        return new EventCreationEligibilityResult(errors.length === 0, errors, this.calculateEventPriority(eventType));
    }
    /**
     * 验证用户同意状态是否有效
     */
    static isConsentValid(consentStatus, eventType) {
        // 系统事件不需要用户同意
        if (this.isSystemEventType(eventType)) {
            return consentStatus === analytics_dto_1.ConsentStatus.NOT_APPLICABLE;
        }
        // 用户相关事件需要有效同意
        return consentStatus === analytics_dto_1.ConsentStatus.GRANTED;
    }
    /**
     * 判断是否为系统事件类型
     */
    static isSystemEventType(eventType) {
        const systemEventTypes = [
            analytics_dto_1.EventType.SYSTEM_PERFORMANCE,
            analytics_dto_1.EventType.ERROR_EVENT,
            analytics_dto_1.EventType.API_CALL
        ];
        return systemEventTypes.includes(eventType);
    }
    /**
     * 验证事件数据结构
     */
    static validateEventDataStructure(eventType, eventData) {
        const errors = [];
        if (!eventData) {
            errors.push('Event data is required');
            return new EventDataValidationResult(false, errors);
        }
        switch (eventType) {
            case analytics_dto_1.EventType.USER_INTERACTION:
                if (!eventData.action) {
                    errors.push('User interaction event requires action field');
                }
                if (!eventData.target) {
                    errors.push('User interaction event requires target field');
                }
                break;
            case analytics_dto_1.EventType.PAGE_VIEW:
                if (!eventData.pageUrl) {
                    errors.push('Page view event requires pageUrl field');
                }
                if (!eventData.pageTitle) {
                    errors.push('Page view event requires pageTitle field');
                }
                break;
            case analytics_dto_1.EventType.FORM_SUBMISSION:
                if (!eventData.formId) {
                    errors.push('Form submission event requires formId field');
                }
                if (!eventData.fields || !Array.isArray(eventData.fields)) {
                    errors.push('Form submission event requires fields array');
                }
                break;
            case analytics_dto_1.EventType.SYSTEM_PERFORMANCE:
                if (!eventData.operation) {
                    errors.push('Performance event requires operation field');
                }
                if (typeof eventData.duration !== 'number') {
                    errors.push('Performance event requires numeric duration field');
                }
                if (typeof eventData.success !== 'boolean') {
                    errors.push('Performance event requires boolean success field');
                }
                break;
            case analytics_dto_1.EventType.ERROR_EVENT:
                if (!eventData.errorMessage) {
                    errors.push('Error event requires errorMessage field');
                }
                if (!eventData.errorCode) {
                    errors.push('Error event requires errorCode field');
                }
                break;
            case analytics_dto_1.EventType.BUSINESS_METRIC:
                if (!eventData.metricName) {
                    errors.push('Business metric event requires metricName field');
                }
                if (typeof eventData.metricValue !== 'number') {
                    errors.push('Business metric event requires numeric metricValue field');
                }
                if (!Object.values(analytics_dto_1.MetricUnit).includes(eventData.metricUnit)) {
                    errors.push('Business metric event requires valid metricUnit');
                }
                break;
            case analytics_dto_1.EventType.API_CALL:
                if (!eventData.endpoint) {
                    errors.push('API call event requires endpoint field');
                }
                if (!eventData.method) {
                    errors.push('API call event requires method field');
                }
                if (typeof eventData.statusCode !== 'number') {
                    errors.push('API call event requires numeric statusCode field');
                }
                break;
        }
        return new EventDataValidationResult(errors.length === 0, errors);
    }
    /**
     * 计算事件处理优先级
     */
    static calculateEventPriority(eventType) {
        let priority = 0;
        const factors = [];
        // 事件类型优先级
        switch (eventType) {
            case analytics_dto_1.EventType.ERROR_EVENT:
                priority += 90;
                factors.push('Critical error event');
                break;
            case analytics_dto_1.EventType.SYSTEM_PERFORMANCE:
                priority += 80;
                factors.push('System performance monitoring');
                break;
            case analytics_dto_1.EventType.BUSINESS_METRIC:
                priority += 70;
                factors.push('Business metric tracking');
                break;
            case analytics_dto_1.EventType.USER_INTERACTION:
                priority += 50;
                factors.push('User interaction tracking');
                break;
            case analytics_dto_1.EventType.API_CALL:
                priority += 40;
                factors.push('API call monitoring');
                break;
            case analytics_dto_1.EventType.PAGE_VIEW:
                priority += 30;
                factors.push('Page view tracking');
                break;
            case analytics_dto_1.EventType.FORM_SUBMISSION:
                priority += 60;
                factors.push('Form submission tracking');
                break;
            case analytics_dto_1.EventType.CONVERSION_EVENT:
                priority += 85;
                factors.push('Conversion event tracking');
                break;
        }
        return new EventPriority(Math.min(100, priority), this.getPriorityLevel(priority), factors);
    }
    /**
     * 验证事件是否可以进行批量处理
     */
    static canBatchProcessEvents(events) {
        const errors = [];
        const warnings = [];
        if (events.length === 0) {
            errors.push('No events provided for batch processing');
            return new BatchProcessingEligibilityResult(false, errors, warnings, 0);
        }
        if (events.length > this.EVENT_PROCESSING_BATCH_SIZE) {
            errors.push(`Batch size exceeds limit (${events.length} > ${this.EVENT_PROCESSING_BATCH_SIZE})`);
        }
        // 验证事件状态
        const invalidStatusEvents = events.filter(event => event.getStatus() !== analytics_dto_1.EventStatus.PENDING_PROCESSING);
        if (invalidStatusEvents.length > 0) {
            warnings.push(`${invalidStatusEvents.length} events are not in pending status`);
        }
        // 检查事件时间分布
        const eventTimes = events.map(event => new Date(event.getTimestamp()).getTime());
        const timeSpan = Math.max(...eventTimes) - Math.min(...eventTimes);
        const maxTimeSpanMs = 60 * 60 * 1000; // 1小时
        if (timeSpan > maxTimeSpanMs) {
            warnings.push('Events span more than 1 hour, consider splitting batch');
        }
        const eligibleCount = events.filter(event => event.getStatus() === analytics_dto_1.EventStatus.PENDING_PROCESSING).length;
        return new BatchProcessingEligibilityResult(errors.length === 0, errors, warnings, eligibleCount);
    }
    /**
     * 生成数据保留策略建议
     */
    static generateRetentionPolicy(event) {
        const eventType = event.getEventType();
        const createdAt = event.getCreatedAt();
        const retentionDays = this.getRetentionPeriodDays(eventType);
        const retentionExpiry = new Date(createdAt);
        retentionExpiry.setDate(retentionExpiry.getDate() + retentionDays);
        const anonymizationThreshold = new Date(createdAt);
        anonymizationThreshold.setDate(anonymizationThreshold.getDate() + this.ANONYMIZATION_THRESHOLD_DAYS);
        const daysUntilExpiry = Math.ceil((retentionExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const daysUntilAnonymization = Math.ceil((anonymizationThreshold.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return new AnalyticsDataRetentionPolicy(event.getId().getValue(), retentionExpiry, anonymizationThreshold, daysUntilExpiry, daysUntilAnonymization, this.getRetentionActions(daysUntilExpiry, daysUntilAnonymization));
    }
    /**
     * 评估隐私合规风险
     */
    static assessPrivacyComplianceRisk(event, userSession) {
        let riskScore = 0;
        const riskFactors = [];
        // 检查用户同意状态
        if (!userSession.hasValidConsent()) {
            riskScore += 40;
            riskFactors.push('Missing or expired user consent');
        }
        // 检查数据保留期限
        const retentionExpiry = event.getRetentionExpiry();
        if (retentionExpiry && Date.now() > retentionExpiry.getTime()) {
            riskScore += 50;
            riskFactors.push('Data retention period exceeded');
        }
        // 检查是否包含敏感数据
        const daysSinceCreation = Math.floor((Date.now() - event.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceCreation > this.ANONYMIZATION_THRESHOLD_DAYS &&
            event.getStatus() !== analytics_dto_1.EventStatus.ANONYMIZED) {
            riskScore += 30;
            riskFactors.push('Data should be anonymized based on age');
        }
        // 检查地理位置合规性
        if (event.getEventType() === analytics_dto_1.EventType.USER_INTERACTION) {
            riskScore += 10;
            riskFactors.push('User interaction data requires careful handling');
        }
        return new PrivacyComplianceRiskAssessment(event.getId().getValue(), event.getSessionId(), Math.min(100, riskScore), this.getRiskLevel(riskScore), riskFactors, this.getPrivacyComplianceActions(riskScore));
    }
    /**
     * 验证数据匿名化要求
     */
    static validateAnonymizationRequirement(event) {
        const daysSinceCreation = Math.floor((Date.now() - event.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24));
        const isRequired = daysSinceCreation >= this.ANONYMIZATION_THRESHOLD_DAYS;
        const isOverdue = daysSinceCreation > this.ANONYMIZATION_THRESHOLD_DAYS + 30; // 30天宽限期
        let urgency;
        if (isOverdue) {
            urgency = 'CRITICAL';
        }
        else if (isRequired) {
            urgency = 'HIGH';
        }
        else if (daysSinceCreation > this.ANONYMIZATION_THRESHOLD_DAYS - 30) {
            urgency = 'MEDIUM';
        }
        else {
            urgency = 'LOW';
        }
        return new AnonymizationRequirementResult(isRequired, isOverdue, urgency, daysSinceCreation, this.ANONYMIZATION_THRESHOLD_DAYS);
    }
    /**
     * 计算分析报告权限
     */
    static calculateReportingPermissions(userRole, reportType, dataScope) {
        const permissions = [];
        const restrictions = [];
        // 基于角色的权限
        switch (userRole.toLowerCase()) {
            case 'admin':
            case 'administrator':
                permissions.push('full_access', 'export_data', 'view_personal_data');
                break;
            case 'analyst':
            case 'data_analyst':
                permissions.push('view_aggregated_data', 'create_reports');
                if (dataScope === DataScope.ANONYMIZED_ONLY) {
                    permissions.push('export_anonymized_data');
                }
                restrictions.push('cannot_view_raw_personal_data');
                break;
            case 'viewer':
            case 'readonly':
                permissions.push('view_reports');
                restrictions.push('cannot_export_data', 'cannot_view_personal_data');
                break;
            default:
                restrictions.push('no_access_permissions');
        }
        // 基于报告类型的权限
        if (reportType === ReportType.USER_BEHAVIOR && !permissions.includes('view_personal_data')) {
            restrictions.push('user_behavior_requires_elevated_permissions');
        }
        return new ReportingPermissionsResult(permissions.length > 0 && !permissions.includes('no_access_permissions'), permissions, restrictions);
    }
    // 私有辅助方法
    static getRetentionPeriodDays(eventType) {
        switch (eventType) {
            case analytics_dto_1.EventType.USER_INTERACTION:
            case analytics_dto_1.EventType.PAGE_VIEW:
            case analytics_dto_1.EventType.FORM_SUBMISSION:
                return this.USER_DATA_RETENTION_DAYS;
            case analytics_dto_1.EventType.SYSTEM_PERFORMANCE:
            case analytics_dto_1.EventType.API_CALL:
                return this.SYSTEM_DATA_RETENTION_DAYS;
            case analytics_dto_1.EventType.BUSINESS_METRIC:
            case analytics_dto_1.EventType.CONVERSION_EVENT:
                return this.BUSINESS_DATA_RETENTION_DAYS;
            case analytics_dto_1.EventType.ERROR_EVENT:
                return this.ERROR_DATA_RETENTION_DAYS;
            default:
                return this.USER_DATA_RETENTION_DAYS;
        }
    }
    static getPriorityLevel(score) {
        if (score >= 85)
            return 'CRITICAL';
        if (score >= 70)
            return 'HIGH';
        if (score >= 50)
            return 'MEDIUM';
        return 'LOW';
    }
    static getRiskLevel(score) {
        if (score >= 75)
            return 'CRITICAL';
        if (score >= 50)
            return 'HIGH';
        if (score >= 25)
            return 'MEDIUM';
        return 'LOW';
    }
    static getRetentionActions(daysUntilExpiry, daysUntilAnonymization) {
        const actions = [];
        if (daysUntilExpiry <= 0) {
            actions.push('DELETE_IMMEDIATELY');
        }
        else if (daysUntilExpiry <= 7) {
            actions.push('SCHEDULE_DELETION');
        }
        if (daysUntilAnonymization <= 0) {
            actions.push('ANONYMIZE_IMMEDIATELY');
        }
        else if (daysUntilAnonymization <= 30) {
            actions.push('SCHEDULE_ANONYMIZATION');
        }
        if (actions.length === 0) {
            actions.push('CONTINUE_NORMAL_RETENTION');
        }
        return actions;
    }
    static getPrivacyComplianceActions(riskScore) {
        const actions = [];
        if (riskScore >= 75) {
            actions.push('IMMEDIATE_REVIEW_REQUIRED');
            actions.push('CONSIDER_DATA_DELETION');
            actions.push('LEGAL_CONSULTATION');
        }
        else if (riskScore >= 50) {
            actions.push('ENHANCED_MONITORING');
            actions.push('REVIEW_CONSENT_STATUS');
        }
        else if (riskScore >= 25) {
            actions.push('ROUTINE_MONITORING');
            actions.push('SCHEDULE_COMPLIANCE_CHECK');
        }
        else {
            actions.push('STANDARD_PROCESSING');
        }
        return actions;
    }
}
exports.AnalyticsRules = AnalyticsRules;
// 核心业务规则常量 - 数据分析系统
AnalyticsRules.MAX_EVENTS_PER_SESSION = 1000; // 单会话最大事件数
AnalyticsRules.MAX_SESSION_DURATION_HOURS = 24; // 最大会话时长（小时）
AnalyticsRules.EVENT_PROCESSING_BATCH_SIZE = 100; // 事件处理批次大小
AnalyticsRules.MIN_EVENT_INTERVAL_MS = 100; // 最小事件间隔（毫秒）
// 数据保留期限常量
AnalyticsRules.USER_DATA_RETENTION_DAYS = 730; // 用户数据保留期（2年）
AnalyticsRules.SYSTEM_DATA_RETENTION_DAYS = 90; // 系统数据保留期（3个月）
AnalyticsRules.BUSINESS_DATA_RETENTION_DAYS = 1095; // 业务数据保留期（3年）
AnalyticsRules.ERROR_DATA_RETENTION_DAYS = 365; // 错误数据保留期（1年）
// 隐私合规常量
AnalyticsRules.ANONYMIZATION_THRESHOLD_DAYS = 365; // 自动匿名化阈值（1年）
AnalyticsRules.CONSENT_EXPIRY_DAYS = 730; // 用户同意过期时间（2年）
AnalyticsRules.MAX_PERSONAL_DATA_STORAGE_DAYS = 1095; // 个人数据最大存储时间（3年）
// 性能监控常量  
AnalyticsRules.MAX_EVENT_SIZE_BYTES = 50 * 1024; // 最大事件大小（50KB）
AnalyticsRules.CRITICAL_PERFORMANCE_THRESHOLD_MS = 5000; // 关键性能阈值（5秒）
AnalyticsRules.HIGH_VOLUME_THRESHOLD_EVENTS_PER_MINUTE = 600; // 高流量阈值（每分钟600事件）
// 结果类定义
class EventCreationEligibilityResult {
    constructor(isEligible, errors, priority) {
        this.isEligible = isEligible;
        this.errors = errors;
        this.priority = priority;
    }
}
exports.EventCreationEligibilityResult = EventCreationEligibilityResult;
class EventDataValidationResult {
    constructor(isValid, errors) {
        this.isValid = isValid;
        this.errors = errors;
    }
}
exports.EventDataValidationResult = EventDataValidationResult;
class EventPriority {
    constructor(score, level, factors) {
        this.score = score;
        this.level = level;
        this.factors = factors;
    }
}
exports.EventPriority = EventPriority;
class BatchProcessingEligibilityResult {
    constructor(isEligible, errors, warnings, eligibleEventCount) {
        this.isEligible = isEligible;
        this.errors = errors;
        this.warnings = warnings;
        this.eligibleEventCount = eligibleEventCount;
    }
}
exports.BatchProcessingEligibilityResult = BatchProcessingEligibilityResult;
class AnalyticsDataRetentionPolicy {
    constructor(eventId, retentionExpiry, anonymizationThreshold, daysUntilExpiry, daysUntilAnonymization, recommendedActions) {
        this.eventId = eventId;
        this.retentionExpiry = retentionExpiry;
        this.anonymizationThreshold = anonymizationThreshold;
        this.daysUntilExpiry = daysUntilExpiry;
        this.daysUntilAnonymization = daysUntilAnonymization;
        this.recommendedActions = recommendedActions;
    }
}
exports.AnalyticsDataRetentionPolicy = AnalyticsDataRetentionPolicy;
class PrivacyComplianceRiskAssessment {
    constructor(eventId, sessionId, riskScore, riskLevel, riskFactors, recommendedActions) {
        this.eventId = eventId;
        this.sessionId = sessionId;
        this.riskScore = riskScore;
        this.riskLevel = riskLevel;
        this.riskFactors = riskFactors;
        this.recommendedActions = recommendedActions;
    }
}
exports.PrivacyComplianceRiskAssessment = PrivacyComplianceRiskAssessment;
class AnonymizationRequirementResult {
    constructor(isRequired, isOverdue, urgency, daysSinceCreation, anonymizationThresholdDays) {
        this.isRequired = isRequired;
        this.isOverdue = isOverdue;
        this.urgency = urgency;
        this.daysSinceCreation = daysSinceCreation;
        this.anonymizationThresholdDays = anonymizationThresholdDays;
    }
}
exports.AnonymizationRequirementResult = AnonymizationRequirementResult;
class ReportingPermissionsResult {
    constructor(hasAccess, permissions, restrictions) {
        this.hasAccess = hasAccess;
        this.permissions = permissions;
        this.restrictions = restrictions;
    }
}
exports.ReportingPermissionsResult = ReportingPermissionsResult;
// 枚举定义
var ReportType;
(function (ReportType) {
    ReportType["USER_BEHAVIOR"] = "user_behavior";
    ReportType["SYSTEM_PERFORMANCE"] = "system_performance";
    ReportType["BUSINESS_METRICS"] = "business_metrics";
    ReportType["ERROR_ANALYSIS"] = "error_analysis";
    ReportType["CONVERSION_FUNNEL"] = "conversion_funnel";
})(ReportType || (exports.ReportType = ReportType = {}));
var DataScope;
(function (DataScope) {
    DataScope["FULL_ACCESS"] = "full_access";
    DataScope["ANONYMIZED_ONLY"] = "anonymized_only";
    DataScope["AGGREGATED_ONLY"] = "aggregated_only";
})(DataScope || (exports.DataScope = DataScope = {}));
