/**
 * Shared Validation Type Definitions
 *
 * Provides common interfaces and types for validation utilities.
 *
 * @module infrastructure-shared/utilities/validators/validation.types
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
