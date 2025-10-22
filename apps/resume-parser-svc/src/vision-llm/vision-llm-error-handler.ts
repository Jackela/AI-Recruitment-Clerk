import { Logger } from '@nestjs/common';

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeout: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  timeout: 30000,
};

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeoutMs: number = 60000,
    private readonly logger: Logger,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.logger.log('Circuit breaker transitioning to HALF_OPEN state');
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.logger.log('Circuit breaker transitioning to CLOSED state');
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      this.logger.warn(
        `Circuit breaker failure ${this.failures}/${this.threshold}`,
      );

      if (this.failures >= this.threshold) {
        this.logger.error('Circuit breaker transitioning to OPEN state');
        this.state = 'OPEN';
      }
      throw error;
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}

export class RetryHandler {
  private readonly logger: Logger;

  constructor(private readonly config: RetryConfig) {
    this.logger = new Logger(RetryHandler.name);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.config.initialDelayMs;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        this.logger.debug(
          `Executing ${operationName} (attempt ${attempt}/${this.config.maxAttempts})`,
        );

        return await this.withTimeout(
          operation(),
          this.config.timeout,
          `${operationName} timed out after ${this.config.timeout}ms`,
        );
      } catch (error) {
        lastError = error as Error;

        if (this.isNonRetryableError(error)) {
          this.logger.error(
            `${operationName} failed with non-retryable error`,
            error,
          );
          throw error;
        }

        if (attempt < this.config.maxAttempts) {
          this.logger.warn(
            `${operationName} failed (attempt ${attempt}/${this.config.maxAttempts}), retrying in ${delay}ms`,
            error,
          );
          await this.sleep(delay);
          delay = Math.min(
            delay * this.config.backoffMultiplier,
            this.config.maxDelayMs,
          );
        }
      }
    }

    throw new Error(
      `${operationName} failed after ${this.config.maxAttempts} retries: ${lastError?.message}`,
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle!);
    }
  }

  private isNonRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('invalid api key') ||
        message.includes('authentication failed') ||
        message.includes('forbidden') ||
        message.includes('bad request') ||
        message.includes('not found')
      );
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
