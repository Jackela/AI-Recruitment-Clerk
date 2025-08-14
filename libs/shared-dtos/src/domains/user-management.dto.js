"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionExpiredEvent = exports.UsageRecordedEvent = exports.SessionCreatedEvent = exports.UserManagementValidationResult = exports.SessionValidationService = exports.UsageResult = exports.UsageStats = exports.SessionStatus = exports.UsageQuota = exports.IPAddress = exports.SessionId = exports.UserSession = void 0;
const value_object_1 = require("../base/value-object");
// 用户会话聚合根
class UserSession {
    constructor(id, ip, status, createdAt, lastActiveAt, dailyQuota) {
        this.id = id;
        this.ip = ip;
        this.status = status;
        this.createdAt = createdAt;
        this.lastActiveAt = lastActiveAt;
        this.dailyQuota = dailyQuota;
        this.uncommittedEvents = [];
    }
    // 工厂方法
    static create(ip) {
        const sessionId = SessionId.generate();
        const ipAddress = new IPAddress({ value: ip });
        const quota = UsageQuota.createDefault();
        const session = new UserSession(sessionId, ipAddress, SessionStatus.ACTIVE, new Date(), new Date(), quota);
        session.addEvent(new SessionCreatedEvent(sessionId.getValue(), ip, new Date()));
        return session;
    }
    static restore(data) {
        return new UserSession(new SessionId({ value: data.id }), new IPAddress({ value: data.ip }), data.status, data.createdAt, data.lastActiveAt, UsageQuota.restore(data.quota));
    }
    // 核心业务方法
    recordUsage() {
        if (!this.canUse()) {
            return UsageResult.failed('Usage quota exceeded');
        }
        if (this.isExpired()) {
            return UsageResult.failed('Session expired');
        }
        const newQuota = this.dailyQuota.incrementUsage();
        // Replace the quota object immutably
        this.dailyQuota = newQuota;
        this.lastActiveAt = new Date();
        const remaining = this.getRemainingQuota();
        this.addEvent(new UsageRecordedEvent(this.id.getValue(), newQuota.getUsed(), remaining, new Date()));
        return UsageResult.success({
            used: newQuota.getUsed(),
            remaining: remaining
        });
    }
    expire() {
        this.status = SessionStatus.EXPIRED;
        this.addEvent(new SessionExpiredEvent(this.id.getValue(), new Date()));
    }
    isValid() {
        return this.status === SessionStatus.ACTIVE && !this.isExpired();
    }
    canUse() {
        return this.isValid() && this.getRemainingQuota() > 0;
    }
    getDailyUsage() {
        return new UsageStats({
            used: this.dailyQuota.getUsed(),
            remaining: this.getRemainingQuota(),
            total: this.dailyQuota.getTotalLimit(),
            resetTime: this.calculateResetTime()
        });
    }
    getRemainingQuota() {
        return Math.max(0, this.dailyQuota.getTotalLimit() - this.dailyQuota.getUsed());
    }
    isExpired() {
        const hoursElapsed = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
        return hoursElapsed >= 24;
    }
    calculateResetTime() {
        const resetTime = new Date(this.createdAt);
        resetTime.setHours(resetTime.getHours() + 24);
        return resetTime;
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
    // Getters for other agents
    getId() {
        return this.id;
    }
    getIP() {
        return this.ip;
    }
    getStatus() {
        return this.status;
    }
}
exports.UserSession = UserSession;
// 值对象
class SessionId extends value_object_1.ValueObject {
    static generate() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return new SessionId({ value: `session_${timestamp}_${random}` });
    }
    getValue() {
        return this.props.value;
    }
}
exports.SessionId = SessionId;
class IPAddress extends value_object_1.ValueObject {
    constructor(props) {
        if (!props.value || !/^\d+\.\d+\.\d+\.\d+$/.test(props.value)) {
            throw new Error('IP address must be valid IPv4 format');
        }
        super(props);
    }
    getValue() {
        return this.props.value;
    }
}
exports.IPAddress = IPAddress;
class UsageQuota extends value_object_1.ValueObject {
    static createDefault() {
        return new UsageQuota({
            daily: 5,
            used: 0,
            questionnaireBonuses: 0,
            paymentBonuses: 0
        });
    }
    static restore(data) {
        return new UsageQuota(data);
    }
    incrementUsage() {
        return new UsageQuota({
            ...this.props,
            used: this.props.used + 1
        });
    }
    addQuestionnaireBonus() {
        return new UsageQuota({
            ...this.props,
            questionnaireBonuses: this.props.questionnaireBonuses + 5
        });
    }
    addPaymentBonus() {
        return new UsageQuota({
            ...this.props,
            paymentBonuses: this.props.paymentBonuses + 5
        });
    }
    getTotalLimit() {
        return this.props.daily + this.props.questionnaireBonuses + this.props.paymentBonuses;
    }
    getUsed() {
        return this.props.used;
    }
}
exports.UsageQuota = UsageQuota;
// 辅助类型
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["ACTIVE"] = "active";
    SessionStatus["EXPIRED"] = "expired";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
class UsageStats extends value_object_1.ValueObject {
    get used() {
        return this.props.used;
    }
    get remaining() {
        return this.props.remaining;
    }
    get total() {
        return this.props.total;
    }
    get resetTime() {
        return this.props.resetTime;
    }
}
exports.UsageStats = UsageStats;
class UsageResult {
    constructor(success, data, error) {
        this.success = success;
        this.data = data;
        this.error = error;
    }
    static success(data) {
        return new UsageResult(true, data);
    }
    static failed(error) {
        return new UsageResult(false, undefined, error);
    }
    get quotaExceeded() {
        return !this.success && this.error === 'Usage quota exceeded';
    }
}
exports.UsageResult = UsageResult;
// 领域服务
class SessionValidationService {
    validate(session) {
        const errors = [];
        if (!session.isValid()) {
            errors.push('Session is not valid');
        }
        if (session.getStatus() === SessionStatus.EXPIRED) {
            errors.push('Session has expired');
        }
        return new UserManagementValidationResult(errors.length === 0, errors);
    }
}
exports.SessionValidationService = SessionValidationService;
class UserManagementValidationResult {
    constructor(isValid, errors) {
        this.isValid = isValid;
        this.errors = errors;
    }
}
exports.UserManagementValidationResult = UserManagementValidationResult;
// 领域事件
class SessionCreatedEvent {
    constructor(sessionId, ip, occurredAt) {
        this.sessionId = sessionId;
        this.ip = ip;
        this.occurredAt = occurredAt;
    }
}
exports.SessionCreatedEvent = SessionCreatedEvent;
class UsageRecordedEvent {
    constructor(sessionId, usageCount, remainingQuota, occurredAt) {
        this.sessionId = sessionId;
        this.usageCount = usageCount;
        this.remainingQuota = remainingQuota;
        this.occurredAt = occurredAt;
    }
}
exports.UsageRecordedEvent = UsageRecordedEvent;
class SessionExpiredEvent {
    constructor(sessionId, expiredAt, occurredAt = new Date()) {
        this.sessionId = sessionId;
        this.expiredAt = expiredAt;
        this.occurredAt = occurredAt;
    }
}
exports.SessionExpiredEvent = SessionExpiredEvent;
