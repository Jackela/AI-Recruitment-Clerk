import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { PatternValidatorDirective } from './pattern-validator.directive';

describe('PatternValidatorDirective', () => {
  let directive: PatternValidatorDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PatternValidatorDirective],
    });

    directive = new PatternValidatorDirective();
  });

  it('should create', () => {
    expect(directive).toBeTruthy();
  });

  describe('String Pattern', () => {
    beforeEach(() => {
      directive.arcPattern = '^[a-z]+$';
    });

    it('should return null for empty value', () => {
      const control = new FormControl('');
      const result = directive.validate(control);
      expect(result).toBeNull();
    });

    it('should return null for null value', () => {
      const control = new FormControl(null);
      const result = directive.validate(control);
      expect(result).toBeNull();
    });

    it('should return null for undefined value', () => {
      const control = new FormControl(undefined);
      const result = directive.validate(control);
      expect(result).toBeNull();
    });

    it('should return null for valid pattern match', () => {
      const control = new FormControl('abc');
      const result = directive.validate(control);
      expect(result).toBeNull();
    });

    it('should return error for invalid pattern', () => {
      const control = new FormControl('ABC123');
      const result = directive.validate(control);
      expect(result).toEqual({
        pattern: {
          message: '输入格式不正确',
          actualValue: 'ABC123',
          requiredPattern: '^[a-z]+$',
        },
      });
    });

    it('should handle numbers in pattern', () => {
      const control = new FormControl('123');
      const result = directive.validate(control);
      expect(result).toEqual({
        pattern: {
          message: '输入格式不正确',
          actualValue: '123',
          requiredPattern: '^[a-z]+$',
        },
      });
    });
  });

  describe('RegExp Pattern', () => {
    beforeEach(() => {
      directive.arcPattern = /^\d{4}-\d{2}-\d{2}$/;
    });

    it('should return null for valid date format', () => {
      const control = new FormControl('2024-03-15');
      const result = directive.validate(control);
      expect(result).toBeNull();
    });

    it('should return error for invalid date format', () => {
      const control = new FormControl('15-03-2024');
      const result = directive.validate(control);
      expect(result).toEqual({
        pattern: {
          message: '输入格式不正确',
          actualValue: '15-03-2024',
          requiredPattern: '/^\\d{4}-\\d{2}-\\d{2}$/',
        },
      });
    });
  });

  describe('No Pattern', () => {
    it('should return null when pattern is not set', () => {
      directive.arcPattern = undefined as unknown as string;
      const control = new FormControl('any value');
      const result = directive.validate(control);
      expect(result).toBeNull();
    });
  });

  describe('Custom Error Message', () => {
    it('should use custom error message', () => {
      directive.arcPattern = '^[a-z]+$';
      directive.patternMessage = '只能输入小写字母';

      const control = new FormControl('ABC');
      const result = directive.validate(control);

      expect(result).toEqual({
        pattern: {
          message: '只能输入小写字母',
          actualValue: 'ABC',
          requiredPattern: '^[a-z]+$',
        },
      });
    });
  });

  describe('Common Patterns', () => {
    it('should validate email pattern', () => {
      directive.arcPattern =
        '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';

      const validEmail = new FormControl('test@example.com');
      expect(directive.validate(validEmail)).toBeNull();

      const invalidEmail = new FormControl('invalid-email');
      const result = directive.validate(invalidEmail);
      expect(result).toBeTruthy();
      expect(result?.pattern).toBeTruthy();
    });

    it('should validate phone pattern', () => {
      directive.arcPattern = '^1[3-9]\\d{9}$';

      const validPhone = new FormControl('13800138000');
      expect(directive.validate(validPhone)).toBeNull();

      const invalidPhone = new FormControl('123456');
      const result = directive.validate(invalidPhone);
      expect(result).toBeTruthy();
    });

    it('should validate URL pattern', () => {
      directive.arcPattern = '^https?://.*$';

      const validUrl = new FormControl('https://example.com');
      expect(directive.validate(validUrl)).toBeNull();

      const invalidUrl = new FormControl('not-a-url');
      const result = directive.validate(invalidUrl);
      expect(result).toBeTruthy();
    });

    it('should validate alphanumeric pattern', () => {
      directive.arcPattern = '^[a-zA-Z0-9]+$';

      const valid = new FormControl('abc123');
      expect(directive.validate(valid)).toBeNull();

      const invalid = new FormControl('abc-123');
      const result = directive.validate(invalid);
      expect(result).toBeTruthy();
    });

    it('should validate Chinese characters pattern', () => {
      directive.arcPattern = '^[\u4e00-\u9fa5]+$';

      const valid = new FormControl('中文测试');
      expect(directive.validate(valid)).toBeNull();

      const invalid = new FormControl('Chinese123');
      const result = directive.validate(invalid);
      expect(result).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty pattern string', () => {
      directive.arcPattern = '';
      const control = new FormControl('any value');
      const result = directive.validate(control);
      expect(result).toBeNull();
    });

    it('should handle pattern with special characters', () => {
      directive.arcPattern = '^[\\w\\-\\.]+$';

      const valid = new FormControl('test_file-name.txt');
      expect(directive.validate(valid)).toBeNull();
    });

    it('should handle very long input', () => {
      directive.arcPattern = '^[a-z]+$';

      const longInput = 'a'.repeat(1000);
      const control = new FormControl(longInput);
      const result = directive.validate(control);
      expect(result).toBeNull();
    });

    it('should handle whitespace-only input with pattern', () => {
      directive.arcPattern = '^[a-z]+$';

      const whitespace = new FormControl('   ');
      const result = directive.validate(whitespace);
      expect(result).toBeTruthy();
    });
  });

  describe('Integration with FormControl', () => {
    it('should work with FormControl validators array', () => {
      directive.arcPattern = '^[a-z]+$';

      const control = new FormControl('', [
        Validators.required,
        directive.validate.bind(directive),
      ]);

      control.setValue('');
      expect(control.invalid).toBe(true);

      control.setValue('ABC');
      expect(control.invalid).toBe(true);
      expect(control.errors?.pattern).toBeTruthy();

      control.setValue('abc');
      expect(control.valid).toBe(true);
    });
  });
});
