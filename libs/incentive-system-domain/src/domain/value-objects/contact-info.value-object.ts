import { ValueObject } from '../base/value-object.js';

export class ContactInfo extends ValueObject<{
  email?: string;
  phone?: string;
  wechat?: string;
  alipay?: string;
}> {
  static restore(data: any): ContactInfo {
    return new ContactInfo(data);
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

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

  getPrimaryContact(): string {
    if (this.props.wechat) return `WeChat: ${this.props.wechat}`;
    if (this.props.alipay) return `Alipay: ${this.props.alipay}`;
    if (this.props.phone) return `Phone: ${this.props.phone}`;
    if (this.props.email) return `Email: ${this.props.email}`;
    return 'No contact info';
  }

  get email(): string | undefined { return this.props.email; }
  get phone(): string | undefined { return this.props.phone; }
  get wechat(): string | undefined { return this.props.wechat; }
  get alipay(): string | undefined { return this.props.alipay; }
}
