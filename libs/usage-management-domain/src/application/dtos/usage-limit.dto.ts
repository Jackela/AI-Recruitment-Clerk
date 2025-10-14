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
  policy: any;
  quotaAllocation: any;
  usageTracking: any;
  lastResetAt: string;
}
