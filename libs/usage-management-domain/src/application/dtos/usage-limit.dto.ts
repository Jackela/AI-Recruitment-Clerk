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
  policy: Record<string, unknown>;
  quotaAllocation: Record<string, unknown>;
  usageTracking: Record<string, unknown>;
  lastResetAt: string;
}
