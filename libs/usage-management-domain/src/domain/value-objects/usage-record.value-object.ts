import { ValueObject } from './base/value-object.js';

export class UsageRecord extends ValueObject<{
  timestamp: Date;
  count: number;
}> {
  get timestamp(): Date { return this.props.timestamp; }
  get count(): number { return this.props.count; }
}
