import { ContactInfo } from './contact-info.value-object';

describe('ContactInfo', () => {
  describe('restore', () => {
    it('should restore from data', () => {
      const data = {
        email: 'test@example.com',
        phone: '13800138000',
      };

      const contact = ContactInfo.restore(data);
      expect(contact.email).toBe('test@example.com');
      expect(contact.phone).toBe('13800138000');
    });
  });

  describe('isValid', () => {
    it('should return true for valid email', () => {
      const contact = ContactInfo.restore({ email: 'test@example.com' });
      expect(contact.isValid()).toBe(true);
    });

    it('should return true for valid phone', () => {
      const contact = ContactInfo.restore({ phone: '13800138000' });
      expect(contact.isValid()).toBe(true);
    });

    it('should return true for valid wechat', () => {
      const contact = ContactInfo.restore({ wechat: 'test_user_123' });
      expect(contact.isValid()).toBe(true);
    });

    it('should return true for valid alipay', () => {
      const contact = ContactInfo.restore({ alipay: '13800138000' });
      expect(contact.isValid()).toBe(true);
    });

    it('should return false for empty contact', () => {
      const contact = ContactInfo.restore({});
      expect(contact.isValid()).toBe(false);
    });

    it('should return false for invalid email format', () => {
      const contact = ContactInfo.restore({ email: 'invalid-email' });
      expect(contact.isValid()).toBe(false);
    });

    it('should return false for invalid phone format', () => {
      const contact = ContactInfo.restore({ phone: '12345' });
      expect(contact.isValid()).toBe(false);
    });

    it('should return false for wechat with invalid length', () => {
      const contact = ContactInfo.restore({ wechat: 'abc' });
      expect(contact.isValid()).toBe(false);
    });
  });

  describe('getValidationErrors', () => {
    it('should return error for missing contact', () => {
      const contact = ContactInfo.restore({});
      const errors = contact.getValidationErrors();
      expect(errors).toContain('At least one contact method is required');
    });

    it('should return error for invalid email', () => {
      const contact = ContactInfo.restore({ email: 'not-an-email' });
      expect(contact.getValidationErrors()).toContain('Invalid email format');
    });

    it('should return error for invalid phone', () => {
      const contact = ContactInfo.restore({ phone: '123' });
      expect(contact.getValidationErrors()).toContain(
        'Invalid phone number format',
      );
    });

    it('should return error for short wechat', () => {
      const contact = ContactInfo.restore({ wechat: 'abc' });
      expect(contact.getValidationErrors()).toContain(
        'WeChat ID must be 6-20 characters',
      );
    });

    it('should return error for long wechat', () => {
      const contact = ContactInfo.restore({ wechat: 'a'.repeat(25) });
      expect(contact.getValidationErrors()).toContain(
        'WeChat ID must be 6-20 characters',
      );
    });

    it('should return multiple errors when applicable', () => {
      const contact = ContactInfo.restore({
        email: 'invalid',
        phone: 'invalid',
        wechat: 'abc',
      });
      const errors = contact.getValidationErrors();
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getPrimaryContact', () => {
    it('should return WeChat as primary if available', () => {
      const contact = ContactInfo.restore({ wechat: 'test_user' });
      expect(contact.getPrimaryContact()).toBe('WeChat: test_user');
    });

    it('should return Alipay as primary if WeChat not available', () => {
      const contact = ContactInfo.restore({ alipay: 'test_account' });
      expect(contact.getPrimaryContact()).toBe('Alipay: test_account');
    });

    it('should return Phone as primary if WeChat and Alipay not available', () => {
      const contact = ContactInfo.restore({ phone: '13800138000' });
      expect(contact.getPrimaryContact()).toBe('Phone: 13800138000');
    });

    it('should return Email as primary if only email available', () => {
      const contact = ContactInfo.restore({ email: 'test@example.com' });
      expect(contact.getPrimaryContact()).toBe('Email: test@example.com');
    });

    it('should return no contact info when none available', () => {
      const contact = ContactInfo.restore({});
      expect(contact.getPrimaryContact()).toBe('No contact info');
    });
  });

  describe('email getter', () => {
    it('should return email', () => {
      const contact = ContactInfo.restore({ email: 'test@example.com' });
      expect(contact.email).toBe('test@example.com');
    });

    it('should return undefined when not set', () => {
      const contact = ContactInfo.restore({ phone: '13800138000' });
      expect(contact.email).toBeUndefined();
    });
  });

  describe('phone getter', () => {
    it('should return phone', () => {
      const contact = ContactInfo.restore({ phone: '13800138000' });
      expect(contact.phone).toBe('13800138000');
    });
  });

  describe('wechat getter', () => {
    it('should return wechat', () => {
      const contact = ContactInfo.restore({ wechat: 'test_user' });
      expect(contact.wechat).toBe('test_user');
    });
  });

  describe('alipay getter', () => {
    it('should return alipay', () => {
      const contact = ContactInfo.restore({ alipay: 'test_account' });
      expect(contact.alipay).toBe('test_account');
    });
  });
});
