import { ValueObject } from './base/value-object.js';

/**
 * Represents the usage limit id.
 */
export class UsageLimitId extends ValueObject<{ value: string }> {
  /**
   * Generates the result.
   * @returns The UsageLimitId.
   */
  static generate(): UsageLimitId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new UsageLimitId({ value: `usage_${timestamp}_${random}` });
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  getValue(): string {
    return this.props.value;
  }
}
