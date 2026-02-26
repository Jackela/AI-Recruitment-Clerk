// Retry Utility Implementation

/**
 * Represents the retry utility.
 */
export class RetryUtility {
  /**
   * Performs the retry operation.
   * @param operation - The operation.
   * @param maxAttempts - The max attempts.
   * @param delay - The delay.
   * @returns A promise that resolves to T.
   */
  public static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxAttempts) break;
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError || new Error('Operation failed after maximum attempts');
  }

  /**
   * Performs the with exponential backoff operation.
   * @param operation - The operation.
   * @param options - The options.
   * @returns A promise that resolves to T.
   */
  public static async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelayMs?: number;
      maxDelayMs?: number;
      backoffMultiplier?: number;
      jitterMs?: number;
    } = {},
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelayMs = 1000,
      maxDelayMs = 10000,
      backoffMultiplier = 2,
      jitterMs = 500,
    } = options;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) break;

        let delay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
        delay = Math.min(delay, maxDelayMs);

        // Add jitter
        const jitter = (Math.random() - 0.5) * 2 * jitterMs;
        delay = Math.max(0, delay + jitter);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Operation failed after maximum attempts');
  }
}
