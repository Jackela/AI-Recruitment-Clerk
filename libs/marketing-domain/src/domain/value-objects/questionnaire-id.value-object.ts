import { ValueObject } from './base/value-object.js';

/**
 * Represents the questionnaire id.
 */
export class QuestionnaireId extends ValueObject<{ value: string }> {
  /**
   * Generates the result.
   * @returns The QuestionnaireId.
   */
  static generate(): QuestionnaireId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new QuestionnaireId({ value: `quest_${timestamp}_${random}` });
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  getValue(): string {
    return this.props.value;
  }
}
