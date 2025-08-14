"use strict";
/**
 * Custom error classes for Gemini API integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiConfigurationError = exports.GeminiParsingError = exports.GeminiTimeoutError = exports.GeminiValidationError = exports.GeminiRateLimitError = exports.GeminiApiError = void 0;
class GeminiApiError extends Error {
    constructor(message, statusCode, originalError) {
        super(message);
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.name = 'GeminiApiError';
    }
}
exports.GeminiApiError = GeminiApiError;
class GeminiRateLimitError extends GeminiApiError {
    constructor(message = 'Gemini API rate limit exceeded', retryAfter) {
        super(message, 429);
        this.retryAfter = retryAfter;
        this.name = 'GeminiRateLimitError';
    }
}
exports.GeminiRateLimitError = GeminiRateLimitError;
class GeminiValidationError extends GeminiApiError {
    constructor(message, validationDetails) {
        super(message, 400);
        this.validationDetails = validationDetails;
        this.name = 'GeminiValidationError';
    }
}
exports.GeminiValidationError = GeminiValidationError;
class GeminiTimeoutError extends GeminiApiError {
    constructor(message = 'Gemini API request timed out') {
        super(message, 408);
        this.name = 'GeminiTimeoutError';
    }
}
exports.GeminiTimeoutError = GeminiTimeoutError;
class GeminiParsingError extends GeminiApiError {
    constructor(message, rawResponse) {
        super(message, 422);
        this.rawResponse = rawResponse;
        this.name = 'GeminiParsingError';
    }
}
exports.GeminiParsingError = GeminiParsingError;
class GeminiConfigurationError extends GeminiApiError {
    constructor(message) {
        super(message, 500);
        this.name = 'GeminiConfigurationError';
    }
}
exports.GeminiConfigurationError = GeminiConfigurationError;
