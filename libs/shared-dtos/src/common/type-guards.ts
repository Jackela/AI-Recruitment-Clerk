/**
 * Type Guard Utilities
 *
 * Centralized type guard functions for runtime type checking.
 * All guards follow consistent patterns to satisfy static analysis tools
 * while maintaining type safety.
 */

/**
 * Checks if a value is a non-null object
 * @param value - The value to check
 * @returns True if value is a non-null object
 */
export function isNonNullObject(
  value: unknown,
): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}

/**
 * Type guard to check if an object has a message property
 * @param value - The value to check
 * @returns Type predicate indicating the value has a message property
 */
export function hasMessageProperty(
  value: unknown,
): value is { message: unknown } {
  if (!isNonNullObject(value)) {
    return false;
  }
  return 'message' in value;
}

/**
 * Type guard to check if an object has an error property
 * @param value - The value to check
 * @returns Type predicate indicating the value has an error property
 */
export function hasErrorProperty(value: unknown): value is { error: unknown } {
  if (!isNonNullObject(value)) {
    return false;
  }
  return 'error' in value;
}

/**
 * Type guard to check if an object has a toString method
 * @param value - The value to check
 * @returns Type predicate indicating the value has a callable toString method
 */
export function hasToStringMethod(
  value: unknown,
): value is { toString: () => string } {
  if (!isNonNullObject(value)) {
    return false;
  }
  return 'toString' in value && typeof value.toString === 'function';
}
