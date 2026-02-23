/**
 * Email Validator
 *
 * Comprehensive email validator supporting multiple formats and domain restrictions.
 *
 * Features:
 * - RFC 5321 compliant format validation
 * - Domain allow/block lists
 * - Maximum length enforcement
 * - Suspicious pattern detection
 * - Email normalization
 *
 * @module infrastructure-shared/utilities/validators/email.validator
 */

import type {
  EmailValidationOptions,
  ValidationResult,
} from './validation.types.js';

/**
 * Comprehensive email validator supporting multiple formats and domain restrictions.
 */
export class EmailValidator {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  private static readonly MAX_EMAIL_LENGTH = 254;
  private static readonly SUSPICIOUS_PATTERNS = [
    /\.\./g, // Consecutive dots
    /^\./, // Starts with dot
    /\.$/, // Ends with dot
    /@.*@/, // Multiple @ signs
    /^\s+|\s+$/g, // Leading/trailing whitespace
  ];

  /**
   * Validates an email address.
   *
   * @param email - The email to validate
   * @param options - Validation options
   * @returns ValidationResult with isValid flag and error messages
   *
   * @example
   * ```typescript
   * const result = EmailValidator.validate('user@example.com');
   * if (!result.isValid) {
   *   console.error(result.errors);
   * }
   * ```
   */
  public static validate(
    email: unknown,
    options: EmailValidationOptions = {},
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const {
      allowEmpty = false,
      allowedDomains,
      blockedDomains,
      maxLength = this.MAX_EMAIL_LENGTH,
      normalize = true,
      errorPrefix = 'Email',
    } = options;

    // Check for empty/null values
    if (email === null || email === undefined || email === '') {
      if (allowEmpty) {
        return { isValid: true, errors: [] };
      }
      return {
        isValid: false,
        errors: [`${errorPrefix} is required`],
      };
    }

    // Ensure email is a string
    if (typeof email !== 'string') {
      return {
        isValid: false,
        errors: [`${errorPrefix} must be a string`],
      };
    }

    // Normalize email
    const normalizedEmail = normalize ? email.trim().toLowerCase() : email.trim();

    // Check length
    if (normalizedEmail.length > maxLength) {
      errors.push(
        `${errorPrefix} exceeds maximum length of ${maxLength} characters`,
      );
    }

    // Check for suspicious patterns
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(normalizedEmail)) {
        errors.push(`${errorPrefix} contains invalid patterns`);
        break;
      }
    }

    // Validate format using RFC-compliant regex
    if (!this.EMAIL_REGEX.test(normalizedEmail)) {
      errors.push(`${errorPrefix} format is invalid`);
    }

    // Validate domain if provided
    if ((allowedDomains || blockedDomains) && normalizedEmail.includes('@')) {
      const domain = normalizedEmail.split('@')[1];

      if (allowedDomains && !allowedDomains.includes(domain)) {
        errors.push(
          `${errorPrefix} domain '${domain}' is not allowed. Allowed domains: ${allowedDomains.join(', ')}`,
        );
      }

      if (blockedDomains && blockedDomains.includes(domain)) {
        errors.push(`${errorPrefix} domain '${domain}' is blocked`);
      }
    }

    // Add warnings for common issues
    if (options.includeWarnings) {
      // Early return for emails that are too long to prevent ReDoS
      if (normalizedEmail.length > 254) {
        return {
          isValid: errors.length === 0,
          errors,
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      }

      // Check for common temporary mail patterns
      // These patterns match against the full email address (e.g., user@tempmail.com)
      // The patterns are kept simple and anchored to the end to prevent ReDoS
      const tempMailPatterns: Array<[string, RegExp]> = [
        ['tempmail.com', /tempmail\.com$/i],
        ['throwaway', /throwaway\./i],
        ['guerrillamail.com', /guerrillamail\.com$/i],
      ];

      for (const [_, pattern] of tempMailPatterns) {
        if (pattern.test(normalizedEmail)) {
          warnings.push(`${errorPrefix} appears to be a temporary email address`);
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Normalizes an email address for storage/comparison.
   *
   * @param email - The email to normalize
   * @returns Normalized email (lowercase, trimmed)
   */
  public static normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Extracts the domain from an email address.
   *
   * @param email - The email address
   * @returns The domain portion or null if invalid
   */
  public static extractDomain(email: string): string | null {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : null;
  }
}
