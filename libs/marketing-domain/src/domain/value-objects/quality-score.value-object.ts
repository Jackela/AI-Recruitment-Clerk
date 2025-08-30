import { ValueObject } from './base/value-object.js';

export class QualityScore extends ValueObject<{ value: number }> {
  get value(): number {
    return this.props.value;
  }
}
