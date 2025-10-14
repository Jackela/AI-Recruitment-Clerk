import { ValueObject } from '../base/value-object.js';
import { TriggerType } from '../aggregates/incentive.aggregate.js';

/**
 * Represents the incentive trigger.
 */
export class IncentiveTrigger extends ValueObject<{
  triggerType: TriggerType;
  triggerData: any;
  qualifiedAt: Date;
}> {
  /**
   * Performs the from questionnaire operation.
   * @param questionnaireId - The questionnaire id.
   * @param qualityScore - The quality score.
   * @returns The IncentiveTrigger.
   */
  static fromQuestionnaire(
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
  static fromReferral(referredIP: string): IncentiveTrigger {
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
  static restore(data: any): IncentiveTrigger {
    return new IncentiveTrigger({
      ...data,
      qualifiedAt: new Date(data.qualifiedAt),
    });
  }

  /**
   * Retrieves trigger type.
   * @returns The TriggerType.
   */
  getTriggerType(): TriggerType {
    return this.props.triggerType;
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
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
