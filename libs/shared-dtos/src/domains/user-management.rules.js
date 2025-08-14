"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSessionRules = void 0;
class UserSessionRules {
    static canUseService(session) {
        return session.isValid() && session.canUse();
    }
    static isSessionExpired(session) {
        const createdAt = session.getDailyUsage().resetTime.getTime() - (24 * 60 * 60 * 1000);
        const hoursElapsed = (Date.now() - createdAt) / (1000 * 60 * 60);
        return hoursElapsed >= this.SESSION_TIMEOUT_HOURS;
    }
    static calculateRemainingQuota(session) {
        const usage = session.getDailyUsage();
        return Math.max(0, usage.total - usage.used);
    }
    static isWithinDailyLimit(usedCount) {
        return usedCount < this.DAILY_FREE_LIMIT;
    }
    static canApplyQuestionnaireBonus(session) {
        // 一个会话最多只能申请一次问卷奖励
        return session.isValid();
    }
    static canApplyPaymentBonus(session) {
        // 一个会话最多只能申请一次支付奖励
        return session.isValid();
    }
}
exports.UserSessionRules = UserSessionRules;
UserSessionRules.DAILY_FREE_LIMIT = 5;
UserSessionRules.QUESTIONNAIRE_BONUS = 5;
UserSessionRules.PAYMENT_BONUS = 5;
UserSessionRules.SESSION_TIMEOUT_HOURS = 24;
