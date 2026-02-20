/**
 * Incentive system interfaces.
 * Defines data transfer interfaces for persistence and restoration.
 */

import type {
  Currency,
  RewardType,
  IncentiveStatus,
  VerificationStatus,
  TriggerType,
} from './incentive-enums';

/**
 * Defines the shape of the contact info data.
 */
export interface ContactInfoData {
  email?: string;
  phone?: string;
  wechat?: string;
  alipay?: string;
}

/**
 * Defines the shape of the incentive reward data.
 */
export interface IncentiveRewardData {
  amount: number;
  currency: Currency;
  rewardType: RewardType;
  calculationMethod: string;
}

/**
 * Defines the shape of the incentive trigger data.
 */
export interface IncentiveTriggerData {
  questionnaireId?: string;
  qualityScore?: number;
  referredIP?: string;
}

/**
 * Defines the shape of the incentive recipient data.
 */
export interface IncentiveRecipientData {
  ip: string;
  contactInfo: ContactInfoData;
  verificationStatus: VerificationStatus;
}

/**
 * Defines the shape of the incentive trigger restore data.
 */
export interface IncentiveTriggerRestoreData {
  triggerType: TriggerType;
  triggerData: IncentiveTriggerData;
  qualifiedAt: string | Date;
}

/**
 * Defines the shape of the incentive data for persistence.
 */
export interface IncentiveData {
  id: string;
  recipient: IncentiveRecipientData;
  reward: IncentiveRewardData;
  trigger: IncentiveTriggerRestoreData;
  status: IncentiveStatus;
  createdAt: string;
  processedAt?: string;
  paidAt?: string;
}
