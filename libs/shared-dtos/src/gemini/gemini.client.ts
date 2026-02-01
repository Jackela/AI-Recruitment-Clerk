import type {
  GenerativeModel} from '@google/generative-ai';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import {
  GeminiApiError,
  GeminiRateLimitError,
  GeminiValidationError,
  GeminiTimeoutError,
  GeminiParsingError,
  GeminiConfigurationError,
} from '../errors/gemini-errors';
import { SecureConfigValidator } from '../config/secure-config.validator';

/**
 * Defines the shape of the gemini config.
 */
export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Defines the shape of the gemini response.
 */
export interface GeminiResponse<T = unknown> {
  data: T;
  tokensUsed?: number;
  processingTimeMs: number;
  confidence: number;
}

/**
 * Represents the gemini client.
 */
@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private readonly genAI!: GoogleGenerativeAI;
  private readonly model!: GenerativeModel;
  private readonly rateLimit = {
    requestsPerMinute: 60,
    requestsThisMinute: 0,
    lastResetTime: Date.now(),
  };

  /**
   * Initializes a new instance of the Gemini Client.
   * @param config - The config.
   */
  constructor(private readonly _config: GeminiConfig) {
    // 🔒 SECURITY: Strict fail-fast validation - no fallback mechanisms allowed
    if (!this._config.apiKey) {
      const error =
        '🔒 SECURITY: GeminiConfig.apiKey is required and cannot be empty';
      this.logger.error(error);
      throw new GeminiConfigurationError(error);
    }

    // Validate against insecure fallback patterns
    if (SecureConfigValidator.isInsecureFallbackValue(this._config.apiKey)) {
      const error = `🔒 SECURITY: GeminiConfig.apiKey contains insecure fallback value: ${this._config.apiKey}`;
      this.logger.error(error);
      throw new GeminiConfigurationError(error);
    }

    // Initialize Gemini client with validated configuration
    try {
      this.genAI = new GoogleGenerativeAI(this._config.apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: this._config.model || 'gemini-1.5-flash',
        generationConfig: {
          temperature: this._config.temperature || 0.3,
          topK: this._config.topK || 40,
          topP: this._config.topP || 0.95,
          maxOutputTokens: this._config.maxOutputTokens || 8192,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      this.logger.log(
        '✅ GeminiClient initialized successfully with secure configuration',
      );
    } catch (error) {
      const errorMessage = `🔒 SECURITY: Failed to initialize GeminiClient: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.error(errorMessage);
      throw new GeminiConfigurationError(errorMessage, error as Error);
    }
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const timeSinceReset = now - this.rateLimit.lastResetTime;

    // Reset counter every minute
    if (timeSinceReset >= 60000) {
      this.rateLimit.requestsThisMinute = 0;
      this.rateLimit.lastResetTime = now;
    }

    if (this.rateLimit.requestsThisMinute >= this.rateLimit.requestsPerMinute) {
      const waitTime = 60000 - timeSinceReset;
      throw new GeminiRateLimitError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        Math.ceil(waitTime / 1000),
      );
    }

    this.rateLimit.requestsThisMinute++;
  }

  /**
   * Generates text.
   * @param prompt - The prompt.
   * @param retries - The retries.
   * @returns A promise that resolves to GeminiResponse<string>.
   */
  async generateText(
    prompt: string,
    retries = 3,
  ): Promise<GeminiResponse<string>> {
    this.checkRateLimit();

    const startTime = Date.now();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`Generating text (attempt ${attempt}/${retries})`);

        const result = await this.model.generateContent(prompt);
        const response = await result.response;

        if (!response.text()) {
          throw new GeminiApiError('Empty response from Gemini API');
        }

        const processingTimeMs = Date.now() - startTime;
        const text = response.text();

        return {
          data: text,
          processingTimeMs,
          confidence: 0.85, // Default confidence score
        };
      } catch (error) {
        this.logger.warn(
          `Attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        if (attempt === retries) {
          this.logger.error(
            `All ${retries} attempts failed for Gemini request`,
          );

          // Convert generic errors to specific Gemini errors
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          if (
            errorMessage?.includes('rate limit') ||
            errorMessage?.includes('quota')
          ) {
            throw new GeminiRateLimitError(errorMessage);
          }

          const hasTimeoutCode =
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'TIMEOUT';
          if (errorMessage?.includes('timeout') || hasTimeoutCode) {
            throw new GeminiTimeoutError(errorMessage);
          }

          if (
            errorMessage?.includes('invalid') ||
            errorMessage?.includes('validation')
          ) {
            throw new GeminiValidationError(errorMessage);
          }

          const statusCode =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof error.status === 'number'
              ? error.status
              : undefined;
          throw new GeminiApiError(
            errorMessage || 'Unknown Gemini API error',
            statusCode,
            error as Error,
          );
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // This should never be reached due to the throw statements above
    throw new GeminiApiError('All retry attempts failed');
  }

  /**
   * Generates structured response.
   * @param prompt - The prompt.
   * @param schema - The schema.
   * @param retries - The retries.
   * @returns A promise that resolves to GeminiResponse<T>.
   */
  async generateStructuredResponse<T>(
    prompt: string,
    schema: string,
    retries = 3,
  ): Promise<GeminiResponse<T>> {
    const structuredPrompt = `${prompt}

Please respond with a valid JSON object that matches this schema:
${schema}

Important guidelines:
- Return ONLY valid JSON, no additional text or formatting
- Ensure all required fields are present
- Use null for missing information, never omit fields
- For arrays, return empty arrays [] if no items found
- For dates, use ISO 8601 format (YYYY-MM-DD)`;

    const response = await this.generateText(structuredPrompt, retries);

    try {
      // Clean the response to extract JSON
      let jsonText = response.data.trim();

      // Remove potential markdown formatting
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedData = JSON.parse(jsonText);

      return {
        data: parsedData,
        processingTimeMs: response.processingTimeMs,
        confidence: response.confidence,
      };
    } catch (parseError) {
      this.logger.error('Failed to parse JSON response from Gemini', {
        error: parseError instanceof Error ? parseError.message : 'Parse error',
        response: response.data,
      });
      throw new GeminiParsingError(
        `Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
        response.data,
      );
    }
  }

  /**
   * Generates with vision.
   * @param prompt - The prompt.
   * @param imageData - The image data.
   * @param mimeType - The mime type.
   * @param retries - The retries.
   * @returns A promise that resolves to GeminiResponse<string>.
   */
  async generateWithVision(
    prompt: string,
    imageData: Buffer | string,
    mimeType: string,
    retries = 3,
  ): Promise<GeminiResponse<string>> {
    this.checkRateLimit();

    const startTime = Date.now();
    const visionModel = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
    });

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(
          `Generating vision response (attempt ${attempt}/${retries})`,
        );

        const imagePart = {
          inlineData: {
            data: Buffer.isBuffer(imageData)
              ? imageData.toString('base64')
              : imageData,
            mimeType,
          },
        };

        const result = await visionModel.generateContent([prompt, imagePart]);
        const response = await result.response;

        if (!response.text()) {
          throw new GeminiApiError('Empty response from Gemini Vision API');
        }

        const processingTimeMs = Date.now() - startTime;

        return {
          data: response.text(),
          processingTimeMs,
          confidence: 0.8, // Slightly lower confidence for vision tasks
        };
      } catch (error) {
        this.logger.warn(
          `Vision attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        if (attempt === retries) {
          this.logger.error(`All ${retries} vision attempts failed`);
          throw error;
        }

        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // This should never be reached due to the throw statements above
    throw new GeminiApiError('All retry attempts failed');
  }

  /**
   * Generates structured vision response.
   * @param prompt - The prompt.
   * @param imageData - The image data.
   * @param mimeType - The mime type.
   * @param schema - The schema.
   * @param retries - The retries.
   * @returns A promise that resolves to GeminiResponse<T>.
   */
  async generateStructuredVisionResponse<T>(
    prompt: string,
    imageData: Buffer | string,
    mimeType: string,
    schema: string,
    retries = 3,
  ): Promise<GeminiResponse<T>> {
    const structuredPrompt = `${prompt}

Please respond with a valid JSON object that matches this schema:
${schema}

Important guidelines:
- Return ONLY valid JSON, no additional text or formatting
- Ensure all required fields are present
- Use null for missing information, never omit fields
- For arrays, return empty arrays [] if no items found
- For dates, use ISO 8601 format (YYYY-MM-DD)`;

    const response = await this.generateWithVision(
      structuredPrompt,
      imageData,
      mimeType,
      retries,
    );

    try {
      let jsonText = response.data.trim();

      // Remove potential markdown formatting
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedData = JSON.parse(jsonText);

      return {
        data: parsedData,
        processingTimeMs: response.processingTimeMs,
        confidence: response.confidence,
      };
    } catch (parseError) {
      this.logger.error('Failed to parse JSON response from Gemini Vision', {
        error: parseError instanceof Error ? parseError.message : 'Parse error',
        response: response.data,
      });
      throw new GeminiParsingError(
        `Invalid JSON response from Gemini Vision: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
        response.data,
      );
    }
  }

  /**
   * Performs the health check operation.
   * @returns A promise that resolves to boolean value.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateText(
        'Respond with "OK" to confirm API connectivity.',
        1,
      );
      return response.data.toLowerCase().includes('ok');
    } catch (error) {
      this.logger.error(
        `GeminiClient health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }
}
