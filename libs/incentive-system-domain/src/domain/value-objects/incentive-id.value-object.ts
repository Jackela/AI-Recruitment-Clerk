import { ValueObject } from '../base/value-object.js';

/**
 * Represents the incentive id.
 */
export class IncentiveId extends ValueObject<{ value: string }> {
  /**
   * Generates the result.
   * @returns The IncentiveId.
   */
  static generate(): IncentiveId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new IncentiveId({ value: `incentive_${timestamp}_${random}` });
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  getValue(): string {
    return this.props.value;
  }
}
