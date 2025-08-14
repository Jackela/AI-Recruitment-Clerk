"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyUsageResetEvent = exports.BonusQuotaAddedEvent = exports.UsageRecordedEvent = exports.UsageLimitExceededEvent = exports.UsageLimitCreatedEvent = exports.BonusType = exports.UsageStatistics = exports.UsageRecordResult = exports.UsageLimitCheckResult = exports.UsageRecord = exports.UsageTracking = exports.QuotaAllocation = exports.UsageLimitPolicy = exports.IPAddress = exports.UsageLimitId = exports.UsageLimit = void 0;
const value_object_1 = require("../base/value-object");
// UsageLimit聚合根 - 管理IP使用限制和配额分配
class UsageLimit {
    constructor(id, ip, policy, quotaAllocation, usageTracking, lastResetAt) {
        this.id = id;
        this.ip = ip;
        this.policy = policy;
        this.quotaAllocation = quotaAllocation;
        this.usageTracking = usageTracking;
        this.lastResetAt = lastResetAt;
        this.uncommittedEvents = [];
    }
    // 工厂方法 - 创建新的使用限制
    static create(ip, policy) {
        const limitId = UsageLimitId.generate();
        const ipAddress = new IPAddress({ value: ip });
        const quotaAllocation = QuotaAllocation.createDefault(policy.dailyLimit);
        const usageTracking = UsageTracking.createEmpty();
        const now = new Date();
        const usageLimit = new UsageLimit(limitId, ipAddress, policy, quotaAllocation, usageTracking, now);
        usageLimit.addEvent(new UsageLimitCreatedEvent(limitId.getValue(), ip, policy.dailyLimit, now));
        return usageLimit;
    }
    // 工厂方法 - 从持久化数据恢复
    static restore(data) {
        return new UsageLimit(new UsageLimitId({ value: data.id }), new IPAddress({ value: data.ip }), UsageLimitPolicy.restore(data.policy), QuotaAllocation.restore(data.quotaAllocation), UsageTracking.restore(data.usageTracking), new Date(data.lastResetAt));
    }
    // 核心业务方法 - 检查是否可以使用
    canUse() {
        this.resetIfNeeded();
        const currentUsage = this.usageTracking.getCurrentCount();
        const availableQuota = this.quotaAllocation.getAvailableQuota();
        if (currentUsage >= availableQuota) {
            const reason = this.generateLimitReachedReason();
            this.addEvent(new UsageLimitExceededEvent(this.id.getValue(), this.ip.getValue(), currentUsage, availableQuota, reason, new Date()));
            return UsageLimitCheckResult.blocked(reason);
        }
        return UsageLimitCheckResult.allowed(availableQuota - currentUsage);
    }
    // 记录使用
    recordUsage() {
        this.resetIfNeeded();
        const checkResult = this.canUse();
        if (!checkResult.isAllowed()) {
            return UsageRecordResult.failed(checkResult.getBlockReason());
        }
        const previousCount = this.usageTracking.getCurrentCount();
        this.usageTracking = this.usageTracking.incrementUsage();
        this.addEvent(new UsageRecordedEvent(this.id.getValue(), this.ip.getValue(), previousCount + 1, this.quotaAllocation.getAvailableQuota(), new Date()));
        return UsageRecordResult.success(this.usageTracking.getCurrentCount(), this.quotaAllocation.getAvailableQuota() - this.usageTracking.getCurrentCount());
    }
    // 添加奖励配额
    addBonusQuota(bonusType, amount) {
        if (amount <= 0) {
            throw new Error('Bonus quota amount must be positive');
        }
        const newAllocation = this.quotaAllocation.addBonus(bonusType, amount);
        this.quotaAllocation = newAllocation;
        this.addEvent(new BonusQuotaAddedEvent(this.id.getValue(), this.ip.getValue(), bonusType, amount, newAllocation.getAvailableQuota(), new Date()));
    }
    // 检查是否需要重置（每日午夜）
    resetIfNeeded() {
        const now = new Date();
        const lastMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastResetMidnight = new Date(this.lastResetAt.getFullYear(), this.lastResetAt.getMonth(), this.lastResetAt.getDate());
        if (lastMidnight > lastResetMidnight) {
            this.performDailyReset();
        }
    }
    // 执行每日重置
    performDailyReset() {
        const oldUsage = this.usageTracking.getCurrentCount();
        const oldQuota = this.quotaAllocation.getAvailableQuota();
        this.usageTracking = UsageTracking.createEmpty();
        this.quotaAllocation = QuotaAllocation.createDefault(this.policy.dailyLimit);
        this.lastResetAt = new Date();
        this.addEvent(new DailyUsageResetEvent(this.id.getValue(), this.ip.getValue(), oldUsage, oldQuota, this.policy.dailyLimit, this.lastResetAt));
    }
    generateLimitReachedReason() {
        const current = this.usageTracking.getCurrentCount();
        const available = this.quotaAllocation.getAvailableQuota();
        return `Daily usage limit reached: ${current}/${available} uses consumed. ` +
            `Limit resets at midnight UTC. Consider completing questionnaire for bonus quota.`;
    }
    // 查询方法
    getUsageStatistics() {
        return new UsageStatistics({
            ip: this.ip.getValue(),
            currentUsage: this.usageTracking.getCurrentCount(),
            dailyLimit: this.policy.dailyLimit,
            availableQuota: this.quotaAllocation.getAvailableQuota(),
            bonusQuota: this.quotaAllocation.getBonusQuota(),
            resetAt: this.getNextResetTime(),
            lastActivityAt: this.usageTracking.getLastUsageAt()
        });
    }
    getNextResetTime() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
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
    getIP() {
        return this.ip.getValue();
    }
    getCurrentUsage() {
        return this.usageTracking.getCurrentCount();
    }
    getAvailableQuota() {
        return this.quotaAllocation.getAvailableQuota() - this.usageTracking.getCurrentCount();
    }
}
exports.UsageLimit = UsageLimit;
// 值对象定义
class UsageLimitId extends value_object_1.ValueObject {
    static generate() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return new UsageLimitId({ value: `usage_${timestamp}_${random}` });
    }
    getValue() {
        return this.props.value;
    }
}
exports.UsageLimitId = UsageLimitId;
class IPAddress extends value_object_1.ValueObject {
    constructor(props) {
        if (!IPAddress.isValidIPv4(props.value)) {
            throw new Error(`Invalid IPv4 address: ${props.value}`);
        }
        super(props);
    }
    static isValidIPv4(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Regex.test(ip);
    }
    getValue() {
        return this.props.value;
    }
}
exports.IPAddress = IPAddress;
class UsageLimitPolicy extends value_object_1.ValueObject {
    static createDefault() {
        return new UsageLimitPolicy({
            dailyLimit: 5,
            bonusEnabled: true,
            maxBonusQuota: 20,
            resetTimeUTC: 0 // Midnight UTC
        });
    }
    static restore(data) {
        return new UsageLimitPolicy(data);
    }
    get dailyLimit() { return this.props.dailyLimit; }
    get bonusEnabled() { return this.props.bonusEnabled; }
    get maxBonusQuota() { return this.props.maxBonusQuota; }
    get resetTimeUTC() { return this.props.resetTimeUTC; }
}
exports.UsageLimitPolicy = UsageLimitPolicy;
class QuotaAllocation extends value_object_1.ValueObject {
    static createDefault(baseQuota) {
        return new QuotaAllocation({
            baseQuota,
            bonusQuota: 0,
            bonusBreakdown: new Map()
        });
    }
    static restore(data) {
        return new QuotaAllocation({
            baseQuota: data.baseQuota,
            bonusQuota: data.bonusQuota,
            bonusBreakdown: new Map(data.bonusBreakdown || [])
        });
    }
    addBonus(bonusType, amount) {
        const currentBonus = this.props.bonusBreakdown.get(bonusType) || 0;
        const newBreakdown = new Map(this.props.bonusBreakdown);
        newBreakdown.set(bonusType, currentBonus + amount);
        return new QuotaAllocation({
            baseQuota: this.props.baseQuota,
            bonusQuota: this.props.bonusQuota + amount,
            bonusBreakdown: newBreakdown
        });
    }
    getAvailableQuota() {
        return this.props.baseQuota + this.props.bonusQuota;
    }
    getBonusQuota() {
        return this.props.bonusQuota;
    }
    getBonusBreakdown() {
        return new Map(this.props.bonusBreakdown);
    }
}
exports.QuotaAllocation = QuotaAllocation;
class UsageTracking extends value_object_1.ValueObject {
    static createEmpty() {
        return new UsageTracking({
            currentCount: 0,
            usageHistory: [],
            lastUsageAt: undefined
        });
    }
    static restore(data) {
        return new UsageTracking({
            currentCount: data.currentCount,
            usageHistory: data.usageHistory.map((r) => new UsageRecord(r)),
            lastUsageAt: data.lastUsageAt ? new Date(data.lastUsageAt) : undefined
        });
    }
    incrementUsage() {
        const record = new UsageRecord({
            timestamp: new Date(),
            count: this.props.currentCount + 1
        });
        return new UsageTracking({
            currentCount: this.props.currentCount + 1,
            usageHistory: [...this.props.usageHistory, record],
            lastUsageAt: new Date()
        });
    }
    getCurrentCount() {
        return this.props.currentCount;
    }
    getLastUsageAt() {
        return this.props.lastUsageAt;
    }
    getUsageHistory() {
        return [...this.props.usageHistory];
    }
}
exports.UsageTracking = UsageTracking;
class UsageRecord extends value_object_1.ValueObject {
    get timestamp() { return this.props.timestamp; }
    get count() { return this.props.count; }
}
exports.UsageRecord = UsageRecord;
// 结果类
class UsageLimitCheckResult {
    constructor(allowed, remainingQuota, blockReason) {
        this.allowed = allowed;
        this.remainingQuota = remainingQuota;
        this.blockReason = blockReason;
    }
    static allowed(remainingQuota) {
        return new UsageLimitCheckResult(true, remainingQuota);
    }
    static blocked(reason) {
        return new UsageLimitCheckResult(false, undefined, reason);
    }
    isAllowed() {
        return this.allowed;
    }
    getRemainingQuota() {
        return this.remainingQuota;
    }
    getBlockReason() {
        return this.blockReason;
    }
}
exports.UsageLimitCheckResult = UsageLimitCheckResult;
class UsageRecordResult {
    constructor(success, currentUsage, remainingQuota, error) {
        this.success = success;
        this.currentUsage = currentUsage;
        this.remainingQuota = remainingQuota;
        this.error = error;
    }
    static success(currentUsage, remainingQuota) {
        return new UsageRecordResult(true, currentUsage, remainingQuota);
    }
    static failed(error) {
        return new UsageRecordResult(false, undefined, undefined, error);
    }
    isSuccess() {
        return this.success;
    }
    getCurrentUsage() {
        return this.currentUsage;
    }
    getRemainingQuota() {
        return this.remainingQuota;
    }
    getError() {
        return this.error;
    }
}
exports.UsageRecordResult = UsageRecordResult;
class UsageStatistics extends value_object_1.ValueObject {
    get ip() { return this.props.ip; }
    get currentUsage() { return this.props.currentUsage; }
    get dailyLimit() { return this.props.dailyLimit; }
    get availableQuota() { return this.props.availableQuota; }
    get bonusQuota() { return this.props.bonusQuota; }
    get resetAt() { return this.props.resetAt; }
    get lastActivityAt() { return this.props.lastActivityAt; }
    getUsagePercentage() {
        return Math.round((this.props.currentUsage / this.props.availableQuota) * 100);
    }
}
exports.UsageStatistics = UsageStatistics;
// 枚举和类型
var BonusType;
(function (BonusType) {
    BonusType["QUESTIONNAIRE"] = "questionnaire";
    BonusType["PAYMENT"] = "payment";
    BonusType["REFERRAL"] = "referral";
    BonusType["PROMOTION"] = "promotion";
})(BonusType || (exports.BonusType = BonusType = {}));
// 领域事件
class UsageLimitCreatedEvent {
    constructor(usageLimitId, ip, dailyLimit, occurredAt) {
        this.usageLimitId = usageLimitId;
        this.ip = ip;
        this.dailyLimit = dailyLimit;
        this.occurredAt = occurredAt;
    }
}
exports.UsageLimitCreatedEvent = UsageLimitCreatedEvent;
class UsageLimitExceededEvent {
    constructor(usageLimitId, ip, currentUsage, availableQuota, reason, occurredAt) {
        this.usageLimitId = usageLimitId;
        this.ip = ip;
        this.currentUsage = currentUsage;
        this.availableQuota = availableQuota;
        this.reason = reason;
        this.occurredAt = occurredAt;
    }
}
exports.UsageLimitExceededEvent = UsageLimitExceededEvent;
class UsageRecordedEvent {
    constructor(usageLimitId, ip, newUsageCount, remainingQuota, occurredAt) {
        this.usageLimitId = usageLimitId;
        this.ip = ip;
        this.newUsageCount = newUsageCount;
        this.remainingQuota = remainingQuota;
        this.occurredAt = occurredAt;
    }
}
exports.UsageRecordedEvent = UsageRecordedEvent;
class BonusQuotaAddedEvent {
    constructor(usageLimitId, ip, bonusType, bonusAmount, newTotalQuota, occurredAt) {
        this.usageLimitId = usageLimitId;
        this.ip = ip;
        this.bonusType = bonusType;
        this.bonusAmount = bonusAmount;
        this.newTotalQuota = newTotalQuota;
        this.occurredAt = occurredAt;
    }
}
exports.BonusQuotaAddedEvent = BonusQuotaAddedEvent;
class DailyUsageResetEvent {
    constructor(usageLimitId, ip, previousUsage, previousQuota, newDailyLimit, occurredAt) {
        this.usageLimitId = usageLimitId;
        this.ip = ip;
        this.previousUsage = previousUsage;
        this.previousQuota = previousQuota;
        this.newDailyLimit = newDailyLimit;
        this.occurredAt = occurredAt;
    }
}
exports.DailyUsageResetEvent = DailyUsageResetEvent;
