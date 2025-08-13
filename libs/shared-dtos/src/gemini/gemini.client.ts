import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { 
  GeminiApiError, 
  GeminiRateLimitError, 
  GeminiValidationError, 
  GeminiTimeoutError, 
  GeminiParsingError, 
  GeminiConfigurationError 
} from '../errors/gemini-errors';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiResponse<T = any> {
  data: T;
  tokensUsed?: number;
  processingTimeMs: number;
  confidence: number;
}

@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;
  private readonly rateLimit = {
    requestsPerMinute: 60,
    requestsThisMinute: 0,
    lastResetTime: Date.now(),
  };

  constructor(private readonly config: GeminiConfig) {
    if (!config.apiKey || config.apiKey === 'your_gemini_api_key_here') {
      throw new GeminiConfigurationError('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.model || 'gemini-1.5-flash',
      generationConfig: {
        temperature: config.temperature || 0.3,
        topK: config.topK || 40,
        topP: config.topP || 0.95,
        maxOutputTokens: config.maxOutputTokens || 8192,
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
        Math.ceil(waitTime / 1000)
      );
    }

    this.rateLimit.requestsThisMinute++;
  }

  async generateText(prompt: string, retries = 3): Promise<GeminiResponse<string>> {
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
        this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);

        if (attempt === retries) {
          this.logger.error(`All ${retries} attempts failed for Gemini request`);
          
          // Convert generic errors to specific Gemini errors
          if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
            throw new GeminiRateLimitError(error.message);
          }
          
          if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
            throw new GeminiTimeoutError(error.message);
          }
          
          if (error.message?.includes('invalid') || error.message?.includes('validation')) {
            throw new GeminiValidationError(error.message);
          }
          
          throw new GeminiApiError(error.message || 'Unknown Gemini API error', error.status, error);
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async generateStructuredResponse<T>(
    prompt: string,
    schema: string,
    retries = 3
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
        error: parseError.message,
        response: response.data,
      });
      throw new GeminiParsingError(
        `Invalid JSON response from Gemini: ${parseError.message}`,
        response.data
      );
    }
  }

  async generateWithVision(
    prompt: string,
    imageData: Buffer | string,
    mimeType: string,
    retries = 3
  ): Promise<GeminiResponse<string>> {
    this.checkRateLimit();

    const startTime = Date.now();
    const visionModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`Generating vision response (attempt ${attempt}/${retries})`);

        const imagePart = {
          inlineData: {
            data: Buffer.isBuffer(imageData) ? imageData.toString('base64') : imageData,
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
        this.logger.warn(`Vision attempt ${attempt} failed: ${error.message}`);

        if (attempt === retries) {
          this.logger.error(`All ${retries} vision attempts failed`);
          throw error;
        }

        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async generateStructuredVisionResponse<T>(
    prompt: string,
    imageData: Buffer | string,
    mimeType: string,
    schema: string,
    retries = 3
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

    const response = await this.generateWithVision(structuredPrompt, imageData, mimeType, retries);

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
        error: parseError.message,
        response: response.data,
      });
      throw new GeminiParsingError(
        `Invalid JSON response from Gemini Vision: ${parseError.message}`,
        response.data
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateText('Respond with "OK" to confirm API connectivity.', 1);
      return response.data.toLowerCase().includes('ok');
    } catch {
      return false;
    }
  }
}