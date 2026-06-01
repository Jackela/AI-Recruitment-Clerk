import { IdValidator } from './id.validator';

describe('IdValidator', () => {
  describe('validate', () => {
    describe('basic validation', () => {
      it('should validate non-empty string', () => {
        const result = IdValidator.validate('some-id');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty id', () => {
        const result = IdValidator.validate('');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID is required');
      });

      it('should reject null id', () => {
        const result = IdValidator.validate(null);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID is required');
      });

      it('should reject undefined id', () => {
        const result = IdValidator.validate(undefined);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID is required');
      });

      it('should allow empty id when allowEmpty is true', () => {
        const result = IdValidator.validate('', { allowEmpty: true });
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-string id', () => {
        const result = IdValidator.validate(123);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID must be a string');
      });
    });

    describe('UUID validation', () => {
      it('should validate UUID v4', () => {
        const result = IdValidator.validate(
          '550e8400-e29b-41d4-a716-446655440000',
          {
            format: 'UUID',
          },
        );
        expect(result.isValid).toBe(true);
      });

      it('should validate lowercase UUID', () => {
        const result = IdValidator.validate(
          '550e8400-e29b-41d4-a716-446655440000',
          {
            format: 'UUID',
          },
        );
        expect(result.isValid).toBe(true);
      });

      it('should validate uppercase UUID', () => {
        const result = IdValidator.validate(
          '550E8400-E29B-41D4-A716-446655440000',
          {
            format: 'UUID',
          },
        );
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid UUID format', () => {
        const result = IdValidator.validate('not-a-uuid', {
          format: 'UUID',
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID must be a valid UUID v4');
      });

      it('should reject UUID with wrong version', () => {
        const result = IdValidator.validate(
          '550e8400-e29b-11d4-a716-446655440000',
          {
            format: 'UUID',
          },
        );
        expect(result.isValid).toBe(false);
      });
    });

    describe('MongoDB ObjectId validation', () => {
      it('should validate valid ObjectId', () => {
        const result = IdValidator.validate('507f1f77bcf86cd799439011', {
          format: 'MONGO_ID',
        });
        expect(result.isValid).toBe(true);
      });

      it('should validate ObjectId with uppercase', () => {
        const result = IdValidator.validate('507F1F77BCF86CD799439011', {
          format: 'MONGO_ID',
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject ObjectId with 23 characters', () => {
        const result = IdValidator.validate('507f1f77bcf86cd79943901', {
          format: 'MONGO_ID',
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID must be a valid MongoDB ObjectId');
      });

      it('should reject ObjectId with 25 characters', () => {
        const result = IdValidator.validate('507f1f77bcf86cd7994390111', {
          format: 'MONGO_ID',
        });
        expect(result.isValid).toBe(false);
      });

      it('should reject ObjectId with non-hex characters', () => {
        const result = IdValidator.validate('507f1f77bcf86cd79943901g', {
          format: 'MONGO_ID',
        });
        expect(result.isValid).toBe(false);
      });
    });

    describe('numeric validation', () => {
      it('should validate numeric id', () => {
        const result = IdValidator.validate('12345', {
          format: 'NUMERIC',
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject alphanumeric as numeric', () => {
        const result = IdValidator.validate('123abc', {
          format: 'NUMERIC',
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID must contain only digits');
      });

      it('should reject empty string as numeric', () => {
        const result = IdValidator.validate('', {
          format: 'NUMERIC',
        });
        expect(result.isValid).toBe(false);
      });
    });

    describe('alphanumeric validation', () => {
      it('should validate alphanumeric id', () => {
        const result = IdValidator.validate('user_123-abc', {
          format: 'ALPHANUMERIC',
        });
        expect(result.isValid).toBe(true);
      });

      it('should validate id with underscore', () => {
        const result = IdValidator.validate('user_name', {
          format: 'ALPHANUMERIC',
        });
        expect(result.isValid).toBe(true);
      });

      it('should validate id with hyphen', () => {
        const result = IdValidator.validate('user-name', {
          format: 'ALPHANUMERIC',
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject id with special characters', () => {
        const result = IdValidator.validate('user@name', {
          format: 'ALPHANUMERIC',
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'ID must contain only letters, numbers, underscores, and hyphens',
        );
      });
    });

    describe('custom pattern validation', () => {
      it('should validate with custom pattern', () => {
        const result = IdValidator.validate('USER_123', {
          format: 'CUSTOM',
          customPattern: /^[A-Z]+_\d+$/,
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject when custom pattern fails', () => {
        const result = IdValidator.validate('user_123', {
          format: 'CUSTOM',
          customPattern: /^[A-Z]+_\d+$/,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID format is invalid');
      });
    });

    describe('length validation', () => {
      it('should validate minLength', () => {
        const result = IdValidator.validate('ab', {
          minLength: 3,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID must be at least 3 characters');
      });

      it('should validate maxLength', () => {
        const result = IdValidator.validate('abcdefghij', {
          maxLength: 5,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID must not exceed 5 characters');
      });

      it('should validate both min and max length', () => {
        const result = IdValidator.validate('abc', {
          minLength: 2,
          maxLength: 5,
        });
        expect(result.isValid).toBe(true);
      });

      it('should pass length validation', () => {
        const result = IdValidator.validate('abcd', {
          minLength: 3,
          maxLength: 5,
        });
        expect(result.isValid).toBe(true);
      });
    });

    describe('custom error prefix', () => {
      it('should use custom error prefix', () => {
        const result = IdValidator.validate('', {
          errorPrefix: 'User ID',
        });
        expect(result.errors).toContain('User ID is required');
      });
    });
  });

  describe('isUUID', () => {
    it('should return true for valid UUID', () => {
      const result = IdValidator.isUUID('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      const result = IdValidator.isUUID('not-a-uuid');
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = IdValidator.isUUID('');
      expect(result).toBe(false);
    });
  });

  describe('isMongoId', () => {
    it('should return true for valid ObjectId', () => {
      const result = IdValidator.isMongoId('507f1f77bcf86cd799439011');
      expect(result).toBe(true);
    });

    it('should return false for invalid ObjectId', () => {
      const result = IdValidator.isMongoId('not-an-objectid');
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = IdValidator.isMongoId('');
      expect(result).toBe(false);
    });
  });
});
