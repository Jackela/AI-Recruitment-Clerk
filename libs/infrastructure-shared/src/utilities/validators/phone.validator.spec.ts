import { PhoneValidator } from './phone.validator';

describe('PhoneValidator', () => {
  describe('validate', () => {
    describe('basic validation', () => {
      it('should validate Chinese mobile number', () => {
        const result = PhoneValidator.validate('13812345678');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty phone', () => {
        const result = PhoneValidator.validate('');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Phone number is required');
      });

      it('should reject null phone', () => {
        const result = PhoneValidator.validate(null);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Phone number is required');
      });

      it('should reject undefined phone', () => {
        const result = PhoneValidator.validate(undefined);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Phone number is required');
      });

      it('should allow empty phone when allowEmpty is true', () => {
        const result = PhoneValidator.validate('', { allowEmpty: true });
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-string phone', () => {
        const result = PhoneValidator.validate(1234567890);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Phone number must be a string');
      });
    });

    describe('Chinese phone validation', () => {
      it('should validate phone starting with 13x', () => {
        const result = PhoneValidator.validate('13812345678', {
          allowedFormats: ['CN'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should validate phone starting with 15x', () => {
        const result = PhoneValidator.validate('15012345678', {
          allowedFormats: ['CN'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should validate phone starting with 18x', () => {
        const result = PhoneValidator.validate('18812345678', {
          allowedFormats: ['CN'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject phone starting with 12x', () => {
        const result = PhoneValidator.validate('12012345678', {
          allowedFormats: ['CN'],
        });
        expect(result.isValid).toBe(false);
      });

      it('should reject phone with 10 digits', () => {
        const result = PhoneValidator.validate('1381234567', {
          allowedFormats: ['CN'],
        });
        expect(result.isValid).toBe(false);
      });

      it('should reject phone with 12 digits', () => {
        const result = PhoneValidator.validate('138123456789', {
          allowedFormats: ['CN'],
        });
        expect(result.isValid).toBe(false);
      });
    });

    describe('US phone validation', () => {
      it('should validate US phone with parentheses', () => {
        const result = PhoneValidator.validate('(123) 456-7890', {
          allowedFormats: ['US'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should validate US phone with dashes', () => {
        const result = PhoneValidator.validate('123-456-7890', {
          allowedFormats: ['US'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should validate US phone with spaces', () => {
        const result = PhoneValidator.validate('123 456 7890', {
          allowedFormats: ['US'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should validate US phone with country code', () => {
        const result = PhoneValidator.validate('+1 123-456-7890', {
          allowedFormats: ['US'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid US phone', () => {
        const result = PhoneValidator.validate('123-45-6789', {
          allowedFormats: ['US'],
        });
        expect(result.isValid).toBe(false);
      });
    });

    describe('International phone validation', () => {
      it('should validate international phone with +', () => {
        const result = PhoneValidator.validate('+1234567890', {
          allowedFormats: ['INTL'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should validate international phone without +', () => {
        const result = PhoneValidator.validate('1234567890', {
          allowedFormats: ['INTL'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject phone with less than 7 digits', () => {
        const result = PhoneValidator.validate('+123456', {
          allowedFormats: ['INTL'],
        });
        expect(result.isValid).toBe(false);
      });

      it('should reject phone with more than 15 digits', () => {
        const result = PhoneValidator.validate('+1234567890123456', {
          allowedFormats: ['INTL'],
        });
        expect(result.isValid).toBe(false);
      });
    });

    describe('extension handling', () => {
      it('should allow phone with extension when allowed', () => {
        const result = PhoneValidator.validate('123-456-7890 ext. 123', {
          allowedFormats: ['US'],
          allowExtensions: true,
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject phone with extension when not allowed', () => {
        const result = PhoneValidator.validate('123-456-7890 ext. 123', {
          allowedFormats: ['US'],
          allowExtensions: false,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Phone number extensions are not allowed',
        );
      });

      it('should handle x format extension', () => {
        const result = PhoneValidator.validate('123-456-7890 x123', {
          allowedFormats: ['US'],
          allowExtensions: true,
        });
        expect(result.isValid).toBe(true);
      });
    });

    describe('custom error prefix', () => {
      it('should use custom error prefix', () => {
        const result = PhoneValidator.validate('', {
          errorPrefix: 'Mobile Number',
        });
        expect(result.errors).toContain('Mobile Number is required');
      });
    });
  });

  describe('format', () => {
    describe('CN format', () => {
      it('should format Chinese phone', () => {
        const result = PhoneValidator.format('13812345678', 'CN');
        expect(result).toBe('138 1234 5678');
      });

      it('should return original if not 11 digits', () => {
        const result = PhoneValidator.format('1234567', 'CN');
        expect(result).toBe('1234567');
      });

      it('should return original if not starting with 1', () => {
        const result = PhoneValidator.format('23812345678', 'CN');
        expect(result).toBe('238 1234 5678');
      });
    });

    describe('US format', () => {
      it('should format US phone as (XXX) XXX-XXXX', () => {
        const result = PhoneValidator.format('1234567890', 'US');
        expect(result).toBe('(123) 456-7890');
      });

      it('should format US phone with country code', () => {
        const result = PhoneValidator.format('11234567890', 'US');
        expect(result).toBe('+1 (123) 456-7890');
      });

      it('should return original if not 10 or 11 digits', () => {
        const result = PhoneValidator.format('1234567', 'US');
        expect(result).toBe('1234567');
      });
    });

    describe('INTL format', () => {
      it('should add + prefix if missing', () => {
        const result = PhoneValidator.format('1234567890', 'INTL');
        expect(result).toBe('+1234567890');
      });

      it('should keep + prefix if present', () => {
        const result = PhoneValidator.format('+1234567890', 'INTL');
        expect(result).toBe('+1234567890');
      });
    });

    describe('default format', () => {
      it('should default to INTL format', () => {
        const result = PhoneValidator.format('1234567890');
        expect(result).toBe('+1234567890');
      });
    });
  });

  describe('extractCountryCode', () => {
    it('should extract country code from +1', () => {
      const result = PhoneValidator.extractCountryCode('+1234567890');
      expect(result).toBe('1');
    });

    it('should extract country code from +86', () => {
      const result = PhoneValidator.extractCountryCode('+8613812345678');
      expect(result).toBe('86');
    });

    it('should return null for phone without +', () => {
      const result = PhoneValidator.extractCountryCode('1234567890');
      expect(result).toBeNull();
    });

    it('should extract country code with 3 digits', () => {
      const result = PhoneValidator.extractCountryCode('+1234567890');
      expect(result).toBe('123');
    });
  });
});
