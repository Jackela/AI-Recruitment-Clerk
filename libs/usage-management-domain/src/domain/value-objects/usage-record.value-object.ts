import { ValueObject } from './base/value-object.js';

/**
 * Represents the usage record.
 */
export class UsageRecord extends ValueObject<{
  timestamp: Date;
  count: number;
}> {
  /**
   * Performs the timestamp operation.
   * @returns The Date.
   */
  public get timestamp(): Date {
    return this.props.timestamp;
  }
  /**
   * Performs the count operation.
   * @returns The number value.
   */
  public get count(): number {
    return this.props.count;
  }
}
