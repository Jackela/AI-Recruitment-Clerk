import { UserSession } from './user-management.dto';

/**
 * Represents the user session rules.
 */
export class UserSessionRules {
  static readonly DAILY_FREE_LIMIT = 5;
  static readonly QUESTIONNAIRE_BONUS = 5;
  static readonly PAYMENT_BONUS = 5;
  static readonly SESSION_TIMEOUT_HOURS = 24;
  
  /**
   * Performs the can use service operation.
   * @param session - The session.
   * @returns The boolean value.
   */
  static canUseService(session: UserSession): boolean {
    return session.isValid() && session.canUse();
  }
  
  /**
   * Performs the is session expired operation.
   * @param session - The session.
   * @returns The boolean value.
   */
  static isSessionExpired(session: UserSession): boolean {
    const createdAt = session.getDailyUsage().resetTime.getTime() - (24 * 60 * 60 * 1000);
    const hoursElapsed = (Date.now() - createdAt) / (1000 * 60 * 60);
    return hoursElapsed >= this.SESSION_TIMEOUT_HOURS;
  }
  
  /**
   * Calculates remaining quota.
   * @param session - The session.
   * @returns The number value.
   */
  static calculateRemainingQuota(session: UserSession): number {
    const usage = session.getDailyUsage();
    return Math.max(0, usage.total - usage.used);
  }
  
  /**
   * Performs the is within daily limit operation.
   * @param usedCount - The used count.
   * @returns The boolean value.
   */
  static isWithinDailyLimit(usedCount: number): boolean {
    return usedCount < this.DAILY_FREE_LIMIT;
  }
  
  /**
   * Performs the can apply questionnaire bonus operation.
   * @param session - The session.
   * @returns The boolean value.
   */
  static canApplyQuestionnaireBonus(session: UserSession): boolean {
    // 一个会话最多只能申请一次问卷奖励
    return session.isValid();
  }
  
  /**
   * Performs the can apply payment bonus operation.
   * @param session - The session.
   * @returns The boolean value.
   */
  static canApplyPaymentBonus(session: UserSession): boolean {
    // 一个会话最多只能申请一次支付奖励
    return session.isValid();
  }
}
