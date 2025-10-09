/**
 * Custom error classes for Gemini API integration
 */

export class GeminiApiError extends Error {
  /**
   * Initializes a new instance of the Gemini API Error.
   * @param message - The message.
   * @param statusCode - The status code.
   * @param originalError - The original error.
   */
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

/**
 * Represents the gemini rate limit error.
 */
export class GeminiRateLimitError extends GeminiApiError {
  /**
   * Initializes a new instance of the Gemini Rate Limit Error.
   * @param message - The message.
   * @param retryAfter - The retry after.
   */
  constructor(
    message = 'Gemini API rate limit exceeded',
    public readonly retryAfter?: number
  ) {
    super(message, 429);
    this.name = 'GeminiRateLimitError';
  }
}

/**
 * Represents the gemini validation error.
 */
export class GeminiValidationError extends GeminiApiError {
  /**
   * Initializes a new instance of the Gemini Validation Error.
   * @param message - The message.
   * @param validationDetails - The validation details.
   */
  constructor(
    message: string,
    public readonly validationDetails?: unknown
  ) {
    super(message, 400);
    this.name = 'GeminiValidationError';
  }
}

/**
 * Represents the gemini timeout error.
 */
export class GeminiTimeoutError extends GeminiApiError {
  /**
   * Initializes a new instance of the Gemini Timeout Error.
   * @param message - The message.
   */
  constructor(message = 'Gemini API request timed out') {
    super(message, 408);
    this.name = 'GeminiTimeoutError';
  }
}

/**
 * Represents the gemini parsing error.
 */
export class GeminiParsingError extends GeminiApiError {
  /**
   * Initializes a new instance of the Gemini Parsing Error.
   * @param message - The message.
   * @param rawResponse - The raw response.
   */
  constructor(
    message: string,
    public readonly rawResponse?: string
  ) {
    super(message, 422);
    this.name = 'GeminiParsingError';
  }
}

/**
 * Represents the gemini configuration error.
 */
export class GeminiConfigurationError extends GeminiApiError {
  /**
   * Initializes a new instance of the Gemini Configuration Error.
   * @param message - The message.
   * @param originalError - The original error.
   */
  constructor(message: string, originalError?: Error) {
    super(message, 500, originalError);
    this.name = 'GeminiConfigurationError';
  }
}