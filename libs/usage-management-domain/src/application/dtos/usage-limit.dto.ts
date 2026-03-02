// 枚举和类型
export enum BonusType {
  QUESTIONNAIRE = 'questionnaire',
  PAYMENT = 'payment',
  REFERRAL = 'referral',
  PROMOTION = 'promotion',
}

/**
 * Defines the shape of the usage limit data.
 */
export interface UsageLimitData {
  id: string;
  ip: string;
  policy: {
    dailyLimit: number;
    bonusEnabled: boolean;
    maxBonusQuota: number;
    resetTimeUTC: number;
  };
  quotaAllocation: {
    baseQuota: number;
    bonusQuota: number;
    bonusBreakdown: Iterable<[BonusType, number]>;
  };
  usageTracking: {
    currentCount: number;
    usageHistory: Array<{ timestamp: string | Date; count: number }>;
    lastUsageAt?: string | Date;
  };
  lastResetAt: string;
}
