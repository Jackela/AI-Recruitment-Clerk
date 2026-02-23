/**
 * Generic Validator
 *
 * Generic validator for common validation scenarios.
 *
 * @module infrastructure-shared/utilities/validators/validator
 */

import type { ValidationResult } from './validation.types.js';

/**
 * Generic validator for common validation scenarios.
 */
export class Validator {
  /**
   * Validates that a value is not empty.
   *
   * @param value - The value to check
   * @param fieldName - The field name for error messages
   * @returns ValidationResult
   */
  public static required(
    value: unknown,
    fieldName = 'Field',
  ): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return {
        isValid: false,
        errors: [`${fieldName} is required`],
      };
    }
    return { isValid: true, errors: [] };
  }

  /**
   * Validates string length.
   *
   * @param value - The string value
   * @param minLength - Minimum length
   * @param maxLength - Maximum length
   * @param fieldName - The field name for error messages
   * @returns ValidationResult
   */
  public static validateLength(
    value: string,
    minLength: number | undefined,
    maxLength: number | undefined,
    fieldName = 'Field',
  ): ValidationResult {
    const errors: string[] = [];

    if (minLength !== undefined && value.length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters`);
    }

    if (maxLength !== undefined && value.length > maxLength) {
      errors.push(`${fieldName} must not exceed ${maxLength} characters`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates numeric range.
   *
   * @param value - The numeric value
   * @param min - Minimum value
   * @param max - Maximum value
   * @param fieldName - The field name for error messages
   * @returns ValidationResult
   */
  public static range(
    value: number,
    min: number | undefined,
    max: number | undefined,
    fieldName = 'Field',
  ): ValidationResult {
    const errors: string[] = [];

    if (min !== undefined && value < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }

    if (max !== undefined && value > max) {
      errors.push(`${fieldName} must not exceed ${max}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates against a regex pattern.
   *
   * @param value - The string value
   * @param pattern - The regex pattern
   * @param fieldName - The field name for error messages
   * @returns ValidationResult
   */
  public static pattern(
    value: string,
    pattern: RegExp,
    fieldName = 'Field',
  ): ValidationResult {
    if (!pattern.test(value)) {
      return {
        isValid: false,
        errors: [`${fieldName} format is invalid`],
      };
    }
    return { isValid: true, errors: [] };
  }

  /**
   * Validates that a value is one of the allowed values.
   *
   * @param value - The value to check
   * @param allowedValues - Array of allowed values
   * @param fieldName - The field name for error messages
   * @returns ValidationResult
   */
  public static oneOf(
    value: unknown,
    allowedValues: unknown[],
    fieldName = 'Field',
  ): ValidationResult {
    if (!allowedValues.includes(value)) {
      return {
        isValid: false,
        errors: [
          `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        ],
      };
    }
    return { isValid: true, errors: [] };
  }

  /**
   * Combines multiple validators.
   *
   * @param validators - Array of validator functions
   * @returns A combined validator function
   *
   * @example
   * ```typescript
   * const validateEmail = Validator.combine([
   *   (v) => Validator.required(v, 'Email'),
   *   (v) => EmailValidator.validate(v)
   * ]);
   * ```
   */
  public static combine(
    validators: Array<(value: unknown) => ValidationResult>,
  ): (value: unknown) => ValidationResult {
    return (value: unknown) => {
      const allErrors: string[] = [];

      for (const validator of validators) {
        const result = validator(value);
        if (!result.isValid) {
          allErrors.push(...result.errors);
        }
      }

      return {
        isValid: allErrors.length === 0,
        errors: allErrors,
      };
    };
  }
}
