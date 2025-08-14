"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskAssessmentResult = exports.UsageAnalysisResult = exports.UsageStatsResult = exports.BonusQuotaResult = exports.UsageTrackingResult = exports.UsageLimitResult = exports.UsageLimitDomainService = void 0;
const usage_limit_dto_1 = require("./usage-limit.dto");
const usage_limit_rules_1 = require("./usage-limit.rules");
class UsageLimitDomainService {
    constructor(repository, eventBus, auditLogger) {
        this.repository = repository;
        this.eventBus = eventBus;
        this.auditLogger = auditLogger;
    }
    /**
     * 检查IP的使用限制状态
     */
    async checkUsageLimit(ip) {
        try {
            // 前置条件验证
            if (!usage_limit_rules_1.UsageLimitRules.isValidIPAddress(ip)) {
                await this.auditLogger.logSecurityEvent('INVALID_IP_ACCESS', { ip });
                return UsageLimitResult.failed(['Invalid IP address format']);
            }
            // 获取或创建使用限制
            let usageLimit = await this.repository.findByIP(ip);
            if (!usageLimit) {
                const policy = usage_limit_dto_1.UsageLimitPolicy.createDefault();
                usageLimit = usage_limit_dto_1.UsageLimit.create(ip, policy);
                await this.repository.save(usageLimit);
                await this.auditLogger.logBusinessEvent('USAGE_LIMIT_CREATED', {
                    ip,
                    dailyLimit: policy.dailyLimit
                });
            }
            // 执行使用限制检查
            const checkResult = usageLimit.canUse();
            const statistics = usageLimit.getUsageStatistics();
            // 发布领域事件
            const events = usageLimit.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }
            usageLimit.markEventsAsCommitted();
            // 保存状态变更
            await this.repository.save(usageLimit);
            // 构建结果
            const result = UsageLimitResult.success({
                allowed: checkResult.isAllowed(),
                remainingQuota: checkResult.getRemainingQuota() || 0,
                currentUsage: statistics.currentUsage,
                dailyLimit: statistics.dailyLimit,
                resetAt: statistics.resetAt,
                bonusQuota: statistics.bonusQuota
            });
            // 如果超出限制，记录违规报告
            if (!checkResult.isAllowed()) {
                const violationReport = usage_limit_rules_1.UsageLimitRules.generateViolationReport(ip, usageLimit);
                await this.auditLogger.logViolation('USAGE_LIMIT_EXCEEDED', violationReport);
            }
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('CHECK_USAGE_LIMIT_ERROR', { ip, error: errorMessage });
            console.error('Error checking usage limit:', error);
            return UsageLimitResult.failed(['Internal error occurred while checking usage limit']);
        }
    }
    /**
     * 记录服务使用
     */
    async recordUsage(ip) {
        try {
            // 验证IP地址
            if (!usage_limit_rules_1.UsageLimitRules.isValidIPAddress(ip)) {
                return UsageTrackingResult.failed('Invalid IP address format');
            }
            // 获取使用限制
            const usageLimit = await this.repository.findByIP(ip);
            if (!usageLimit) {
                return UsageTrackingResult.failed('Usage limit not found. Please check limit first.');
            }
            // 记录使用
            const recordResult = usageLimit.recordUsage();
            if (!recordResult.isSuccess()) {
                await this.auditLogger.logBusinessEvent('USAGE_RECORDING_FAILED', {
                    ip,
                    error: recordResult.getError()
                });
                return UsageTrackingResult.failed(recordResult.getError());
            }
            // 发布领域事件
            const events = usageLimit.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }
            usageLimit.markEventsAsCommitted();
            // 保存更新
            await this.repository.save(usageLimit);
            // 记录成功使用
            await this.auditLogger.logBusinessEvent('USAGE_RECORDED', {
                ip,
                currentUsage: recordResult.getCurrentUsage(),
                remainingQuota: recordResult.getRemainingQuota()
            });
            return UsageTrackingResult.success({
                currentUsage: recordResult.getCurrentUsage(),
                remainingQuota: recordResult.getRemainingQuota(),
                timestamp: new Date()
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('RECORD_USAGE_ERROR', { ip, error: errorMessage });
            console.error('Error recording usage:', error);
            return UsageTrackingResult.failed('Internal error occurred while recording usage');
        }
    }
    /**
     * 添加奖励配额
     */
    async addBonusQuota(ip, bonusType, customAmount) {
        try {
            // 验证输入
            if (!usage_limit_rules_1.UsageLimitRules.isValidIPAddress(ip)) {
                return BonusQuotaResult.failed(['Invalid IP address format']);
            }
            // 获取使用限制
            const usageLimit = await this.repository.findByIP(ip);
            if (!usageLimit) {
                return BonusQuotaResult.failed(['Usage limit not found for IP']);
            }
            // 确定奖励数量
            const bonusAmount = customAmount || usage_limit_rules_1.UsageLimitRules.calculateBonusQuota(bonusType);
            const statistics = usageLimit.getUsageStatistics();
            // 验证奖励请求
            const validation = usage_limit_rules_1.UsageLimitRules.validateBonusQuotaRequest(bonusType, bonusAmount, statistics.bonusQuota, usage_limit_dto_1.UsageLimitPolicy.createDefault());
            if (!validation.isValid) {
                await this.auditLogger.logBusinessEvent('BONUS_QUOTA_REJECTED', {
                    ip,
                    bonusType,
                    requestedAmount: bonusAmount,
                    errors: validation.errors
                });
                return BonusQuotaResult.failed(validation.errors);
            }
            // 添加奖励配额
            usageLimit.addBonusQuota(bonusType, validation.approvedAmount);
            // 发布领域事件
            const events = usageLimit.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }
            usageLimit.markEventsAsCommitted();
            // 保存更新
            await this.repository.save(usageLimit);
            // 记录成功添加
            await this.auditLogger.logBusinessEvent('BONUS_QUOTA_ADDED', {
                ip,
                bonusType,
                addedAmount: validation.approvedAmount,
                newTotalQuota: usageLimit.getAvailableQuota() + usageLimit.getCurrentUsage()
            });
            return BonusQuotaResult.success({
                addedAmount: validation.approvedAmount,
                newTotalQuota: usageLimit.getAvailableQuota() + usageLimit.getCurrentUsage(),
                bonusType
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('ADD_BONUS_QUOTA_ERROR', {
                ip,
                bonusType,
                error: errorMessage
            });
            console.error('Error adding bonus quota:', error);
            return BonusQuotaResult.failed(['Internal error occurred while adding bonus quota']);
        }
    }
    /**
     * 获取使用统计信息
     */
    async getUsageStatistics(ip) {
        try {
            if (ip) {
                // 获取特定IP的统计
                if (!usage_limit_rules_1.UsageLimitRules.isValidIPAddress(ip)) {
                    return UsageStatsResult.failed(['Invalid IP address format']);
                }
                const usageLimit = await this.repository.findByIP(ip);
                if (!usageLimit) {
                    return UsageStatsResult.failed(['Usage limit not found for IP']);
                }
                const statistics = usageLimit.getUsageStatistics();
                const efficiency = usage_limit_rules_1.UsageLimitRules.calculateUsageEfficiency(statistics);
                return UsageStatsResult.success({
                    individual: {
                        ip: statistics.ip,
                        currentUsage: statistics.currentUsage,
                        dailyLimit: statistics.dailyLimit,
                        availableQuota: statistics.availableQuota,
                        bonusQuota: statistics.bonusQuota,
                        resetAt: statistics.resetAt,
                        lastActivityAt: statistics.lastActivityAt,
                        usagePercentage: statistics.getUsagePercentage(),
                        efficiency
                    }
                });
            }
            else {
                // 获取系统整体统计
                const systemStats = await this.calculateSystemStatistics();
                return UsageStatsResult.success({ system: systemStats });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('GET_USAGE_STATISTICS_ERROR', { ip, error: errorMessage });
            console.error('Error getting usage statistics:', error);
            return UsageStatsResult.failed(['Internal error occurred while getting statistics']);
        }
    }
    /**
     * 分析使用模式和趋势
     */
    async analyzeUsagePatterns(timeRange) {
        try {
            const allUsageLimits = await this.repository.findByTimeRange(timeRange.startDate, timeRange.endDate);
            if (allUsageLimits.length === 0) {
                return UsageAnalysisResult.empty();
            }
            const analysis = this.performUsageAnalysis(allUsageLimits, timeRange);
            await this.auditLogger.logBusinessEvent('USAGE_ANALYSIS_PERFORMED', {
                timeRange,
                totalIPs: allUsageLimits.length,
                analysisType: 'pattern_analysis'
            });
            return UsageAnalysisResult.success(analysis);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('ANALYZE_USAGE_PATTERNS_ERROR', {
                timeRange,
                error: errorMessage
            });
            console.error('Error analyzing usage patterns:', error);
            return UsageAnalysisResult.failed(['Internal error occurred during analysis']);
        }
    }
    /**
     * 获取高风险IP列表
     */
    async getHighRiskIPs() {
        try {
            const allUsageLimits = await this.repository.findAll();
            const riskAssessments = [];
            for (const usageLimit of allUsageLimits) {
                const statistics = usageLimit.getUsageStatistics();
                const riskScore = usage_limit_rules_1.UsageLimitRules.calculateRiskScore(statistics);
                if (riskScore.score >= 40) { // Medium risk threshold
                    riskAssessments.push({
                        ip: statistics.ip,
                        riskScore: riskScore.score,
                        riskFactors: riskScore.factors,
                        currentUsage: statistics.currentUsage,
                        availableQuota: statistics.availableQuota,
                        lastActivity: statistics.lastActivityAt,
                        recommendedAction: riskScore.score >= 70 ? 'BLOCK' :
                            riskScore.score >= 60 ? 'MONITOR' : 'WARN'
                    });
                }
            }
            // 按风险评分排序
            riskAssessments.sort((a, b) => b.riskScore - a.riskScore);
            return RiskAssessmentResult.success(riskAssessments);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('GET_HIGH_RISK_IPS_ERROR', { error: errorMessage });
            console.error('Error getting high risk IPs:', error);
            return RiskAssessmentResult.failed(['Internal error occurred during risk assessment']);
        }
    }
    async calculateSystemStatistics() {
        const allUsageLimits = await this.repository.findAll();
        let totalUsage = 0;
        let totalQuota = 0;
        let totalBonusQuota = 0;
        let activeIPs = 0;
        for (const usageLimit of allUsageLimits) {
            const stats = usageLimit.getUsageStatistics();
            totalUsage += stats.currentUsage;
            totalQuota += stats.availableQuota;
            totalBonusQuota += stats.bonusQuota;
            if (stats.lastActivityAt &&
                (Date.now() - stats.lastActivityAt.getTime()) < 24 * 60 * 60 * 1000) {
                activeIPs++;
            }
        }
        return {
            totalIPs: allUsageLimits.length,
            activeIPs,
            totalUsage,
            totalQuota,
            totalBonusQuota,
            systemUtilization: totalQuota > 0 ? (totalUsage / totalQuota) * 100 : 0,
            averageUsagePerIP: allUsageLimits.length > 0 ? totalUsage / allUsageLimits.length : 0
        };
    }
    performUsageAnalysis(usageLimits, timeRange) {
        const patterns = [];
        // 分析使用模式
        const hourlyUsage = new Map();
        const dailyUsage = new Map();
        for (const usageLimit of usageLimits) {
            const stats = usageLimit.getUsageStatistics();
            // 按小时统计
            if (stats.lastActivityAt) {
                const hour = stats.lastActivityAt.getHours();
                hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + stats.currentUsage);
            }
            // 按日期统计
            if (stats.lastActivityAt) {
                const dateStr = stats.lastActivityAt.toISOString().split('T')[0];
                dailyUsage.set(dateStr, (dailyUsage.get(dateStr) || 0) + stats.currentUsage);
            }
        }
        return {
            timeRange,
            totalAnalyzedIPs: usageLimits.length,
            patterns,
            hourlyDistribution: Object.fromEntries(hourlyUsage),
            dailyDistribution: Object.fromEntries(dailyUsage),
            peakUsageHour: this.findPeakHour(hourlyUsage),
            averageUsagePerIP: usageLimits.reduce((sum, ul) => sum + ul.getCurrentUsage(), 0) / usageLimits.length
        };
    }
    findPeakHour(hourlyUsage) {
        let maxUsage = 0;
        let peakHour = 0;
        for (const [hour, usage] of hourlyUsage) {
            if (usage > maxUsage) {
                maxUsage = usage;
                peakHour = hour;
            }
        }
        return peakHour;
    }
}
exports.UsageLimitDomainService = UsageLimitDomainService;
// 结果类和接口定义
class UsageLimitResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new UsageLimitResult(true, data);
    }
    static failed(errors) {
        return new UsageLimitResult(false, undefined, errors);
    }
}
exports.UsageLimitResult = UsageLimitResult;
class UsageTrackingResult {
    constructor(success, data, error) {
        this.success = success;
        this.data = data;
        this.error = error;
    }
    static success(data) {
        return new UsageTrackingResult(true, data);
    }
    static failed(error) {
        return new UsageTrackingResult(false, undefined, error);
    }
}
exports.UsageTrackingResult = UsageTrackingResult;
class BonusQuotaResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new BonusQuotaResult(true, data);
    }
    static failed(errors) {
        return new BonusQuotaResult(false, undefined, errors);
    }
}
exports.BonusQuotaResult = BonusQuotaResult;
class UsageStatsResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new UsageStatsResult(true, data);
    }
    static failed(errors) {
        return new UsageStatsResult(false, undefined, errors);
    }
}
exports.UsageStatsResult = UsageStatsResult;
class UsageAnalysisResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new UsageAnalysisResult(true, data);
    }
    static failed(errors) {
        return new UsageAnalysisResult(false, undefined, errors);
    }
    static empty() {
        return new UsageAnalysisResult(true, {
            timeRange: { startDate: new Date(), endDate: new Date() },
            totalAnalyzedIPs: 0,
            patterns: [],
            hourlyDistribution: {},
            dailyDistribution: {},
            peakUsageHour: 0,
            averageUsagePerIP: 0
        });
    }
}
exports.UsageAnalysisResult = UsageAnalysisResult;
class RiskAssessmentResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new RiskAssessmentResult(true, data);
    }
    static failed(errors) {
        return new RiskAssessmentResult(false, undefined, errors);
    }
}
exports.RiskAssessmentResult = RiskAssessmentResult;
