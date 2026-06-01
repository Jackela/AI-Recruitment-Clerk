import {
  GeminiApiError,
  GeminiRateLimitError,
  GeminiValidationError,
  GeminiTimeoutError,
  GeminiParsingError,
  GeminiConfigurationError,
} from './gemini-errors';

describe('Gemini Errors', () => {
  describe('GeminiApiError', () => {
    it('should create basic Gemini API error', () => {
      const error = new GeminiApiError('Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GeminiApiError);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('GeminiApiError');
      expect(error.statusCode).toBeUndefined();
      expect(error.originalError).toBeUndefined();
    });

    it('should create error with status code', () => {
      const error = new GeminiApiError('API error', 500);

      expect(error.statusCode).toBe(500);
    });

    it('should create error with original error', () => {
      const originalError = new Error('Original error');
      const error = new GeminiApiError('API error', 500, originalError);

      expect(error.originalError).toBe(originalError);
      expect(error.statusCode).toBe(500);
    });

    it('should maintain error stack trace', () => {
      const error = new GeminiApiError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('GeminiApiError');
    });

    it('should create error with all parameters', () => {
      const originalError = new Error('Original');
      const error = new GeminiApiError('Full error', 503, originalError);

      expect(error.message).toBe('Full error');
      expect(error.statusCode).toBe(503);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('GeminiRateLimitError', () => {
    it('should create rate limit error with default message', () => {
      const error = new GeminiRateLimitError();

      expect(error).toBeInstanceOf(GeminiApiError);
      expect(error).toBeInstanceOf(GeminiRateLimitError);
      expect(error.message).toBe('Gemini API rate limit exceeded');
      expect(error.name).toBe('GeminiRateLimitError');
      expect(error.statusCode).toBe(429);
    });

    it('should create rate limit error with custom message', () => {
      const error = new GeminiRateLimitError('Custom rate limit message');

      expect(error.message).toBe('Custom rate limit message');
      expect(error.statusCode).toBe(429);
    });

    it('should create rate limit error with retry after', () => {
      const error = new GeminiRateLimitError(undefined, 60);

      expect(error.retryAfter).toBe(60);
      expect(error.message).toBe('Gemini API rate limit exceeded');
    });

    it('should create rate limit error with custom message and retry after', () => {
      const error = new GeminiRateLimitError('Rate limit hit', 120);

      expect(error.message).toBe('Rate limit hit');
      expect(error.retryAfter).toBe(120);
      expect(error.statusCode).toBe(429);
    });

    it('should handle retryAfter of 0', () => {
      const error = new GeminiRateLimitError('Rate limit', 0);

      expect(error.retryAfter).toBe(0);
    });

    it('should handle undefined retryAfter', () => {
      const error = new GeminiRateLimitError('Rate limit', undefined);

      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('GeminiValidationError', () => {
    it('should create validation error', () => {
      const error = new GeminiValidationError('Invalid input data');

      expect(error).toBeInstanceOf(GeminiApiError);
      expect(error).toBeInstanceOf(GeminiValidationError);
      expect(error.message).toBe('Invalid input data');
      expect(error.name).toBe('GeminiValidationError');
      expect(error.statusCode).toBe(400);
    });

    it('should create validation error with details', () => {
      const details = { field: 'prompt', issue: 'too long' };
      const error = new GeminiValidationError('Validation failed', details);

      expect(error.validationDetails).toEqual(details);
    });

    it('should create validation error with array details', () => {
      const details = ['Field 1 is required', 'Field 2 is invalid'];
      const error = new GeminiValidationError('Validation failed', details);

      expect(error.validationDetails).toEqual(details);
    });

    it('should create validation error with null details', () => {
      const error = new GeminiValidationError('Validation failed', null);

      expect(error.validationDetails).toBeNull();
    });

    it('should create validation error with undefined details', () => {
      const error = new GeminiValidationError('Validation failed', undefined);

      expect(error.validationDetails).toBeUndefined();
    });

    it('should create validation error with complex object details', () => {
      const details = {
        errors: [
          { field: 'temperature', message: 'must be between 0 and 1' },
          { field: 'maxTokens', message: 'must be positive' },
        ],
      };
      const error = new GeminiValidationError('Validation failed', details);

      expect(error.validationDetails).toEqual(details);
    });
  });

  describe('GeminiTimeoutError', () => {
    it('should create timeout error with default message', () => {
      const error = new GeminiTimeoutError();

      expect(error).toBeInstanceOf(GeminiApiError);
      expect(error).toBeInstanceOf(GeminiTimeoutError);
      expect(error.message).toBe('Gemini API request timed out');
      expect(error.name).toBe('GeminiTimeoutError');
      expect(error.statusCode).toBe(408);
    });

    it('should create timeout error with custom message', () => {
      const error = new GeminiTimeoutError('Request took too long');

      expect(error.message).toBe('Request took too long');
      expect(error.statusCode).toBe(408);
    });

    it('should create timeout error with timeout details', () => {
      const error = new GeminiTimeoutError('Timeout after 30 seconds');

      expect(error.message).toContain('30 seconds');
    });
  });

  describe('GeminiParsingError', () => {
    it('should create parsing error', () => {
      const error = new GeminiParsingError('Failed to parse response');

      expect(error).toBeInstanceOf(GeminiApiError);
      expect(error).toBeInstanceOf(GeminiParsingError);
      expect(error.message).toBe('Failed to parse response');
      expect(error.name).toBe('GeminiParsingError');
      expect(error.statusCode).toBe(422);
    });

    it('should create parsing error with raw response', () => {
      const rawResponse = '{"invalid json';
      const error = new GeminiParsingError('JSON parse error', rawResponse);

      expect(error.rawResponse).toBe(rawResponse);
    });

    it('should create parsing error with large raw response', () => {
      const rawResponse = 'x'.repeat(10000);
      const error = new GeminiParsingError('Parse error', rawResponse);

      expect(error.rawResponse).toBe(rawResponse);
    });

    it('should create parsing error with empty raw response', () => {
      const error = new GeminiParsingError('Parse error', '');

      expect(error.rawResponse).toBe('');
    });

    it('should create parsing error with undefined raw response', () => {
      const error = new GeminiParsingError('Parse error', undefined);

      expect(error.rawResponse).toBeUndefined();
    });

    it('should create parsing error with null raw response', () => {
      const error = new GeminiParsingError('Parse error', null as any);

      expect(error.rawResponse).toBeNull();
    });
  });

  describe('GeminiConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new GeminiConfigurationError('API key not configured');

      expect(error).toBeInstanceOf(GeminiApiError);
      expect(error).toBeInstanceOf(GeminiConfigurationError);
      expect(error.message).toBe('API key not configured');
      expect(error.name).toBe('GeminiConfigurationError');
      expect(error.statusCode).toBe(500);
    });

    it('should create configuration error with original error', () => {
      const originalError = new Error('Config file not found');
      const error = new GeminiConfigurationError(
        'Configuration failed',
        originalError,
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should create configuration error with nested error', () => {
      const innerError = new Error('Inner error');
      const outerError = new Error('Outer error');
      (outerError as any).cause = innerError;

      const error = new GeminiConfigurationError('Config error', outerError);

      expect(error.originalError).toBe(outerError);
    });

    it('should handle missing API key scenario', () => {
      const error = new GeminiConfigurationError(
        'GEMINI_API_KEY environment variable is not set',
      );

      expect(error.statusCode).toBe(500);
      expect(error.message).toContain('GEMINI_API_KEY');
    });

    it('should handle invalid configuration scenario', () => {
      const error = new GeminiConfigurationError(
        'Invalid model configuration: model name cannot be empty',
      );

      expect(error.statusCode).toBe(500);
      expect(error.message).toContain('Invalid model configuration');
    });
  });

  describe('Error inheritance', () => {
    it('should all extend GeminiApiError', () => {
      const rateLimitError = new GeminiRateLimitError();
      const validationError = new GeminiValidationError('test');
      const timeoutError = new GeminiTimeoutError();
      const parsingError = new GeminiParsingError('test');
      const configError = new GeminiConfigurationError('test');

      expect(rateLimitError).toBeInstanceOf(GeminiApiError);
      expect(validationError).toBeInstanceOf(GeminiApiError);
      expect(timeoutError).toBeInstanceOf(GeminiApiError);
      expect(parsingError).toBeInstanceOf(GeminiApiError);
      expect(configError).toBeInstanceOf(GeminiApiError);
    });

    it('should all extend Error', () => {
      const rateLimitError = new GeminiRateLimitError();
      const validationError = new GeminiValidationError('test');
      const timeoutError = new GeminiTimeoutError();
      const parsingError = new GeminiParsingError('test');
      const configError = new GeminiConfigurationError('test');

      expect(rateLimitError).toBeInstanceOf(Error);
      expect(validationError).toBeInstanceOf(Error);
      expect(timeoutError).toBeInstanceOf(Error);
      expect(parsingError).toBeInstanceOf(Error);
      expect(configError).toBeInstanceOf(Error);
    });
  });

  describe('Error catching', () => {
    it('should be catchable as GeminiApiError', () => {
      let caught = false;

      try {
        throw new GeminiRateLimitError();
      } catch (error) {
        if (error instanceof GeminiApiError) {
          caught = true;
        }
      }

      expect(caught).toBe(true);
    });

    it('should be catchable as specific error type', () => {
      let caught = false;

      try {
        throw new GeminiValidationError('test');
      } catch (error) {
        if (error instanceof GeminiValidationError) {
          caught = true;
        }
      }

      expect(caught).toBe(true);
    });

    it('should preserve error properties when caught', () => {
      try {
        throw new GeminiRateLimitError('Rate limit', 60);
      } catch (error) {
        if (error instanceof GeminiRateLimitError) {
          expect(error.retryAfter).toBe(60);
          expect(error.statusCode).toBe(429);
        }
      }
    });
  });

  describe('Error serialization', () => {
    it('should serialize GeminiApiError to JSON', () => {
      const error = new GeminiApiError('Test error', 500);
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe('Test error');
      expect(parsed.name).toBe('GeminiApiError');
    });

    it('should serialize GeminiRateLimitError to JSON', () => {
      const error = new GeminiRateLimitError('Rate limit', 60);
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe('Rate limit');
      expect(parsed.retryAfter).toBe(60);
      expect(parsed.statusCode).toBe(429);
    });

    it('should serialize GeminiValidationError with details', () => {
      const details = { field: 'test' };
      const error = new GeminiValidationError('Validation error', details);
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe('Validation error');
      expect(parsed.validationDetails).toEqual(details);
    });
  });
});
