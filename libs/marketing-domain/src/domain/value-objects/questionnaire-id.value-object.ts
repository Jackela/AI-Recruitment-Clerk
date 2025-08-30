import { ValueObject } from './base/value-object.js';

export class QuestionnaireId extends ValueObject<{ value: string }> {
  static generate(): QuestionnaireId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new QuestionnaireId({ value: `quest_${timestamp}_${random}` });
  }
  
  getValue(): string {
    return this.props.value;
  }
}
