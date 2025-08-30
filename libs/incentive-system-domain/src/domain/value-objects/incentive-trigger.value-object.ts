import { ValueObject } from '../base/value-object.js';
import { TriggerType } from '../aggregates/incentive.aggregate.js';

export class IncentiveTrigger extends ValueObject<{
  triggerType: TriggerType;
  triggerData: any;
  qualifiedAt: Date;
}> {
  static fromQuestionnaire(questionnaireId: string, qualityScore: number): IncentiveTrigger {
    return new IncentiveTrigger({
      triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
      triggerData: { questionnaireId, qualityScore },
      qualifiedAt: new Date()
    });
  }

  static fromReferral(referredIP: string): IncentiveTrigger {
    return new IncentiveTrigger({
      triggerType: TriggerType.REFERRAL,
      triggerData: { referredIP },
      qualifiedAt: new Date()
    });
  }

  static restore(data: any): IncentiveTrigger {
    return new IncentiveTrigger({
      ...data,
      qualifiedAt: new Date(data.qualifiedAt)
    });
  }

  getTriggerType(): TriggerType {
    return this.props.triggerType;
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  getValidationErrors(): string[] {
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
        if (typeof this.props.triggerData.qualityScore !== 'number' ||
            this.props.triggerData.qualityScore < 0 ||
            this.props.triggerData.qualityScore > 100) {
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
