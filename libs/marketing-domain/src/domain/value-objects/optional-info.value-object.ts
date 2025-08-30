import { ValueObject } from './base/value-object.js';

export class OptionalInfo extends ValueObject<{
  additionalFeedback?: string;
  contactPreference?: string;
}> {
  get additionalFeedback(): string | undefined { return this.props.additionalFeedback; }
  get contactPreference(): string | undefined { return this.props.contactPreference; }
}
