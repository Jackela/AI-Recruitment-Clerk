/**
 * Stub Gemini Client for test environments
 * Provides a mock implementation that returns test-configurable responses
 */

export class GeminiClient {
  /**
   * Health check - returns OK for test mode
   */
  public async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  /**
   * Generates structured response - returns empty data for test mode
   */
  public async generateStructuredResponse<T>(
    _prompt: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _schema: any,
  ): Promise<{ data: T }> {
    return { data: {} as T };
  }

  /**
   * Generates structured vision response - returns empty data for test mode
   */
  public async generateStructuredVisionResponse<T>(
    _prompt: string,
    _buffer: Buffer,
    _mime: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _schema: any,
  ): Promise<{ data: T }> {
    return { data: {} as T };
  }
}
