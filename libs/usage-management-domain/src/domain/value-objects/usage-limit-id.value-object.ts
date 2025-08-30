import { ValueObject } from './base/value-object.js';

export class UsageLimitId extends ValueObject<{ value: string }> {
  static generate(): UsageLimitId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new UsageLimitId({ value: `usage_${timestamp}_${random}` });
  }
  
  getValue(): string {
    return this.props.value;
  }
}
