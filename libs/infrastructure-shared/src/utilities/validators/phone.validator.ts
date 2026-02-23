/**
 * Phone Validator
 *
 * Comprehensive phone number validator supporting multiple formats.
 *
 * Features:
 * - Chinese mobile phone validation (11 digits, starts with 1)
 * - US phone number validation
 * - International format support
 * - Extension support
 *
 * @module infrastructure-shared/utilities/validators/phone.validator
 */

import type {
  PhoneValidationOptions,
  ValidationResult,
} from './validation.types.js';

/**
 * Comprehensive phone number validator supporting multiple formats.
 */
export class PhoneValidator {
  // Chinese mobile phone pattern: 11 digits, starts with 1, second digit 3-9
  private static readonly CN_PHONE_REGEX = /^1[3-9]\d{9}$/;
  // US phone pattern: (XXX) XXX-XXXX or XXX-XXX-XXXX
  private static readonly US_PHONE_REGEX =
    /^(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  // International format: + followed by 7-15 digits
  private static readonly INTL_PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

  /**
   * Validates a phone number.
   *
   * @param phone - The phone number to validate
   * @param options - Validation options
   * @returns ValidationResult with isValid flag and error messages
   *
   * @example
   * ```typescript
   * // Validate Chinese phone
   * const cnResult = PhoneValidator.validate('13812345678', { allowedFormats: ['CN'] });
   *
   * // Validate international phone
   * const intlResult = PhoneValidator.validate('+1234567890', { allowInternational: true });
   * ```
   */
  public static validate(
    phone: unknown,
    options: PhoneValidationOptions = {},
  ): ValidationResult {
    const errors: string[] = [];
    const {
      allowEmpty = false,
      allowedFormats,
      allowInternational = true,
      allowExtensions = false,
      errorPrefix = 'Phone number',
    } = options;

    // Check for empty/null values
    if (phone === null || phone === undefined || phone === '') {
      if (allowEmpty) {
        return { isValid: true, errors: [] };
      }
      return {
        isValid: false,
        errors: [`${errorPrefix} is required`],
      };
    }

    // Ensure phone is a string
    if (typeof phone !== 'string') {
      return {
        isValid: false,
        errors: [`${errorPrefix} must be a string`],
      };
    }

    // Remove common formatting characters for validation
    let cleanPhone = phone.trim();
    const extensionMatch = cleanPhone.match(/(?:ext|extension|x)[:.\s]*(\d+)$/i);
    const extension = extensionMatch ? extensionMatch[1] : null;

    if (extension) {
      if (!allowExtensions) {
        errors.push(`${errorPrefix} extensions are not allowed`);
      }
      // Remove extension for main number validation
      cleanPhone = cleanPhone.replace(/(?:ext|extension|x)[:.\s]*\d+$/i, '').trim();
    }

    // Remove spaces, dashes, parentheses for basic validation
    const digitsOnly = cleanPhone.replace(/[\s\-().]/g, '');

    // Determine which formats to check
    const formatsToCheck = allowedFormats || ['CN', 'INTL'];

    let isValid = false;

    if (formatsToCheck.includes('CN')) {
      // Check Chinese mobile format
      if (this.CN_PHONE_REGEX.test(digitsOnly)) {
        isValid = true;
      }
    }

    if (formatsToCheck.includes('US') && !isValid) {
      // Check US format
      if (this.US_PHONE_REGEX.test(cleanPhone)) {
        isValid = true;
      }
    }

    if (formatsToCheck.includes('INTL') && allowInternational && !isValid) {
      // Check international format
      if (this.INTL_PHONE_REGEX.test(digitsOnly)) {
        isValid = true;
      }
    }

    if (!isValid) {
      const formatList = formatsToCheck.join(', ');
      errors.push(
        `${errorPrefix} format is invalid. Supported formats: ${formatList}`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Formats a phone number to a standard format.
   *
   * @param phone - The phone number to format
   * @param format - The desired output format
   * @returns Formatted phone number
   */
  public static format(
    phone: string,
    format: 'CN' | 'US' | 'INTL' = 'INTL',
  ): string {
    const digitsOnly = phone.replace(/\D/g, '');

    switch (format) {
      case 'CN':
        // Format as 1XX XXXX XXXX
        if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
          return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 7)} ${digitsOnly.slice(7)}`;
        }
        return phone;

      case 'US':
        // Format as (XXX) XXX-XXXX
        if (digitsOnly.length === 10) {
          return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
        }
        if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
          return `+${digitsOnly.slice(0, 1)} (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
        }
        return phone;

      case 'INTL':
      default:
        // Add + prefix if not present
        if (!phone.startsWith('+')) {
          return `+${digitsOnly}`;
        }
        return phone;
    }
  }

  /**
   * Extracts the country code from an international phone number.
   *
   * @param phone - The phone number
   * @returns The country code or null
   */
  public static extractCountryCode(phone: string): string | null {
    if (phone.startsWith('+')) {
      const match = phone.match(/^\+(\d{1,3})/);
      return match ? match[1] : null;
    }
    return null;
  }
}
