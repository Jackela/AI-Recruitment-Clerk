/**
 * Incentive system value objects.
 * Defines IncentiveId, IncentiveRecipient, ContactInfo, IncentiveReward, and IncentiveTrigger.
 */

import { ValueObject } from '../../base/value-object';
import {
  Currency,
  RewardType,
  VerificationStatus,
  TriggerType,
} from './incentive-enums';
import type {
  ContactInfoData,
  IncentiveRewardData,
  IncentiveTriggerData,
  IncentiveRecipientData,
} from './incentive-interfaces';

// ============================================================================
// IncentiveId Value Object
// ============================================================================

/**
 * Represents the incentive id.
 */
export class IncentiveId extends ValueObject<{ value: string }> {
  /**
   * Generates a new unique IncentiveId.
   * @returns The IncentiveId.
   */
  public static generate(): IncentiveId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new IncentiveId({ value: `incentive_${timestamp}_${random}` });
  }

  /**
   * Retrieves the string value of the id.
   * @returns The string value.
   */
  public getValue(): string {
    return this.props.value;
  }
}

// ============================================================================
// ContactInfo Value Object
// ============================================================================

/**
 * Represents the contact info.
 */
export class ContactInfo extends ValueObject<ContactInfoData> {
  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The ContactInfo.
   */
  public static restore(data: ContactInfoData): ContactInfo {
    return new ContactInfo(data);
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  public getValidationErrors(): string[] {
    const errors: string[] = [];
    const { email, phone, wechat, alipay } = this.props;

    // 至少需要一种联系方式
    if (!email && !phone && !wechat && !alipay) {
      errors.push('At least one contact method is required');
      return errors;
    }

    // 验证邮箱格式
    if (email) {
      if (email.length > 254) {
        errors.push('Email address too long');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Invalid email format');
      }
    }

    // 验证手机号格式（中国大陆）
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      errors.push('Invalid phone number format');
    }

    // 验证微信号格式
    if (wechat && (wechat.length < 6 || wechat.length > 20)) {
      errors.push('WeChat ID must be 6-20 characters');
    }

    return errors;
  }

  /**
   * Retrieves primary contact.
   * @returns The string value.
   */
  public getPrimaryContact(): string {
    if (this.props.wechat) return `WeChat: ${this.props.wechat}`;
    if (this.props.alipay) return `Alipay: ${this.props.alipay}`;
    if (this.props.phone) return `Phone: ${this.props.phone}`;
    if (this.props.email) return `Email: ${this.props.email}`;
    return 'No contact info';
  }

  /**
   * Performs the email operation.
   * @returns The string | undefined.
   */
  public get email(): string | undefined {
    return this.props.email;
  }
  /**
   * Performs the phone operation.
   * @returns The string | undefined.
   */
  public get phone(): string | undefined {
    return this.props.phone;
  }
  /**
   * Performs the wechat operation.
   * @returns The string | undefined.
   */
  public get wechat(): string | undefined {
    return this.props.wechat;
  }
  /**
   * Performs the alipay operation.
   * @returns The string | undefined.
   */
  public get alipay(): string | undefined {
    return this.props.alipay;
  }
}

// ============================================================================
// IncentiveRecipient Value Object
// ============================================================================

/**
 * Represents the incentive recipient.
 */
export class IncentiveRecipient extends ValueObject<{
  ip: string;
  contactInfo: ContactInfo;
  verificationStatus: VerificationStatus;
}> {
  /**
   * Creates the entity.
   * @param ip - The ip.
   * @param contactInfo - The contact info.
   * @returns The IncentiveRecipient.
   */
  public static create(ip: string, contactInfo: ContactInfo): IncentiveRecipient {
    return new IncentiveRecipient({
      ip,
      contactInfo,
      verificationStatus: VerificationStatus.PENDING,
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The IncentiveRecipient.
   */
  public static restore(data: IncentiveRecipientData): IncentiveRecipient {
    return new IncentiveRecipient({
      ip: data.ip,
      contactInfo: ContactInfo.restore(data.contactInfo),
      verificationStatus: data.verificationStatus,
    });
  }

  /**
   * Retrieves ip.
   * @returns The string value.
   */
  public getIP(): string {
    return this.props.ip;
  }

  /**
   * Performs the has valid contact info operation.
   * @returns The boolean value.
   */
  public hasValidContactInfo(): boolean {
    return this.props.contactInfo.isValid();
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  public getValidationErrors(): string[] {
    const errors: string[] = [];

    if (
      !this.props.ip ||
      !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        this.props.ip,
      )
    ) {
      errors.push('Valid IP address is required');
    }

    if (!this.props.contactInfo.isValid()) {
      errors.push(...this.props.contactInfo.getValidationErrors());
    }

    return errors;
  }
}

// ============================================================================
// IncentiveReward Value Object
// ============================================================================

/**
 * Represents the incentive reward.
 */
export class IncentiveReward extends ValueObject<IncentiveRewardData> {
  /**
   * Calculates for questionnaire.
   * @param qualityScore - The quality score.
   * @returns The IncentiveReward.
   */
  public static calculateForQuestionnaire(qualityScore: number): IncentiveReward {
    let amount = 0;
    let calculationMethod = '';

    if (qualityScore >= 90) {
      amount = 8; // 高质量奖励
      calculationMethod = 'High quality bonus (≥90 score)';
    } else if (qualityScore >= 70) {
      amount = 5; // 标准奖励
      calculationMethod = 'Standard quality bonus (≥70 score)';
    } else if (qualityScore >= 50) {
      amount = 3; // 基础奖励
      calculationMethod = 'Basic completion bonus (≥50 score)';
    } else {
      amount = 0;
      calculationMethod = 'No reward (score <50)';
    }

    return new IncentiveReward({
      amount,
      currency: Currency.CNY,
      rewardType: RewardType.QUESTIONNAIRE_COMPLETION,
      calculationMethod,
    });
  }

  /**
   * Creates referral reward.
   * @returns The IncentiveReward.
   */
  public static createReferralReward(): IncentiveReward {
    return new IncentiveReward({
      amount: 3,
      currency: Currency.CNY,
      rewardType: RewardType.REFERRAL,
      calculationMethod: 'Fixed referral reward',
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The IncentiveReward.
   */
  public static restore(data: IncentiveRewardData): IncentiveReward {
    return new IncentiveReward(data);
  }

  /**
   * Retrieves amount.
   * @returns The number value.
   */
  public getAmount(): number {
    return this.props.amount;
  }

  /**
   * Retrieves currency.
   * @returns The Currency.
   */
  public getCurrency(): Currency {
    return this.props.currency;
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  public getValidationErrors(): string[] {
    const errors: string[] = [];

    if (this.props.amount < 0) {
      errors.push('Reward amount cannot be negative');
    }

    if (this.props.amount > 100) {
      errors.push('Reward amount cannot exceed 100 CNY');
    }

    if (!Object.values(Currency).includes(this.props.currency)) {
      errors.push('Invalid currency');
    }

    return errors;
  }
}

// ============================================================================
// IncentiveTrigger Value Object
// ============================================================================

/**
 * Represents the incentive trigger.
 */
export class IncentiveTrigger extends ValueObject<{
  triggerType: TriggerType;
  triggerData: IncentiveTriggerData;
  qualifiedAt: Date;
}> {
  /**
   * Performs the from questionnaire operation.
   * @param questionnaireId - The questionnaire id.
   * @param qualityScore - The quality score.
   * @returns The IncentiveTrigger.
   */
  public static fromQuestionnaire(
    questionnaireId: string,
    qualityScore: number,
  ): IncentiveTrigger {
    return new IncentiveTrigger({
      triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
      triggerData: { questionnaireId, qualityScore },
      qualifiedAt: new Date(),
    });
  }

  /**
   * Performs the from referral operation.
   * @param referredIP - The referred ip.
   * @returns The IncentiveTrigger.
   */
  public static fromReferral(referredIP: string): IncentiveTrigger {
    return new IncentiveTrigger({
      triggerType: TriggerType.REFERRAL,
      triggerData: { referredIP },
      qualifiedAt: new Date(),
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The IncentiveTrigger.
   */
  public static restore(data: {
    triggerType: TriggerType;
    triggerData: IncentiveTriggerData;
    qualifiedAt: string | Date;
  }): IncentiveTrigger {
    return new IncentiveTrigger({
      triggerType: data.triggerType,
      triggerData: data.triggerData,
      qualifiedAt: new Date(data.qualifiedAt),
    });
  }

  /**
   * Retrieves trigger type.
   * @returns The TriggerType.
   */
  public getTriggerType(): TriggerType {
    return this.props.triggerType;
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  public getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!Object.values(TriggerType).includes(this.props.triggerType)) {
      errors.push('Invalid trigger type');
    }

    if (!this.props.triggerData) {
      errors.push('Trigger data is required');
    }

    // 特定触发类型的验证
    switch (this.props.triggerType) {
      case TriggerType.QUESTIONNAIRE_COMPLETION:
        if (!this.props.triggerData.questionnaireId) {
          errors.push('Questionnaire ID is required');
        }
        if (
          typeof this.props.triggerData.qualityScore !== 'number' ||
          this.props.triggerData.qualityScore < 0 ||
          this.props.triggerData.qualityScore > 100
        ) {
          errors.push('Valid quality score (0-100) is required');
        }
        break;

      case TriggerType.REFERRAL:
        if (!this.props.triggerData.referredIP) {
          errors.push('Referred IP is required');
        }
        break;
    }

    return errors;
  }
}
