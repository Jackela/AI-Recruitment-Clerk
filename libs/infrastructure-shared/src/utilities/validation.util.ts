/**
 * Shared Validation Utilities
 *
 * Barrel export for all validation utilities.
 * This file re-exports from the validators subdirectory for backward compatibility.
 *
 * @module infrastructure-shared/utilities/validation.util
 * @deprecated Import directly from './validators/index.js' instead
 */

// Re-export everything from validators for backward compatibility
export type {
  ValidationResult,
  ValidationOptions,
  EmailValidationOptions,
  PhoneValidationOptions,
  IdValidationOptions,
  SchemaDefinition,
} from './validators/validation.types.js';

export {
  EmailValidator,
  PhoneValidator,
  IdValidator,
  SchemaValidator,
  Validator,
} from './validators/index.js';
