/**
 * Defines the shape of the gemini config.
 */
export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Represents the gemini client.
 */
export class GeminiClient {
  /**
   * Initializes a new instance of the Gemini Client.
   * @param _config - The config.
   */
  constructor(_config: GeminiConfig) {}
  /**
   * Generates structured response.
   * @param _prompt - The prompt.
   * @param _schema - The schema.
   * @returns A promise that resolves to { data: T }.
   */
  async generateStructuredResponse<T>(
    _prompt: string,
    _schema: any,
  ): Promise<{ data: T }> {
    return { data: {} as T };
  }
  /**
   * Generates structured vision response.
   * @param _prompt - The prompt.
   * @param _buffer - The buffer.
   * @param _mime - The mime.
   * @param _schema - The schema.
   * @returns A promise that resolves to { data: T }.
   */
  async generateStructuredVisionResponse<T>(
    _prompt: string,
    _buffer: Buffer,
    _mime: string,
    _schema: any,
  ): Promise<{ data: T }> {
    return { data: {} as T };
  }
  /**
   * Performs the health check operation.
   * @returns A promise that resolves to { status: string }.
   */
  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }
}

/**
 * Represents the prompt templates.
 */
export class PromptTemplates {
  /**
   * Retrieves resume parsing prompt.
   * @param _text - The text.
   * @returns The string value.
   */
  static getResumeParsingPrompt(_text: string): string {
    return 'Parse resume text';
  }
  /**
   * Retrieves resume vision prompt.
   * @returns The string value.
   */
  static getResumeVisionPrompt(): string {
    return 'Parse resume via vision';
  }
}

/**
 * Represents the prompt builder.
 */
export class PromptBuilder {
  /**
   * Performs the add json schema instruction operation.
   * @param prompt - The prompt.
   * @param _schema - The schema.
   * @returns The string value.
   */
  static addJsonSchemaInstruction(prompt: string, _schema: any): string {
    return prompt;
  }
}
