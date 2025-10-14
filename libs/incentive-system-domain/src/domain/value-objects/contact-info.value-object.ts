import { ValueObject } from '../base/value-object.js';

/**
 * Represents the contact info.
 */
export class ContactInfo extends ValueObject<{
  email?: string;
  phone?: string;
  wechat?: string;
  alipay?: string;
}> {
  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The ContactInfo.
   */
  static restore(data: any): ContactInfo {
    return new ContactInfo(data);
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
    const { email, phone, wechat, alipay } = this.props;

    // 至少需要一种联系方式
    if (!email && !phone && !wechat && !alipay) {
      errors.push('At least one contact method is required');
      return errors;
    }

    // 验证邮箱格式
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }

    // 验证手机号格式（中国大陆）
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      errors.push('Invalid phone number format');
    }

    // 验证微信号格式
    if (wechat && (wechat.length < 6 || wechat.length > 20)) {
      errors.push('WeChat ID must be 6-20 characters');
    }

    return errors;
  }

  /**
   * Retrieves primary contact.
   * @returns The string value.
   */
  getPrimaryContact(): string {
    if (this.props.wechat) return `WeChat: ${this.props.wechat}`;
    if (this.props.alipay) return `Alipay: ${this.props.alipay}`;
    if (this.props.phone) return `Phone: ${this.props.phone}`;
    if (this.props.email) return `Email: ${this.props.email}`;
    return 'No contact info';
  }

  /**
   * Performs the email operation.
   * @returns The string | undefined.
   */
  get email(): string | undefined {
    return this.props.email;
  }
  /**
   * Performs the phone operation.
   * @returns The string | undefined.
   */
  get phone(): string | undefined {
    return this.props.phone;
  }
  /**
   * Performs the wechat operation.
   * @returns The string | undefined.
   */
  get wechat(): string | undefined {
    return this.props.wechat;
  }
  /**
   * Performs the alipay operation.
   * @returns The string | undefined.
   */
  get alipay(): string | undefined {
    return this.props.alipay;
  }
}
