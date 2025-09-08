export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export class GeminiClient {
  constructor(_config: GeminiConfig) {}
  async generateStructuredResponse<T>(_prompt: string, _schema: any): Promise<{ data: T }> {
    return { data: {} as T };
  }
  async generateStructuredVisionResponse<T>(
    _prompt: string,
    _buffer: Buffer,
    _mime: string,
    _schema: any,
  ): Promise<{ data: T }> {
    return { data: {} as T };
  }
  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }
}

export class PromptTemplates {
  static getResumeParsingPrompt(_text: string): string {
    return 'Parse resume text';
  }
  static getResumeVisionPrompt(): string {
    return 'Parse resume via vision';
  }
}

export class PromptBuilder {
  static addJsonSchemaInstruction(prompt: string, _schema: any): string {
    return prompt;
  }
}
