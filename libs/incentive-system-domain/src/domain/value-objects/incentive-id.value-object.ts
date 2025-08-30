import { ValueObject } from '../base/value-object.js';

export class IncentiveId extends ValueObject<{ value: string }> {
  static generate(): IncentiveId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new IncentiveId({ value: `incentive_${timestamp}_${random}` });
  }
  
  getValue(): string {
    return this.props.value;
  }
}
