/**
 * Shared Validation Utilities
 *
 * Provides common validation functions for email, phone, ID validation,
 * and schema validation helpers. These utilities are designed to be
 * used across all services in the AI Recruitment Clerk application.
 *
 * @module infrastructure-shared/utilities/validation.util
 */

/**
 * Defines the shape of a validation result.
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings?: string[];
}

/**
 * Defines the shape of validation options.
 */
export interface ValidationOptions {
  /** Whether to allow empty values (null/undefined/'') */
  allowEmpty?: boolean;
  /** Custom error message prefix */
  errorPrefix?: string;
  /** Whether to include warnings for non-critical issues */
  includeWarnings?: boolean;
}

/**
 * Configuration options for email validation.
 */
export interface EmailValidationOptions extends ValidationOptions {
  /** List of allowed email domains (e.g., ['gmail.com', 'outlook.com']) */
  allowedDomains?: string[];
  /** List of blocked email domains (e.g., ['tempmail.com']) */
  blockedDomains?: string[];
  /** Maximum email length (default: 254 per RFC 5321) */
  maxLength?: number;
  /** Whether to normalize email to lowercase */
  normalize?: boolean;
}

/**
 * Configuration options for phone validation.
 */
export interface PhoneValidationOptions extends ValidationOptions {
  /** Allowed phone formats */
  allowedFormats?: ('CN' | 'US' | 'INTL')[];
  /** Whether to allow international format with + prefix */
  allowInternational?: boolean;
  /** Whether to allow extensions (e.g., ext. 1234) */
  allowExtensions?: boolean;
}

/**
 * Configuration options for ID validation.
 */
export interface IdValidationOptions extends ValidationOptions {
  /** Required ID format/pattern */
  format?: 'UUID' | 'MONGO_ID' | 'NUMERIC' | 'ALPHANUMERIC' | 'CUSTOM';
  /** Custom regex pattern for CUSTOM format */
  customPattern?: RegExp;
  /** Minimum/maximum length for string IDs */
  minLength?: number;
  maxLength?: number;
}

/**
 * Schema definition for object validation.
 */
export interface SchemaDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: RegExp;
  allowedValues?: unknown[];
  /** Nested schema for objects */
  properties?: Record<string, SchemaDefinition>;
  /** Schema for array items */
  items?: SchemaDefinition;
}

/**
 * Comprehensive email validator supporting multiple formats and domain restrictions.
 *
 * Features:
 * - RFC 5321 compliant format validation
 * - Domain allow/block lists
 * - Maximum length enforcement
 * - Suspicious pattern detection
 * - Email normalization
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
      // Check for common temporary mail patterns
      const tempMailPatterns = [
        /temp.*mail\.com$/i,
        /throwaway\./i,
        /guerrillamail\.com$/i,
      ];
      for (const pattern of tempMailPatterns) {
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

/**
 * Comprehensive phone number validator supporting multiple formats.
 *
 * Features:
 * - Chinese mobile phone validation (11 digits, starts with 1)
 * - US phone number validation
 * - International format support
 * - Extension support
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

/**
 * ID validator for various identifier formats.
 *
 * Supports:
 * - UUID (v4 standard format)
 * - MongoDB ObjectId (24 hex characters)
 * - Numeric IDs
 * - Alphanumeric IDs
 * - Custom regex patterns
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

/**
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
  public static length(
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
