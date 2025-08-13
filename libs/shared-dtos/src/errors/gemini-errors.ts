/**
 * Custom error classes for Gemini API integration
 */

export class GeminiApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

export class GeminiRateLimitError extends GeminiApiError {
  constructor(
    message = 'Gemini API rate limit exceeded',
    public readonly retryAfter?: number
  ) {
    super(message, 429);
    this.name = 'GeminiRateLimitError';
  }
}

export class GeminiValidationError extends GeminiApiError {
  constructor(
    message: string,
    public readonly validationDetails?: any
  ) {
    super(message, 400);
    this.name = 'GeminiValidationError';
  }
}

export class GeminiTimeoutError extends GeminiApiError {
  constructor(message = 'Gemini API request timed out') {
    super(message, 408);
    this.name = 'GeminiTimeoutError';
  }
}

export class GeminiParsingError extends GeminiApiError {
  constructor(
    message: string,
    public readonly rawResponse?: string
  ) {
    super(message, 422);
    this.name = 'GeminiParsingError';
  }
}

export class GeminiConfigurationError extends GeminiApiError {
  constructor(message: string) {
    super(message, 500);
    this.name = 'GeminiConfigurationError';
  }
}