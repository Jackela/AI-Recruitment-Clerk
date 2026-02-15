/**
 * Validation types and functions for questionnaire domain.
 * @module questionnaire-validation.dto
 */

// ========================
// Validation Result Types
// ========================

/**
 * Represents the questionnaire validation result.
 */
export class QuestionnaireValidationResult {
  /**
   * Initializes a new instance of the Questionnaire Validation Result.
   * @param isValid - The is valid.
   * @param errors - The errors.
   */
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
  ) {}
}

// ========================
// Validation Rule Types
// ========================

/**
 * Represents a validation rule configuration.
 */
export interface ValidationRule {
  field: string;
  type: 'required' | 'range' | 'pattern' | 'custom';
  message: string;
  params?: Record<string, unknown>;
}

/**
 * Represents field validation config.
 */
export interface FieldValidationConfig {
  fieldName: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => boolean;
}

/**
 * Validation constants for questionnaire.
 */
export const QuestionnaireValidationConstants = {
  /** Minimum text length for bonus eligibility */
  MIN_TEXT_LENGTH_FOR_BONUS: 50,
  /** Minimum completion rate threshold */
  MIN_COMPLETION_RATE: 0.8,
  /** Minimum detailed answers count */
  MIN_DETAILED_ANSWERS: 3,
  /** Quality score threshold for bonus */
  QUALITY_SCORE_THRESHOLD: 70,
  /** Rating minimum value */
  RATING_MIN: 1,
  /** Rating maximum value */
  RATING_MAX: 5,
  /** Minimum text length for detailed answer */
  DETAILED_ANSWER_MIN_LENGTH: 20,
  /** Minimum text length for detailed feedback */
  DETAILED_FEEDBACK_MIN_LENGTH: 30,
} as const;

// ========================
// Validation Utility Functions
// ========================

/**
 * Validates a rating value is within acceptable range.
 * @param rating - The rating value to validate.
 * @returns True if the rating is valid (1-5), false otherwise.
 */
export function isValidRating(rating: number): boolean {
  return (
    rating >= QuestionnaireValidationConstants.RATING_MIN &&
    rating <= QuestionnaireValidationConstants.RATING_MAX
  );
}

/**
 * Validates a percentage value is within acceptable range.
 * @param percentage - The percentage value to validate.
 * @returns True if the percentage is valid (0-100), false otherwise.
 */
export function isValidPercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100;
}

/**
 * Validates a non-negative number.
 * @param value - The value to validate.
 * @returns True if the value is non-negative, false otherwise.
 */
export function isNonNegative(value: number): boolean {
  return value >= 0;
}

/**
 * Checks if a string meets minimum length requirement.
 * @param text - The text to check.
 * @param minLength - The minimum required length.
 * @returns True if the text meets the minimum length, false otherwise.
 */
export function meetsMinLength(text: string | undefined, minLength: number): boolean {
  return (text?.length ?? 0) >= minLength;
}

/**
 * Checks if a value is a valid selection (not default/placeholder).
 * @param value - The value to check.
 * @param invalidValues - Values that are considered invalid.
 * @returns True if the value is a valid selection, false otherwise.
 */
export function isValidSelection(
  value: string | undefined,
  invalidValues: string[] = ['other', 'manual', 'unknown', ''],
): boolean {
  return value !== undefined && !invalidValues.includes(value);
}

/**
 * Creates a validation error message.
 * @param fieldName - The name of the field with the error.
 * @param errorType - The type of validation error.
 * @returns A formatted error message.
 */
export function createValidationError(
  fieldName: string,
  errorType: 'required' | 'invalid' | 'range' | 'pattern',
): string {
  const messages: Record<string, string> = {
    required: `${fieldName} is required`,
    invalid: `${fieldName} has an invalid value`,
    range: `${fieldName} is out of acceptable range`,
    pattern: `${fieldName} does not match expected format`,
  };
  return messages[errorType];
}
