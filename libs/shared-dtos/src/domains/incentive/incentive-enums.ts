/**
 * Incentive system enumerations.
 * Defines status, verification, currency, reward type, trigger type, and payment method enums.
 */

/**
 * Represents the status of an incentive.
 */
export enum IncentiveStatus {
  PENDING_VALIDATION = 'pending_validation',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  EXPIRED = 'expired',
}

/**
 * Represents the verification status of a recipient.
 */
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

/**
 * Represents the currency for rewards.
 */
export enum Currency {
  CNY = 'CNY',
  USD = 'USD',
}

/**
 * Represents the type of reward.
 */
export enum RewardType {
  QUESTIONNAIRE_COMPLETION = 'questionnaire_completion',
  REFERRAL = 'referral',
  PROMOTION = 'promotion',
}

/**
 * Represents the type of trigger that creates an incentive.
 */
export enum TriggerType {
  QUESTIONNAIRE_COMPLETION = 'questionnaire_completion',
  REFERRAL = 'referral',
  SYSTEM_PROMOTION = 'system_promotion',
}

/**
 * Represents the payment method for incentive payouts.
 */
export enum PaymentMethod {
  WECHAT_PAY = 'wechat_pay',
  ALIPAY = 'alipay',
  BANK_TRANSFER = 'bank_transfer',
  MANUAL = 'manual',
}
