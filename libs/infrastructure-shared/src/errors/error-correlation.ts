// Error Correlation Manager

/**
 * Represents the error correlation manager.
 */
export class ErrorCorrelationManager {
  private static context: { traceId?: string; requestId?: string } = {};

  /**
   * Sets context.
   * @param context - The context.
   * @returns The result of the operation.
   */
  public static setContext(context: {
    traceId?: string;
    requestId?: string;
  }): void {
    this.context = context;
  }

  /**
   * Retrieves context.
   * @returns The result of the operation.
   */
  public static getContext(): { traceId?: string; requestId?: string } {
    return { ...this.context };
  }

  /**
   * Generates trace id.
   * @returns The string value.
   */
  public static generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
