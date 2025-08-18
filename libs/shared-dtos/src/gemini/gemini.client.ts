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
  private readonly genAI!: GoogleGenerativeAI;
  private readonly model!: GenerativeModel;
  private readonly rateLimit = {
    requestsPerMinute: 60,
    requestsThisMinute: 0,
    lastResetTime: Date.now(),
  };

  constructor(private readonly config: GeminiConfig) {
    if (!config.apiKey || config.apiKey === 'your_gemini_api_key_here' || config.apiKey === 'your_actual_gemini_api_key_here') {
      this.logger.warn('⚠️ Gemini API密钥未配置，AI功能将使用降级模式');
      // 不抛出错误，允许系统继续运行但使用降级模式
      return;
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

  private isConfigured(): boolean {
    return Boolean(this.genAI && this.model && this.config.apiKey && 
           this.config.apiKey !== 'your_gemini_api_key_here' && 
           this.config.apiKey !== 'your_actual_gemini_api_key_here');
  }

  private getMockResponse(prompt: string): string {
    this.logger.debug('使用模拟响应模式');
    return `[AI模拟响应] 基于提示生成的模拟内容。请配置真实的GEMINI_API_KEY以获得AI功能。`;
  }

  async generateText(prompt: string, retries = 3): Promise<GeminiResponse<string>> {
    // 如果未配置，返回模拟响应
    if (!this.isConfigured()) {
      return {
        data: this.getMockResponse(prompt),
        processingTimeMs: 10,
        confidence: 0.0,
      };
    }

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
        this.logger.warn(`Attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

        if (attempt === retries) {
          this.logger.error(`All ${retries} attempts failed for Gemini request`);
          
          // Convert generic errors to specific Gemini errors
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (errorMessage?.includes('rate limit') || errorMessage?.includes('quota')) {
            throw new GeminiRateLimitError(errorMessage);
          }
          
          if (errorMessage?.includes('timeout') || (error as any).code === 'TIMEOUT') {
            throw new GeminiTimeoutError(errorMessage);
          }
          
          if (errorMessage?.includes('invalid') || errorMessage?.includes('validation')) {
            throw new GeminiValidationError(errorMessage);
          }
          
          throw new GeminiApiError(errorMessage || 'Unknown Gemini API error', (error as any).status, error as Error);
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached due to the throw statements above
    throw new GeminiApiError('All retry attempts failed');
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
        error: parseError instanceof Error ? parseError.message : 'Parse error',
        response: response.data,
      });
      throw new GeminiParsingError(
        `Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
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
        this.logger.warn(`Vision attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

        if (attempt === retries) {
          this.logger.error(`All ${retries} vision attempts failed`);
          throw error;
        }

        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached due to the throw statements above
    throw new GeminiApiError('All retry attempts failed');
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
        error: parseError instanceof Error ? parseError.message : 'Parse error',
        response: response.data,
      });
      throw new GeminiParsingError(
        `Invalid JSON response from Gemini Vision: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
        response.data
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        this.logger.warn('Gemini API未配置，健康检查返回降级状态');
        return false;
      }
      const response = await this.generateText('Respond with "OK" to confirm API connectivity.', 1);
      return response.data.toLowerCase().includes('ok');
    } catch {
      return false;
    }
  }
}