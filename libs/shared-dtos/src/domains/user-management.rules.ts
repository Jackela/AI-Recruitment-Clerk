import { UserSession } from './user-management.dto';

export class UserSessionRules {
  static readonly DAILY_FREE_LIMIT = 5;
  static readonly QUESTIONNAIRE_BONUS = 5;
  static readonly PAYMENT_BONUS = 5;
  static readonly SESSION_TIMEOUT_HOURS = 24;
  
  static canUseService(session: UserSession): boolean {
    return session.isValid() && session.canUse();
  }
  
  static isSessionExpired(session: UserSession): boolean {
    const createdAt = session.getDailyUsage().resetTime.getTime() - (24 * 60 * 60 * 1000);
    const hoursElapsed = (Date.now() - createdAt) / (1000 * 60 * 60);
    return hoursElapsed >= this.SESSION_TIMEOUT_HOURS;
  }
  
  static calculateRemainingQuota(session: UserSession): number {
    const usage = session.getDailyUsage();
    return Math.max(0, usage.total - usage.used);
  }
  
  static isWithinDailyLimit(usedCount: number): boolean {
    return usedCount < this.DAILY_FREE_LIMIT;
  }
  
  static canApplyQuestionnaireBonus(session: UserSession): boolean {
    // 一个会话最多只能申请一次问卷奖励
    return session.isValid();
  }
  
  static canApplyPaymentBonus(session: UserSession): boolean {
    // 一个会话最多只能申请一次支付奖励
    return session.isValid();
  }
}
