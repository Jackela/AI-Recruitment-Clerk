import { ValueObject } from '../base/value-object.js';
import { ContactInfo } from './contact-info.value-object.js';
import { VerificationStatus } from '../aggregates/incentive.aggregate.js';

/**
 * Represents the incentive recipient.
 */
export class IncentiveRecipient extends ValueObject<{
  ip: string;
  contactInfo: ContactInfo;
  verificationStatus: VerificationStatus;
}> {
  /**
   * Creates the entity.
   * @param ip - The ip.
   * @param contactInfo - The contact info.
   * @returns The IncentiveRecipient.
   */
  static create(ip: string, contactInfo: ContactInfo): IncentiveRecipient {
    return new IncentiveRecipient({
      ip,
      contactInfo,
      verificationStatus: VerificationStatus.PENDING,
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The IncentiveRecipient.
   */
  static restore(data: any): IncentiveRecipient {
    return new IncentiveRecipient({
      ip: data.ip,
      contactInfo: ContactInfo.restore(data.contactInfo),
      verificationStatus: data.verificationStatus,
    });
  }

  /**
   * Retrieves ip.
   * @returns The string value.
   */
  getIP(): string {
    return this.props.ip;
  }

  /**
   * Performs the has valid contact info operation.
   * @returns The boolean value.
   */
  hasValidContactInfo(): boolean {
    return this.props.contactInfo.isValid();
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (
      !this.props.ip ||
      !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        this.props.ip,
      )
    ) {
      errors.push('Valid IP address is required');
    }

    if (!this.props.contactInfo.isValid()) {
      errors.push(...this.props.contactInfo.getValidationErrors());
    }

    return errors;
  }
}
