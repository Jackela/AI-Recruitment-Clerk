/**
 * ID Validator
 *
 * ID validator for various identifier formats.
 *
 * Supports:
 * - UUID (v4 standard format)
 * - MongoDB ObjectId (24 hex characters)
 * - Numeric IDs
 * - Alphanumeric IDs
 * - Custom regex patterns
 *
 * @module infrastructure-shared/utilities/validators/id.validator
 */

import type {
  IdValidationOptions,
  ValidationResult,
} from './validation.types.js';

/**
 * ID validator for various identifier formats.
 */
export class IdValidator {
  private static readonly UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static readonly MONGO_ID_REGEX = /^[0-9a-f]{24}$/i;
  private static readonly ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_-]+$/;

  /**
   * Validates an identifier.
   *
   * @param id - The identifier to validate
   * @param options - Validation options
   * @returns ValidationResult with isValid flag and error messages
   *
   * @example
   * ```typescript
   * // Validate UUID
   * const uuidResult = IdValidator.validate('550e8400-e29b-41d4-a716-446655440000', { format: 'UUID' });
   *
   * // Validate MongoDB ObjectId
   * const mongoResult = IdValidator.validate('507f1f77bcf86cd799439011', { format: 'MONGO_ID' });
   *
   * // Validate with custom pattern
   * const customResult = IdValidator.validate('USER_123', {
   *   format: 'CUSTOM',
   *   customPattern: /^[A-Z]+_\d+$/
   * });
   * ```
   */
  public static validate(
    id: unknown,
    options: IdValidationOptions = {},
  ): ValidationResult {
    const errors: string[] = [];
    const {
      allowEmpty = false,
      format,
      customPattern,
      minLength,
      maxLength,
      errorPrefix = 'ID',
    } = options;

    // Check for empty/null values
    if (id === null || id === undefined || id === '') {
      if (allowEmpty) {
        return { isValid: true, errors: [] };
      }
      return {
        isValid: false,
        errors: [`${errorPrefix} is required`],
      };
    }

    // Ensure id is a string
    if (typeof id !== 'string') {
      return {
        isValid: false,
        errors: [`${errorPrefix} must be a string`],
      };
    }

    // Check length constraints
    if (minLength !== undefined && id.length < minLength) {
      errors.push(`${errorPrefix} must be at least ${minLength} characters`);
    }

    if (maxLength !== undefined && id.length > maxLength) {
      errors.push(`${errorPrefix} must not exceed ${maxLength} characters`);
    }

    // Validate format based on options
    if (format) {
      switch (format) {
        case 'UUID':
          if (!this.UUID_V4_REGEX.test(id)) {
            errors.push(`${errorPrefix} must be a valid UUID v4`);
          }
          break;

        case 'MONGO_ID':
          if (!this.MONGO_ID_REGEX.test(id)) {
            errors.push(`${errorPrefix} must be a valid MongoDB ObjectId`);
          }
          break;

        case 'NUMERIC':
          if (!/^\d+$/.test(id)) {
            errors.push(`${errorPrefix} must contain only digits`);
          }
          break;

        case 'ALPHANUMERIC':
          if (!this.ALPHANUMERIC_REGEX.test(id)) {
            errors.push(
              `${errorPrefix} must contain only letters, numbers, underscores, and hyphens`,
            );
          }
          break;

        case 'CUSTOM':
          if (customPattern && !customPattern.test(id)) {
            errors.push(`${errorPrefix} format is invalid`);
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if a string is a valid UUID v4.
   *
   * @param id - The string to check
   * @returns True if valid UUID v4
   */
  public static isUUID(id: string): boolean {
    return this.UUID_V4_REGEX.test(id);
  }

  /**
   * Checks if a string is a valid MongoDB ObjectId.
   *
   * @param id - The string to check
   * @returns True if valid MongoDB ObjectId
   */
  public static isMongoId(id: string): boolean {
    return this.MONGO_ID_REGEX.test(id);
  }
}
