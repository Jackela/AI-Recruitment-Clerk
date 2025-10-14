import { ValueObject } from './base/value-object.js';

/**
 * Represents the optional info.
 */
export class OptionalInfo extends ValueObject<{
  additionalFeedback?: string;
  contactPreference?: string;
}> {
  /**
   * Performs the additional feedback operation.
   * @returns The string | undefined.
   */
  get additionalFeedback(): string | undefined {
    return this.props.additionalFeedback;
  }
  /**
   * Performs the contact preference operation.
   * @returns The string | undefined.
   */
  get contactPreference(): string | undefined {
    return this.props.contactPreference;
  }
}
