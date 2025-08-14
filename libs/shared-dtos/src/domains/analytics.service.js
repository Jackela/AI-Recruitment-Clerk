"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingAccessResult = exports.DataPrivacyMetricsResult = exports.EventProcessingMetricsResult = exports.SessionAnalyticsResult = exports.DataRetentionReportResult = exports.PrivacyComplianceResult = exports.BatchProcessingResult = exports.EventCreationResult = exports.AnalyticsDomainService = void 0;
const analytics_dto_1 = require("./analytics.dto");
const analytics_rules_1 = require("./analytics.rules");
class AnalyticsDomainService {
    constructor(repository, eventBus, auditLogger, privacyService, sessionTracker) {
        this.repository = repository;
        this.eventBus = eventBus;
        this.auditLogger = auditLogger;
        this.privacyService = privacyService;
        this.sessionTracker = sessionTracker;
    }
    /**
     * 创建用户交互事件
     */
    async createUserInteractionEvent(sessionId, userId, eventType, eventData, context) {
        try {
            // 获取会话中现有事件数量
            const sessionEventCount = await this.repository.countSessionEvents(sessionId);
            // 获取用户同意状态
            const consentStatus = await this.privacyService.getUserConsentStatus(userId);
            // 验证创建资格
            const eligibility = analytics_rules_1.AnalyticsRules.canCreateEvent(sessionId, eventType, eventData, consentStatus, sessionEventCount);
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
            const event = analytics_dto_1.AnalyticsEvent.createUserInteractionEvent(sessionId, userId, eventType, eventData, context);
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
        }
        catch (error) {
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
    async createSystemPerformanceEvent(operation, duration, success, metadata) {
        try {
            // 创建系统性能事件
            const event = analytics_dto_1.AnalyticsEvent.createSystemPerformanceEvent(operation, duration, success, metadata);
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
            if (duration > analytics_rules_1.AnalyticsRules.CRITICAL_PERFORMANCE_THRESHOLD_MS) {
                await this.auditLogger.logSecurityEvent('PERFORMANCE_THRESHOLD_EXCEEDED', {
                    operation,
                    duration,
                    threshold: analytics_rules_1.AnalyticsRules.CRITICAL_PERFORMANCE_THRESHOLD_MS
                });
            }
            return EventCreationResult.success(event.getEventSummary());
        }
        catch (error) {
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
    async createBusinessMetricEvent(metricName, metricValue, metricUnit, dimensions) {
        try {
            // 创建业务指标事件
            const event = analytics_dto_1.AnalyticsEvent.createBusinessMetricEvent(metricName, metricValue, metricUnit, dimensions);
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
        }
        catch (error) {
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
    async processBatchEvents(eventIds) {
        try {
            // 获取所有事件
            const events = await this.repository.findByIds(eventIds);
            if (events.length === 0) {
                return BatchProcessingResult.failed(['No valid events found for processing']);
            }
            // 验证批量处理资格
            const batchValidation = analytics_rules_1.AnalyticsRules.canBatchProcessEvents(events);
            if (!batchValidation.isEligible) {
                return BatchProcessingResult.failed(batchValidation.errors);
            }
            // 处理每个事件
            const results = [];
            let successCount = 0;
            for (const event of events) {
                if (event.getStatus() !== analytics_dto_1.EventStatus.PENDING_PROCESSING) {
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
                }
                catch (processingError) {
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
        }
        catch (error) {
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
    async performPrivacyComplianceCheck(eventId) {
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
            const riskAssessment = analytics_rules_1.AnalyticsRules.assessPrivacyComplianceRisk(event, session);
            // 检查匿名化要求
            const anonymizationRequirement = analytics_rules_1.AnalyticsRules.validateAnonymizationRequirement(event);
            // 执行必要的合规操作
            if (anonymizationRequirement.isRequired && event.getStatus() !== analytics_dto_1.EventStatus.ANONYMIZED) {
                event.anonymizeData();
                await this.repository.save(event);
            }
            if (anonymizationRequirement.isOverdue && event.getStatus() !== analytics_dto_1.EventStatus.EXPIRED) {
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
        }
        catch (error) {
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
    async generateDataRetentionReport(startDate, endDate) {
        try {
            const events = await this.repository.findByDateRange(startDate, endDate);
            const retentionPolicies = events.map(event => analytics_rules_1.AnalyticsRules.generateRetentionPolicy(event));
            // 统计分析
            const totalEvents = events.length;
            const eventsToDelete = retentionPolicies.filter(policy => policy.daysUntilExpiry <= 0).length;
            const eventsToAnonymize = retentionPolicies.filter(policy => policy.daysUntilAnonymization <= 0).length;
            // 生成按事件类型分组的统计
            const eventTypeStats = new Map();
            events.forEach(event => {
                const eventType = event.getEventType();
                const policy = retentionPolicies.find(p => p.eventId === event.getId().getValue());
                if (!eventTypeStats.has(eventType)) {
                    eventTypeStats.set(eventType, { total: 0, toDelete: 0, toAnonymize: 0 });
                }
                const stats = eventTypeStats.get(eventType);
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
        }
        catch (error) {
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
    async getSessionAnalytics(sessionId, timeRange) {
        try {
            // 获取会话事件
            const events = await this.repository.findBySession(sessionId, timeRange);
            if (events.length === 0) {
                return SessionAnalyticsResult.failed(['No events found for session']);
            }
            // 计算会话统计
            const sortedEvents = events.sort((a, b) => new Date(a.getTimestamp()).getTime() - new Date(b.getTimestamp()).getTime());
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
            const analytics = {
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
        }
        catch (error) {
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
    async getEventProcessingMetrics(timeRange) {
        try {
            const events = await this.repository.findByDateRange(timeRange.startDate, timeRange.endDate);
            const totalEvents = events.length;
            const processedEvents = events.filter(e => e.getStatus() === analytics_dto_1.EventStatus.PROCESSED).length;
            const failedEvents = events.filter(e => e.getStatus() === analytics_dto_1.EventStatus.ERROR).length;
            // 计算平均处理时间
            const processedEventsWithTimes = events.filter(e => e.getStatus() === analytics_dto_1.EventStatus.PROCESSED &&
                e.getCreatedAt());
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
            const metrics = {
                totalEvents,
                processedEvents,
                failedEvents,
                averageProcessingTime,
                throughputPerSecond,
                errorRate
            };
            return EventProcessingMetricsResult.success(metrics);
        }
        catch (error) {
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
    async getDataPrivacyMetrics(timeRange) {
        try {
            const events = await this.repository.findByDateRange(timeRange.startDate, timeRange.endDate);
            const totalEvents = events.length;
            const anonymizedEvents = events.filter(e => e.getStatus() === analytics_dto_1.EventStatus.ANONYMIZED).length;
            const expiredEvents = events.filter(e => e.getStatus() === analytics_dto_1.EventStatus.EXPIRED).length;
            // 计算需要匿名化的事件数量
            const pendingAnonymization = events.filter(event => {
                const requirement = analytics_rules_1.AnalyticsRules.validateAnonymizationRequirement(event);
                return requirement.isRequired && event.getStatus() !== analytics_dto_1.EventStatus.ANONYMIZED;
            }).length;
            // 计算合规分数
            const compliantEvents = events.filter(event => {
                const session = new analytics_dto_1.UserSession({
                    sessionId: event.getSessionId(),
                    userId: event.getUserId(),
                    consentStatus: analytics_dto_1.ConsentStatus.GRANTED,
                    isSystemSession: false
                });
                const riskAssessment = analytics_rules_1.AnalyticsRules.assessPrivacyComplianceRisk(event, session);
                return riskAssessment.riskLevel === 'LOW';
            }).length;
            const complianceScore = totalEvents > 0 ? (compliantEvents / totalEvents) * 100 : 100;
            // 确定整体风险等级
            let riskLevel;
            if (complianceScore >= 90) {
                riskLevel = 'LOW';
            }
            else if (complianceScore >= 75) {
                riskLevel = 'MEDIUM';
            }
            else if (complianceScore >= 50) {
                riskLevel = 'HIGH';
            }
            else {
                riskLevel = 'CRITICAL';
            }
            const metrics = {
                totalEvents,
                anonymizedEvents,
                expiredEvents,
                pendingAnonymization,
                complianceScore,
                riskLevel
            };
            return DataPrivacyMetricsResult.success(metrics);
        }
        catch (error) {
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
    async validateReportingAccess(userRole, reportType, dataScope) {
        try {
            const permissions = analytics_rules_1.AnalyticsRules.calculateReportingPermissions(userRole, reportType, dataScope);
            await this.auditLogger.logSecurityEvent('REPORTING_ACCESS_CHECK', {
                userRole,
                reportType,
                dataScope,
                hasAccess: permissions.hasAccess,
                permissions: permissions.permissions,
                restrictions: permissions.restrictions
            });
            return ReportingAccessResult.success(permissions);
        }
        catch (error) {
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
exports.AnalyticsDomainService = AnalyticsDomainService;
// 结果类定义
class EventCreationResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new EventCreationResult(true, data);
    }
    static failed(errors) {
        return new EventCreationResult(false, undefined, errors);
    }
}
exports.EventCreationResult = EventCreationResult;
class BatchProcessingResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new BatchProcessingResult(true, data);
    }
    static failed(errors) {
        return new BatchProcessingResult(false, undefined, errors);
    }
}
exports.BatchProcessingResult = BatchProcessingResult;
class PrivacyComplianceResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new PrivacyComplianceResult(true, data);
    }
    static failed(errors) {
        return new PrivacyComplianceResult(false, undefined, errors);
    }
}
exports.PrivacyComplianceResult = PrivacyComplianceResult;
class DataRetentionReportResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new DataRetentionReportResult(true, data);
    }
    static failed(errors) {
        return new DataRetentionReportResult(false, undefined, errors);
    }
}
exports.DataRetentionReportResult = DataRetentionReportResult;
class SessionAnalyticsResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new SessionAnalyticsResult(true, data);
    }
    static failed(errors) {
        return new SessionAnalyticsResult(false, undefined, errors);
    }
}
exports.SessionAnalyticsResult = SessionAnalyticsResult;
class EventProcessingMetricsResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new EventProcessingMetricsResult(true, data);
    }
    static failed(errors) {
        return new EventProcessingMetricsResult(false, undefined, errors);
    }
}
exports.EventProcessingMetricsResult = EventProcessingMetricsResult;
class DataPrivacyMetricsResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new DataPrivacyMetricsResult(true, data);
    }
    static failed(errors) {
        return new DataPrivacyMetricsResult(false, undefined, errors);
    }
}
exports.DataPrivacyMetricsResult = DataPrivacyMetricsResult;
class ReportingAccessResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new ReportingAccessResult(true, data);
    }
    static failed(errors) {
        return new ReportingAccessResult(false, undefined, errors);
    }
}
exports.ReportingAccessResult = ReportingAccessResult;
