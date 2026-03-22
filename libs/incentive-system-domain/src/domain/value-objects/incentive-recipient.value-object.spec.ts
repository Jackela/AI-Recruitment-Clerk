import { IncentiveRecipient } from './incentive-recipient.value-object';
import { ContactInfo } from './contact-info.value-object';
import { VerificationStatus } from '../aggregates/incentive.aggregate';

describe('IncentiveRecipient', () => {
  describe('create', () => {
    it('should create incentive recipient with pending verification status', () => {
      const contactInfo = ContactInfo.create('test@example.com');
      const recipient = IncentiveRecipient.create('192.168.1.1', contactInfo);

      expect(recipient.getIP()).toBe('192.168.1.1');
      expect(recipient.hasValidContactInfo()).toBe(true);
      expect(recipient.isValid()).toBe(true);
    });

    it('should create recipient with valid IP', () => {
      const contactInfo = ContactInfo.create('user@example.com');
      const recipient = IncentiveRecipient.create('10.0.0.1', contactInfo);

      expect(recipient.getIP()).toBe('10.0.0.1');
    });
  });

  describe('restore', () => {
    it('should restore incentive recipient from data', () => {
      const data = {
        ip: '192.168.1.100',
        contactInfo: { email: 'restored@example.com' },
        verificationStatus: VerificationStatus.VERIFIED,
      };

      const recipient = IncentiveRecipient.restore(data);

      expect(recipient.getIP()).toBe('192.168.1.100');
    });

    it('should restore with pending status', () => {
      const data = {
        ip: '172.16.0.1',
        contactInfo: { phone: '+1234567890' },
        verificationStatus: VerificationStatus.PENDING,
      };

      const recipient = IncentiveRecipient.restore(data);
      expect(recipient.isValid()).toBe(true);
    });
  });

  describe('hasValidContactInfo', () => {
    it('should return true for valid contact info', () => {
      const contactInfo = ContactInfo.create('valid@example.com');
      const recipient = IncentiveRecipient.create('192.168.1.1', contactInfo);

      expect(recipient.hasValidContactInfo()).toBe(true);
    });

    it('should return false for invalid contact info', () => {
      const contactInfo = ContactInfo.create('invalid-email');
      const recipient = IncentiveRecipient.create('192.168.1.1', contactInfo);

      expect(recipient.hasValidContactInfo()).toBe(false);
    });
  });

  describe('isValid', () => {
    it('should return true for valid recipient', () => {
      const contactInfo = ContactInfo.create('valid@example.com');
      const recipient = IncentiveRecipient.create('192.168.1.1', contactInfo);

      expect(recipient.isValid()).toBe(true);
    });

    it('should return false for invalid IP', () => {
      const contactInfo = ContactInfo.create('valid@example.com');
      const recipient = IncentiveRecipient.create('invalid-ip', contactInfo);

      expect(recipient.isValid()).toBe(false);
    });

    it('should return false for invalid contact info', () => {
      const contactInfo = ContactInfo.create('not-an-email');
      const recipient = IncentiveRecipient.create('192.168.1.1', contactInfo);

      expect(recipient.isValid()).toBe(false);
    });
  });

  describe('getValidationErrors', () => {
    it('should return empty array for valid recipient', () => {
      const contactInfo = ContactInfo.create('valid@example.com');
      const recipient = IncentiveRecipient.create('192.168.1.1', contactInfo);

      expect(recipient.getValidationErrors()).toHaveLength(0);
    });

    it('should return error for invalid IP format', () => {
      const contactInfo = ContactInfo.create('valid@example.com');
      const recipient = IncentiveRecipient.create(
        '999.999.999.999',
        contactInfo,
      );

      const errors = recipient.getValidationErrors();
      expect(errors).toContain('Valid IP address is required');
    });

    it('should return error for empty IP', () => {
      const contactInfo = ContactInfo.create('valid@example.com');
      const recipient = IncentiveRecipient.create('', contactInfo);

      const errors = recipient.getValidationErrors();
      expect(errors).toContain('Valid IP address is required');
    });

    it('should return error for invalid contact info', () => {
      const contactInfo = ContactInfo.create('invalid');
      const recipient = IncentiveRecipient.create('192.168.1.1', contactInfo);

      const errors = recipient.getValidationErrors();
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return multiple errors for invalid IP and contact info', () => {
      const contactInfo = ContactInfo.create('invalid');
      const recipient = IncentiveRecipient.create('bad-ip', contactInfo);

      const errors = recipient.getValidationErrors();
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('IP address validation', () => {
    const validIPs = [
      '192.168.1.1',
      '10.0.0.1',
      '172.16.0.1',
      '255.255.255.255',
      '0.0.0.0',
    ];

    validIPs.forEach((ip) => {
      it(`should accept valid IP: ${ip}`, () => {
        const contactInfo = ContactInfo.create('test@example.com');
        const recipient = IncentiveRecipient.create(ip, contactInfo);

        expect(recipient.isValid()).toBe(true);
      });
    });

    const invalidIPs = [
      'invalid',
      '192.168.1',
      'abc.def.ghi.jkl',
      '',
      '192.168.1.256',
    ];

    invalidIPs.forEach((ip) => {
      it(`should reject invalid IP: ${ip}`, () => {
        const contactInfo = ContactInfo.create('test@example.com');
        const recipient = IncentiveRecipient.create(ip, contactInfo);

        expect(recipient.isValid()).toBe(false);
      });
    });
  });
});
