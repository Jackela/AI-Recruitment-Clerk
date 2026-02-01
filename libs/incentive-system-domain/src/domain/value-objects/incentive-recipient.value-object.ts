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
  public static create(ip: string, contactInfo: ContactInfo): IncentiveRecipient {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): IncentiveRecipient {
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
  public getIP(): string {
    return this.props.ip;
  }

  /**
   * Performs the has valid contact info operation.
   * @returns The boolean value.
   */
  public hasValidContactInfo(): boolean {
    return this.props.contactInfo.isValid();
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  public isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  /**
   * Retrieves validation errors.
   * @returns The an array of string value.
   */
  public getValidationErrors(): string[] {
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
