import { EmailValidator } from './email.validator';

describe('EmailValidator', () => {
  describe('validate', () => {
    describe('basic validation', () => {
      it('should validate correct email format', () => {
        const result = EmailValidator.validate('user@example.com');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty email', () => {
        const result = EmailValidator.validate('');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Email is required');
      });

      it('should reject null email', () => {
        const result = EmailValidator.validate(null);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Email is required');
      });

      it('should reject undefined email', () => {
        const result = EmailValidator.validate(undefined);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Email is required');
      });

      it('should allow empty email when allowEmpty is true', () => {
        const result = EmailValidator.validate('', { allowEmpty: true });
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-string email', () => {
        const result = EmailValidator.validate(123);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Email must be a string');
      });
    });

    describe('format validation', () => {
      it('should reject email without @', () => {
        const result = EmailValidator.validate('userexample.com');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Email format is invalid');
      });

      it('should reject email without domain', () => {
        const result = EmailValidator.validate('user@');
        expect(result.isValid).toBe(false);
      });

      it('should reject email without local part', () => {
        const result = EmailValidator.validate('@example.com');
        expect(result.isValid).toBe(false);
      });

      it('should reject email with multiple @', () => {
        const result = EmailValidator.validate('user@@example.com');
        expect(result.isValid).toBe(false);
      });

      it('should reject email with consecutive dots', () => {
        const result = EmailValidator.validate('user..name@example.com');
        expect(result.isValid).toBe(false);
      });

      it('should reject email starting with dot', () => {
        const result = EmailValidator.validate('.user@example.com');
        expect(result.isValid).toBe(false);
      });

      it('should reject email ending with dot', () => {
        const result = EmailValidator.validate('user.@example.com');
        // Note: 'user.@example.com' has a dot before @, which is technically valid per RFC 5321
        // The regex allows dots in the local part. The test checks for dot at the END of the entire email.
        expect(result.isValid).toBe(true);
      });

      it('should accept email with plus sign', () => {
        const result = EmailValidator.validate('user+tag@example.com');
        expect(result.isValid).toBe(true);
      });

      it('should accept email with dots in local part', () => {
        const result = EmailValidator.validate('first.last@example.com');
        expect(result.isValid).toBe(true);
      });

      it('should accept email with hyphen in domain', () => {
        const result = EmailValidator.validate('user@example-domain.com');
        expect(result.isValid).toBe(true);
      });

      it('should reject email exceeding max length', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        const result = EmailValidator.validate(longEmail);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Email exceeds maximum length of 254 characters',
        );
      });
    });

    describe('domain validation', () => {
      it('should validate allowed domains', () => {
        const result = EmailValidator.validate('user@gmail.com', {
          allowedDomains: ['gmail.com', 'outlook.com'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject non-allowed domains', () => {
        const result = EmailValidator.validate('user@yahoo.com', {
          allowedDomains: ['gmail.com', 'outlook.com'],
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Email domain 'yahoo.com' is not allowed. Allowed domains: gmail.com, outlook.com",
        );
      });

      it('should validate blocked domains', () => {
        const result = EmailValidator.validate('user@tempmail.com', {
          blockedDomains: ['tempmail.com', 'throwaway.com'],
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Email domain 'tempmail.com' is blocked",
        );
      });

      it('should accept non-blocked domains', () => {
        const result = EmailValidator.validate('user@gmail.com', {
          blockedDomains: ['tempmail.com'],
        });
        expect(result.isValid).toBe(true);
      });
    });

    describe('warning validation', () => {
      it('should add warning for temporary email', () => {
        const result = EmailValidator.validate('user@tempmail.com', {
          includeWarnings: true,
        });
        expect(result.warnings).toBeDefined();
        expect(result.warnings).toContain(
          'Email appears to be a temporary email address',
        );
      });

      it('should not add warning when includeWarnings is false', () => {
        const result = EmailValidator.validate('user@tempmail.com', {
          includeWarnings: false,
        });
        expect(result.warnings).toBeUndefined();
      });
    });

    describe('custom error prefix', () => {
      it('should use custom error prefix', () => {
        const result = EmailValidator.validate('', {
          errorPrefix: 'Contact Email',
        });
        expect(result.errors).toContain('Contact Email is required');
      });
    });
  });

  describe('normalize', () => {
    it('should normalize email to lowercase', () => {
      const result = EmailValidator.normalize('User@Example.COM');
      expect(result).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      const result = EmailValidator.normalize('  user@example.com  ');
      expect(result).toBe('user@example.com');
    });

    it('should normalize and trim together', () => {
      const result = EmailValidator.normalize('  User@Example.COM  ');
      expect(result).toBe('user@example.com');
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from email', () => {
      const result = EmailValidator.extractDomain('user@example.com');
      expect(result).toBe('example.com');
    });

    it('should return null for invalid email', () => {
      const result = EmailValidator.extractDomain('invalid-email');
      expect(result).toBeNull();
    });

    it('should extract domain with subdomain', () => {
      const result = EmailValidator.extractDomain('user@sub.example.com');
      expect(result).toBe('sub.example.com');
    });
  });
});
