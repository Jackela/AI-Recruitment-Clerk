/**
 * Canonical validation types - Single Source of Truth (SSOT)
 * All validation-related interfaces should be imported from here.
 */

/**
 * Base validation result interface.
 * Use this for general validation scenarios.
 */
export interface ValidationResult<T = unknown> {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: T;
  metadata?: Record<string, unknown>;
}

/**
 * Extended validation result with warnings.
 * Use this when validation can pass with non-critical issues.
 */
export interface ValidationResultWithWarnings<T = unknown>
  extends ValidationResult<T> {
  warnings: string[];
}

/**
 * Contract validation result.
 * Use this specifically for API contract validation.
 */
export interface ContractValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  contractName: string;
}

/**
 * File validation options.
 */
export interface FileValidationOptions {
  maxSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanForMalware?: boolean;
  requireVirusFreeCertificate?: boolean;
}
