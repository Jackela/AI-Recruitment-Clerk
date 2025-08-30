import { ValueObject } from '../base/value-object.js';
import { Currency, RewardType } from '../aggregates/incentive.aggregate.js';

export class IncentiveReward extends ValueObject<{
  amount: number;
  currency: Currency;
  rewardType: RewardType;
  calculationMethod: string;
}> {
  static calculateForQuestionnaire(qualityScore: number): IncentiveReward {
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
      calculationMethod
    });
  }

  static createReferralReward(): IncentiveReward {
    return new IncentiveReward({
      amount: 3,
      currency: Currency.CNY,
      rewardType: RewardType.REFERRAL,
      calculationMethod: 'Fixed referral reward'
    });
  }

  static restore(data: any): IncentiveReward {
    return new IncentiveReward(data);
  }

  getAmount(): number {
    return this.props.amount;
  }

  getCurrency(): Currency {
    return this.props.currency;
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  getValidationErrors(): string[] {
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
