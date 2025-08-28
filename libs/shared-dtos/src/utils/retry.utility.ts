import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryIf?: (error: any) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export class RetryUtility {
  private static readonly logger = new Logger(RetryUtility.name);

  /**
   * Retry an operation with exponential backoff and jitter
   */
  static async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config: RetryOptions = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterMs: 1000,
      retryIf: (error) => this.isRetriableError(error),
      ...options
    };

    let lastError: any;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        this.logger.debug(`Attempting operation (attempt ${attempt}/${config.maxAttempts})`);
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on last attempt or if error is not retriable
        if (attempt === config.maxAttempts || !config.retryIf!(error)) {
          this.logger.error(
            `Operation failed after ${attempt} attempts: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error.stack : undefined
          );
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        );
        
        const jitter = Math.random() * config.jitterMs;
        const totalDelay = exponentialDelay + jitter;

        this.logger.warn(
          `Operation failed (attempt ${attempt}), retrying in ${totalDelay.toFixed(0)}ms: ${error instanceof Error ? error.message : String(error)}`
        );

        await this.delay(totalDelay);
      }
    }

    throw lastError;
  }

  /**
   * Determines if an error is retriable based on common patterns
   */
  private static isRetriableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP errors that are typically retriable
    if (error.status && (
      error.status === 408 || // Request Timeout
      error.status === 429 || // Too Many Requests
      error.status === 502 || // Bad Gateway
      error.status === 503 || // Service Unavailable
      error.status === 504    // Gateway Timeout
    )) {
      return true;
    }

    // Database connection errors
    if (error.message && (
      error.message.includes('connection') ||
      error.message.includes('timeout') ||
      error.message.includes('ENOTFOUND')
    )) {
      return true;
    }

    // External API errors
    if (error.name === 'GoogleGenerativeAIError' && error.status >= 500) {
      return true;
    }

    return false;
  }

  /**
   * Simple delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit Breaker implementation for preventing cascade failures
 */
export class CircuitBreaker {
  private static readonly logger = new Logger(CircuitBreaker.name);
  private static instances = new Map<string, CircuitBreaker>();

  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  private constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions
  ) {}

  static getInstance(name: string, options: CircuitBreakerOptions): CircuitBreaker {
    if (!this.instances.has(name)) {
      this.instances.set(name, new CircuitBreaker(name, options));
    }
    return this.instances.get(name)!;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        // Circuit breaker moving to HALF_OPEN state
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
        // Circuit breaker moving to CLOSED state
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
      // Circuit breaker opened after failures
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  getState(): string {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}

/**
 * Decorator for automatic retry with circuit breaker
 */
export function Retry(options: Partial<RetryOptions> = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return RetryUtility.withExponentialBackoff(
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Decorator for circuit breaker protection
 */
export function WithCircuitBreaker(
  name: string,
  options: CircuitBreakerOptions = {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000
  }
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const circuitBreaker = CircuitBreaker.getInstance(`${target.constructor.name}.${propertyKey}.${name}`, options);

    descriptor.value = async function (...args: any[]) {
      return circuitBreaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}