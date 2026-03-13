import { Validator } from './validator';

describe('Validator', () => {
  describe('required', () => {
    it('should validate non-empty string', () => {
      const result = Validator.required('value', 'Field');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate number', () => {
      const result = Validator.required(0, 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should validate boolean false', () => {
      const result = Validator.required(false, 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should reject null', () => {
      const result = Validator.required(null, 'Field');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field is required');
    });

    it('should reject undefined', () => {
      const result = Validator.required(undefined, 'Field');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field is required');
    });

    it('should reject empty string', () => {
      const result = Validator.required('', 'Field');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field is required');
    });

    it('should use default field name', () => {
      const result = Validator.required(null);
      expect(result.errors).toContain('Field is required');
    });
  });

  describe('validateLength', () => {
    it('should validate string within range', () => {
      const result = Validator.validateLength('abc', 2, 5, 'Name');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject string shorter than minLength', () => {
      const result = Validator.validateLength('ab', 3, 10, 'Password');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 3 characters');
    });

    it('should reject string longer than maxLength', () => {
      const result = Validator.validateLength('abcdefghij', 2, 5, 'Username');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Username must not exceed 5 characters');
    });

    it('should validate with only minLength', () => {
      const result = Validator.validateLength('abc', 2, undefined, 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should validate with only maxLength', () => {
      const result = Validator.validateLength('abc', undefined, 5, 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should pass both constraints', () => {
      const result = Validator.validateLength('abc', 2, 5, 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should fail both constraints', () => {
      const result = Validator.validateLength('a', 3, 10, 'Field');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('at least 3');
    });
  });

  describe('range', () => {
    it('should validate number within range', () => {
      const result = Validator.range(50, 0, 100, 'Age');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject number less than min', () => {
      const result = Validator.range(17, 18, 100, 'Age');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Age must be at least 18');
    });

    it('should reject number greater than max', () => {
      const result = Validator.range(101, 0, 100, 'Score');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Score must not exceed 100');
    });

    it('should validate with only min', () => {
      const result = Validator.range(10, 5, undefined, 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should validate with only max', () => {
      const result = Validator.range(10, undefined, 15, 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should pass both constraints', () => {
      const result = Validator.range(50, 0, 100, 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should fail both constraints', () => {
      const result = Validator.range(5, 10, 100, 'Field');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('at least 10');
    });
  });

  describe('pattern', () => {
    it('should validate matching pattern', () => {
      const result = Validator.pattern('abc123', /^[a-z0-9]+$/, 'Code');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-matching pattern', () => {
      const result = Validator.pattern('abc-123', /^[a-z0-9]+$/, 'Code');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Code format is invalid');
    });

    it('should use default field name', () => {
      const result = Validator.pattern('abc', /^\d+$/);
      expect(result.errors).toContain('Field format is invalid');
    });
  });

  describe('oneOf', () => {
    it('should validate value in allowed list', () => {
      const result = Validator.oneOf(
        'admin',
        ['admin', 'user', 'guest'],
        'Role',
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject value not in allowed list', () => {
      const result = Validator.oneOf('superadmin', ['admin', 'user'], 'Role');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Role must be one of: admin, user');
    });

    it('should validate number in allowed list', () => {
      const result = Validator.oneOf(2, [1, 2, 3], 'Priority');
      expect(result.isValid).toBe(true);
    });

    it('should use default field name', () => {
      const result = Validator.oneOf('invalid', ['a', 'b']);
      expect(result.errors).toContain('Field must be one of: a, b');
    });
  });

  describe('combine', () => {
    it('should combine multiple validators', () => {
      const validators = [
        (v: unknown) => Validator.required(v, 'Email'),
        (v: unknown) =>
          Validator.pattern(v as string, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email'),
      ];
      const combined = Validator.combine(validators);

      const result = combined('test@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should collect all errors from validators', () => {
      const validators = [
        (v: unknown) => Validator.required(v, 'Field'),
        (v: unknown) => Validator.validateLength(v as string, 5, 10, 'Field'),
      ];
      const combined = Validator.combine(validators);

      const result = combined('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should return valid when all validators pass', () => {
      const validators = [
        (v: unknown) => Validator.required(v, 'Name'),
        (v: unknown) => Validator.validateLength(v as string, 2, 50, 'Name'),
      ];
      const combined = Validator.combine(validators);

      const result = combined('John Doe');
      expect(result.isValid).toBe(true);
    });

    it('should stop on first error if configured', () => {
      const validators = [
        (v: unknown) => Validator.required(v, 'Field'),
        (v: unknown) => Validator.validateLength(v as string, 10, 20, 'Field'),
      ];
      const combined = Validator.combine(validators);

      const result = combined('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty validator array', () => {
      const combined = Validator.combine([]);
      const result = combined('any value');
      expect(result.isValid).toBe(true);
    });

    it('should handle single validator', () => {
      const combined = Validator.combine([
        (v: unknown) => Validator.required(v, 'Field'),
      ]);
      const result = combined('value');
      expect(result.isValid).toBe(true);
    });
  });
});
