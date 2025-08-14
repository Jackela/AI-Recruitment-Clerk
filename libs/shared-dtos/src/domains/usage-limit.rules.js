"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageEfficiency = exports.BonusValidationResult = exports.UsageViolationReport = exports.RecommendedAction = exports.ViolationType = exports.RiskScore = exports.UsageLimitRules = void 0;
const usage_limit_dto_1 = require("./usage-limit.dto");
class UsageLimitRules {
    // 核心业务规则方法
    /**
     * 检查IP地址是否可以使用服务
     */
    static canIPUseService(ip, usageLimit) {
        if (!this.isValidIPAddress(ip)) {
            return false;
        }
        const checkResult = usageLimit.canUse();
        return checkResult.isAllowed();
    }
    /**
     * 计算奖励配额数量
     */
    static calculateBonusQuota(bonusType) {
        switch (bonusType) {
            case usage_limit_dto_1.BonusType.QUESTIONNAIRE:
                return this.QUESTIONNAIRE_BONUS;
            case usage_limit_dto_1.BonusType.PAYMENT:
                return this.PAYMENT_BONUS;
            case usage_limit_dto_1.BonusType.REFERRAL:
                return this.REFERRAL_BONUS;
            case usage_limit_dto_1.BonusType.PROMOTION:
                return this.PROMOTION_BONUS;
            default:
                throw new Error(`Unknown bonus type: ${bonusType}`);
        }
    }
    /**
     * 验证奖励配额是否超过限制
     */
    static isValidBonusQuota(currentBonusQuota, additionalBonus) {
        return (currentBonusQuota + additionalBonus) <= this.MAX_BONUS_QUOTA;
    }
    /**
     * 检查是否应该重置使用计数（基于时间）
     */
    static shouldResetUsage(lastResetAt, currentTime = new Date()) {
        const lastResetDate = new Date(lastResetAt.getFullYear(), lastResetAt.getMonth(), lastResetAt.getDate());
        const currentDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
        return currentDate > lastResetDate;
    }
    /**
     * 计算下次重置时间
     */
    static getNextResetTime(currentTime = new Date()) {
        const nextReset = new Date(currentTime);
        nextReset.setDate(nextReset.getDate() + 1);
        nextReset.setHours(this.RESET_HOUR_UTC, 0, 0, 0);
        return nextReset;
    }
    /**
     * 验证IP地址格式
     */
    static isValidIPAddress(ip) {
        if (!ip || typeof ip !== 'string') {
            return false;
        }
        return this.IP_VALIDATION_REGEX.test(ip);
    }
    /**
     * 检查使用频率是否过高（防止滥用）
     */
    static isRateLimited(usageHistory) {
        const now = new Date();
        const windowStart = new Date(now.getTime() - (this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000));
        const recentUsage = usageHistory.filter(record => record.timestamp >= windowStart);
        return recentUsage.length >= this.MAX_REQUESTS_PER_MINUTE;
    }
    /**
     * 计算使用统计的风险评分
     */
    static calculateRiskScore(statistics) {
        let score = 0;
        const factors = [];
        // 高使用率风险
        const usagePercentage = statistics.getUsagePercentage();
        if (usagePercentage >= 90) {
            score += 30;
            factors.push('High usage rate (>90%)');
        }
        else if (usagePercentage >= 75) {
            score += 15;
            factors.push('Moderate usage rate (>75%)');
        }
        // 奖励配额依赖风险
        if (statistics.bonusQuota > statistics.dailyLimit) {
            score += 20;
            factors.push('Heavy bonus quota dependency');
        }
        // 持续使用模式风险
        if (statistics.lastActivityAt) {
            const hoursSinceLastActivity = (Date.now() - statistics.lastActivityAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastActivity < 1) {
                score += 10;
                factors.push('Very recent activity');
            }
        }
        return new RiskScore(Math.min(100, score), factors);
    }
    /**
     * 验证使用限制策略的有效性
     */
    static isValidUsagePolicy(policy) {
        return policy.dailyLimit > 0 &&
            policy.dailyLimit <= 50 &&
            policy.maxBonusQuota >= 0 &&
            policy.maxBonusQuota <= 100 &&
            policy.resetTimeUTC >= 0 &&
            policy.resetTimeUTC <= 23;
    }
    /**
     * 生成使用限制违规报告
     */
    static generateViolationReport(ip, usageLimit) {
        const statistics = usageLimit.getUsageStatistics();
        const riskScore = this.calculateRiskScore(statistics);
        return new UsageViolationReport({
            ip,
            violationType: this.determineViolationType(statistics),
            currentUsage: statistics.currentUsage,
            allowedQuota: statistics.availableQuota,
            violationTime: new Date(),
            riskScore: riskScore.score,
            riskFactors: riskScore.factors,
            recommendedAction: this.getRecommendedAction(riskScore.score),
            nextAllowedTime: statistics.resetAt
        });
    }
    static determineViolationType(statistics) {
        if (statistics.currentUsage >= statistics.availableQuota) {
            return ViolationType.QUOTA_EXCEEDED;
        }
        if (statistics.getUsagePercentage() >= 90) {
            return ViolationType.HIGH_USAGE_WARNING;
        }
        return ViolationType.RATE_LIMIT_APPROACHED;
    }
    static getRecommendedAction(riskScore) {
        if (riskScore >= 70) {
            return RecommendedAction.BLOCK_TEMPORARILY;
        }
        else if (riskScore >= 40) {
            return RecommendedAction.MONITOR_CLOSELY;
        }
        else if (riskScore >= 20) {
            return RecommendedAction.WARN_USER;
        }
        return RecommendedAction.CONTINUE_NORMAL;
    }
    /**
     * 检查奖励配额申请的合法性
     */
    static validateBonusQuotaRequest(bonusType, requestedAmount, currentBonusQuota, policy) {
        const errors = [];
        // 验证奖励类型
        if (!Object.values(usage_limit_dto_1.BonusType).includes(bonusType)) {
            errors.push(`Invalid bonus type: ${bonusType}`);
        }
        // 验证请求数量
        if (requestedAmount <= 0) {
            errors.push('Bonus amount must be positive');
        }
        const standardBonus = this.calculateBonusQuota(bonusType);
        if (requestedAmount > standardBonus * 2) {
            errors.push(`Requested bonus amount (${requestedAmount}) exceeds maximum allowed (${standardBonus * 2})`);
        }
        // 验证总配额限制
        if (!this.isValidBonusQuota(currentBonusQuota, requestedAmount)) {
            errors.push(`Total bonus quota would exceed maximum limit (${this.MAX_BONUS_QUOTA})`);
        }
        // 验证策略设置
        if (!policy.bonusEnabled) {
            errors.push('Bonus quota is not enabled in current policy');
        }
        return new BonusValidationResult(errors.length === 0, errors, errors.length === 0 ? requestedAmount : 0);
    }
    /**
     * 计算使用效率指标
     */
    static calculateUsageEfficiency(statistics) {
        const utilizationRate = statistics.currentUsage / statistics.dailyLimit;
        const bonusUtilization = statistics.bonusQuota > 0 ?
            Math.min(statistics.currentUsage, statistics.bonusQuota) / statistics.bonusQuota : 0;
        return new UsageEfficiency({
            baseUtilization: Math.min(utilizationRate, 1.0),
            bonusUtilization,
            overallEfficiency: (utilizationRate + bonusUtilization) / 2,
            wasteageScore: Math.max(0, statistics.availableQuota - statistics.currentUsage) / statistics.availableQuota
        });
    }
}
exports.UsageLimitRules = UsageLimitRules;
// 核心业务规则常量
UsageLimitRules.DEFAULT_DAILY_LIMIT = 5;
UsageLimitRules.MAX_BONUS_QUOTA = 20;
UsageLimitRules.QUESTIONNAIRE_BONUS = 5;
UsageLimitRules.PAYMENT_BONUS = 10;
UsageLimitRules.REFERRAL_BONUS = 3;
UsageLimitRules.PROMOTION_BONUS = 2;
// 时间相关常量
UsageLimitRules.RESET_HOUR_UTC = 0; // Midnight UTC
UsageLimitRules.RATE_LIMIT_WINDOW_MINUTES = 1;
UsageLimitRules.MAX_REQUESTS_PER_MINUTE = 10;
// 验证规则
UsageLimitRules.IP_VALIDATION_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
// 支持类和枚举
class RiskScore {
    constructor(score, factors) {
        this.score = score;
        this.factors = factors;
    }
}
exports.RiskScore = RiskScore;
var ViolationType;
(function (ViolationType) {
    ViolationType["QUOTA_EXCEEDED"] = "quota_exceeded";
    ViolationType["HIGH_USAGE_WARNING"] = "high_usage_warning";
    ViolationType["RATE_LIMIT_APPROACHED"] = "rate_limit_approached";
})(ViolationType || (exports.ViolationType = ViolationType = {}));
var RecommendedAction;
(function (RecommendedAction) {
    RecommendedAction["CONTINUE_NORMAL"] = "continue_normal";
    RecommendedAction["WARN_USER"] = "warn_user";
    RecommendedAction["MONITOR_CLOSELY"] = "monitor_closely";
    RecommendedAction["BLOCK_TEMPORARILY"] = "block_temporarily";
})(RecommendedAction || (exports.RecommendedAction = RecommendedAction = {}));
class UsageViolationReport {
    constructor(data) {
        this.data = data;
    }
    get ip() { return this.data.ip; }
    get violationType() { return this.data.violationType; }
    get currentUsage() { return this.data.currentUsage; }
    get allowedQuota() { return this.data.allowedQuota; }
    get riskScore() { return this.data.riskScore; }
    get recommendedAction() { return this.data.recommendedAction; }
}
exports.UsageViolationReport = UsageViolationReport;
class BonusValidationResult {
    constructor(isValid, errors, approvedAmount) {
        this.isValid = isValid;
        this.errors = errors;
        this.approvedAmount = approvedAmount;
    }
}
exports.BonusValidationResult = BonusValidationResult;
class UsageEfficiency {
    constructor(data) {
        this.data = data;
    }
    get baseUtilization() { return this.data.baseUtilization; }
    get bonusUtilization() { return this.data.bonusUtilization; }
    get overallEfficiency() { return this.data.overallEfficiency; }
    get wasteageScore() { return this.data.wasteageScore; }
}
exports.UsageEfficiency = UsageEfficiency;
