import { ValueObject } from './base/value-object.js';

/**
 * Represents the quality score.
 */
export class QualityScore extends ValueObject<{ value: number }> {
  /**
   * Performs the value operation.
   * @returns The number value.
   */
  public get value(): number {
    return this.props.value;
  }
}
