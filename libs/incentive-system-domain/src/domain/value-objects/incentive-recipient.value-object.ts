import { ValueObject } from '../base/value-object.js';
import { ContactInfo } from './contact-info.value-object.js';
import { VerificationStatus } from '../aggregates/incentive.aggregate.js';

export class IncentiveRecipient extends ValueObject<{
  ip: string;
  contactInfo: ContactInfo;
  verificationStatus: VerificationStatus;
}> {
  static create(ip: string, contactInfo: ContactInfo): IncentiveRecipient {
    return new IncentiveRecipient({
      ip,
      contactInfo,
      verificationStatus: VerificationStatus.PENDING
    });
  }

  static restore(data: any): IncentiveRecipient {
    return new IncentiveRecipient({
      ip: data.ip,
      contactInfo: ContactInfo.restore(data.contactInfo),
      verificationStatus: data.verificationStatus
    });
  }

  getIP(): string {
    return this.props.ip;
  }

  hasValidContactInfo(): boolean {
    return this.props.contactInfo.isValid();
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.props.ip || !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(this.props.ip)) {
      errors.push('Valid IP address is required');
    }

    if (!this.props.contactInfo.isValid()) {
      errors.push(...this.props.contactInfo.getValidationErrors());
    }

    return errors;
  }
}
