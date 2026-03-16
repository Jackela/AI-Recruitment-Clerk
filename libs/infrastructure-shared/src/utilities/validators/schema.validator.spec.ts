import { SchemaValidator } from './schema.validator';
import type { SchemaDefinition } from './validation.types';

describe('SchemaValidator', () => {
  describe('validate', () => {
    it('should return error when data is null', () => {
      const schema: SchemaDefinition = { type: 'object', properties: {} };
      const result = SchemaValidator.validate(null, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation: Data is required');
    });

    it('should return error when data is undefined', () => {
      const schema: SchemaDefinition = { type: 'object', properties: {} };
      const result = SchemaValidator.validate(undefined, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation: Data is required');
    });

    it('should validate simple object', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
        },
      };
      const result = SchemaValidator.validate({ name: 'John' }, schema);
      expect(result.isValid).toBe(true);
    });

    describe('string validation', () => {
      const stringSchema: SchemaDefinition = {
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
        },
      };

      it('should validate required string', () => {
        const result = SchemaValidator.validate({ name: 'John' }, stringSchema);
        expect(result.isValid).toBe(true);
      });

      it('should reject missing required string', () => {
        const result = SchemaValidator.validate({}, stringSchema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Validation.name is required');
      });

      it('should reject null for required string', () => {
        const result = SchemaValidator.validate({ name: null }, stringSchema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Validation.name is required');
      });

      it('should validate string with minLength', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            name: { type: 'string', required: true, minLength: 3 },
          },
        };
        const result = SchemaValidator.validate({ name: 'ab' }, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Validation.name must be at least 3 characters',
        );
      });

      it('should validate string with maxLength', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            name: { type: 'string', required: true, maxLength: 5 },
          },
        };
        const result = SchemaValidator.validate({ name: 'John Doe' }, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Validation.name must not exceed 5 characters',
        );
      });

      it('should validate string with pattern', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              required: true,
              pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            },
          },
        };
        const result = SchemaValidator.validate({ email: 'invalid' }, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Validation.email does not match the required pattern',
        );
      });
    });

    describe('number validation', () => {
      const numberSchema: SchemaDefinition = {
        type: 'object',
        properties: {
          age: { type: 'number', required: true },
        },
      };

      it('should validate required number', () => {
        const result = SchemaValidator.validate({ age: 25 }, numberSchema);
        expect(result.isValid).toBe(true);
      });

      it('should reject string for number type', () => {
        const result = SchemaValidator.validate({ age: '25' }, numberSchema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Validation.age must be of type number, got string',
        );
      });

      it('should validate number with minimum', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            age: { type: 'number', required: true, minimum: 18 },
          },
        };
        const result = SchemaValidator.validate({ age: 16 }, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Validation.age must be at least 18');
      });

      it('should validate number with maximum', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            age: { type: 'number', required: true, maximum: 100 },
          },
        };
        const result = SchemaValidator.validate({ age: 120 }, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Validation.age must not exceed 100');
      });
    });

    describe('boolean validation', () => {
      it('should validate boolean', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            active: { type: 'boolean', required: true },
          },
        };
        const result = SchemaValidator.validate({ active: true }, schema);
        expect(result.isValid).toBe(true);
      });

      it('should reject non-boolean for boolean type', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            active: { type: 'boolean', required: true },
          },
        };
        const result = SchemaValidator.validate({ active: 'true' }, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Validation.active must be of type boolean, got string',
        );
      });
    });

    describe('array validation', () => {
      it('should validate array', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            tags: { type: 'array', required: true },
          },
        };
        const result = SchemaValidator.validate({ tags: ['a', 'b'] }, schema);
        expect(result.isValid).toBe(true);
      });

      it('should validate array with minLength', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            tags: { type: 'array', required: true, minLength: 2 },
          },
        };
        const result = SchemaValidator.validate({ tags: ['a'] }, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Validation.tags must have at least 2 items');
      });

      it('should validate array with maxLength', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            tags: { type: 'array', required: true, maxLength: 3 },
          },
        };
        const result = SchemaValidator.validate(
          { tags: ['a', 'b', 'c', 'd'] },
          schema,
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Validation.tags must not have more than 3 items');
      });

      it('should validate array items', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              required: true,
              items: { type: 'string' },
            },
          },
        };
        const result = SchemaValidator.validate({ tags: [1, 2] }, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Validation.tags[0] must be of type string, got number',
        );
        expect(result.errors).toContain(
          'Validation.tags[1] must be of type string, got number',
        );
      });
    });

    describe('nested object validation', () => {
      it('should validate nested object', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              required: true,
              properties: {
                name: { type: 'string', required: true },
                age: { type: 'number', required: true },
              },
            },
          },
        };
        const result = SchemaValidator.validate(
          { user: { name: 'John', age: 25 } },
          schema,
        );
        expect(result.isValid).toBe(true);
      });

      it('should validate deeply nested object', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            level1: {
              type: 'object',
              properties: {
                level2: {
                  type: 'object',
                  properties: {
                    value: { type: 'string', required: true },
                  },
                },
              },
            },
          },
        };
        const result = SchemaValidator.validate(
          { level1: { level2: { value: 'test' } } },
          schema,
        );
        expect(result.isValid).toBe(true);
      });

      it('should report errors for nested object', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              required: true,
              properties: {
                name: { type: 'string', required: true },
              },
            },
          },
        };
        const result = SchemaValidator.validate(
          { user: { name: null } },
          schema,
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Validation.user.name is required');
      });
    });

    describe('enum validation', () => {
      it('should validate allowed values', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              required: true,
              allowedValues: ['admin', 'user', 'guest'],
            },
          },
        };
        const result = SchemaValidator.validate({ role: 'admin' }, schema);
        expect(result.isValid).toBe(true);
      });

      it('should reject values not in allowed list', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              required: true,
              allowedValues: ['admin', 'user'],
            },
          },
        };
        const result = SchemaValidator.validate({ role: 'superadmin' }, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Validation.role must be one of: admin, user');
      });
    });

    describe('optional fields', () => {
      it('should allow optional fields to be null', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            name: { type: 'string', required: false },
          },
        };
        const result = SchemaValidator.validate({ name: null }, schema);
        expect(result.isValid).toBe(true);
      });

      it('should allow optional fields to be undefined', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            name: { type: 'string', required: false },
          },
        };
        const result = SchemaValidator.validate({}, schema);
        expect(result.isValid).toBe(true);
      });
    });

    describe('any type', () => {
      it('should accept any type for any', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            value: { type: 'any', required: true },
          },
        };
        expect(
          SchemaValidator.validate({ value: 'string' }, schema).isValid,
        ).toBe(true);
        expect(SchemaValidator.validate({ value: 123 }, schema).isValid).toBe(
          true,
        );
        expect(SchemaValidator.validate({ value: true }, schema).isValid).toBe(
          true,
        );
        expect(SchemaValidator.validate({ value: [] }, schema).isValid).toBe(
          true,
        );
        expect(SchemaValidator.validate({ value: {} }, schema).isValid).toBe(
          true,
        );
      });
    });
  });

  describe('validatorFor', () => {
    it('should create reusable validator', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
        },
      };
      const validate = SchemaValidator.validatorFor(schema);

      expect(validate({ name: 'John' }).isValid).toBe(true);
      expect(validate({}).isValid).toBe(false);
    });

    it('should use provided options', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: {},
      };
      const validate = SchemaValidator.validatorFor(schema, {
        errorPrefix: 'CustomPrefix',
      });

      const result = validate(null);
      expect(result.errors).toContain('CustomPrefix: Data is required');
    });
  });
});
