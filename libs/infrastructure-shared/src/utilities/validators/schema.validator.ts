/**
 * Schema Validator
 *
 * Schema validator for validating objects against a schema definition.
 *
 * Supports:
 * - Type validation
 * - Required field checking
 * - String length validation
 * - Number range validation
 * - Pattern matching
 * - Enum value validation
 * - Nested object validation
 * - Array item validation
 *
 * @module infrastructure-shared/utilities/validators/schema.validator
 */

import type {
  SchemaDefinition,
  ValidationOptions,
  ValidationResult,
} from './validation.types.js';

/**
 * Schema validator for validating objects against a schema definition.
 */
export class SchemaValidator {
  /**
   * Validates an object against a schema definition.
   *
   * @param data - The data to validate
   * @param schema - The schema definition
   * @param options - Validation options
   * @returns ValidationResult with isValid flag and error messages
   *
   * @example
   * ```typescript
   * const userSchema: SchemaDefinition = {
   *   type: 'object',
   *   properties: {
   *     email: { type: 'string', required: true, pattern: EmailValidator.EMAIL_REGEX },
   *     age: { type: 'number', required: true, minimum: 18, maximum: 100 },
   *     role: { type: 'string', required: true, allowedValues: ['admin', 'user'] }
   *   }
   * };
   *
   * const result = SchemaValidator.validate({ email: 'test@example.com', age: 25, role: 'user' }, userSchema);
   * ```
   */
  public static validate(
    data: unknown,
    schema: SchemaDefinition,
    options: ValidationOptions = {},
  ): ValidationResult {
    const { errorPrefix = 'Validation' } = options;

    // Check if data exists
    if (data === null || data === undefined) {
      return {
        isValid: false,
        errors: [`${errorPrefix}: Data is required`],
      };
    }

    // Validate based on schema type
    return this.validateValue(data, schema, errorPrefix);
  }

  /**
   * Validates a value against a schema definition.
   *
   * @param value - The value to validate
   * @param schema - The schema definition
   * @param path - The property path for error messages
   * @returns ValidationResult
   */
  private static validateValue(
    value: unknown,
    schema: SchemaDefinition,
    path: string,
  ): ValidationResult {
    const errors: string[] = [];

    // Check required fields
    if (
      schema.required &&
      (value === null || value === undefined || value === '')
    ) {
      errors.push(`${path} is required`);
      return { isValid: false, errors };
    }

    // Skip validation if value is empty and not required
    if (!schema.required && (value === null || value === undefined)) {
      return { isValid: true, errors: [] };
    }

    // Type validation
    const typeError = this.validateType(value, schema, path);
    if (typeError) {
      errors.push(typeError);
      return { isValid: false, errors };
    }

    // String-specific validations
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path} must be at least ${schema.minLength} characters`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`${path} must not exceed ${schema.maxLength} characters`);
      }
      if (schema.pattern && !schema.pattern.test(value)) {
        errors.push(`${path} does not match the required pattern`);
      }
    }

    // Number-specific validations
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path} must be at least ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path} must not exceed ${schema.maximum}`);
      }
    }

    // Enum validation
    if (schema.allowedValues && !schema.allowedValues.includes(value)) {
      errors.push(
        `${path} must be one of: ${schema.allowedValues.join(', ')}`,
      );
    }

    // Object validation
    if (
      schema.type === 'object' &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const objErrors = this.validateObject(
        value as Record<string, unknown>,
        schema.properties,
        path,
      );
      errors.push(...objErrors);
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path} must have at least ${schema.minLength} items`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`${path} must not have more than ${schema.maxLength} items`);
      }
      if (schema.items !== undefined) {
        const itemSchema = schema.items;
        value.forEach((item, index) => {
          const itemResult = this.validateValue(
            item,
            itemSchema,
            `${path}[${index}]`,
          );
          errors.push(...itemResult.errors);
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates the type of a value.
   *
   * @param value - The value to check
   * @param schema - The schema definition
   * @param path - The property path
   * @returns Error message or null if type is valid
   */
  private static validateType(
    value: unknown,
    schema: SchemaDefinition,
    path: string,
  ): string | null {
    if (schema.type === 'any') {
      return null;
    }

    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== schema.type) {
      return `${path} must be of type ${schema.type}, got ${actualType}`;
    }

    return null;
  }

  /**
   * Validates an object against properties schema.
   *
   * @param obj - The object to validate
   * @param properties - The properties schema
   * @param path - The property path
   * @returns Array of error messages
   */
  private static validateObject(
    obj: Record<string, unknown>,
    properties: Record<string, SchemaDefinition> | undefined,
    path: string,
  ): string[] {
    const errors: string[] = [];

    if (!properties) {
      return errors;
    }

    for (const [key, propSchema] of Object.entries(properties)) {
      const value = obj[key];
      const result = this.validateValue(value, propSchema, `${path}.${key}`);
      errors.push(...result.errors);
    }

    return errors;
  }

  /**
   * Creates a schema validator function for a specific schema.
   *
   * @param schema - The schema definition
   * @param options - Validation options
   * @returns A validation function
   *
   * @example
   * ```typescript
   * const validateUser = SchemaValidator.validatorFor(userSchema);
   * const result = validateUser(userData);
   * ```
   */
  public static validatorFor(
    schema: SchemaDefinition,
    options?: ValidationOptions,
  ): (data: unknown) => ValidationResult {
    return (data: unknown) => this.validate(data, schema, options);
  }
}
