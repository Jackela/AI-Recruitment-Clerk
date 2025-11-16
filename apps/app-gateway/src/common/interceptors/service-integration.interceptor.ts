import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
  RequestTimeoutException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError, timeout, retry, tap } from 'rxjs/operators';
import { Cache } from 'cache-manager';
import type { Request } from 'express';

/**
 * Defines the shape of the service integration options.
 */
export interface ServiceIntegrationOptions {
  timeout?: number;
  retries?: number;
  fallback?: boolean;
  cacheable?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  requiredServices?: string[];
  validateServices?: boolean;
  circuitBreaker?: {
    threshold?: number;
    timeout?: number;
    resetTimeout?: number;
  };
}

type FallbackResponse = {
  success: false;
  error: string;
  message: string;
  fallback: true;
  originalError?: string;
};

/**
 * Represents the service integration interceptor.
 */
@Injectable()
export class ServiceIntegrationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ServiceIntegrationInterceptor.name);
  private circuitBreakerStates = new Map<
    string,
    {
      failures: number;
      isOpen: boolean;
      lastFailure: number;
    }
  >();

  /**
   * Initializes a new instance of the Service Integration Interceptor.
   * @param options - The options.
   * @param cacheManager - The cache manager.
   */
  constructor(
    private readonly options: ServiceIntegrationOptions = {},
    @Inject('CACHE_MANAGER') private readonly cacheManager?: Cache,
  ) {}

  /**
   * Performs the intercept operation.
   * @param context - The context.
   * @param next - The next.
   * @returns A promise that resolves to Observable<unknown>.
   */
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;
    const operationId = `${className}.${methodName}`;

    // Check circuit breaker
    if (this.options.circuitBreaker && this.isCircuitBreakerOpen(operationId)) {
      throw new ServiceUnavailableException(
        'Service temporarily unavailable due to repeated failures',
      );
    }

    // Check cache if enabled
    if (this.options.cacheable && this.cacheManager) {
      const cacheKey = this.generateCacheKey(request, operationId);
      const cachedResult = await this.cacheManager.get<unknown>(cacheKey);
      if (cachedResult !== undefined) {
        this.logger.debug(`Cache hit for ${operationId}`);
        return of(cachedResult);
      }
    }

    // Validate required services
    if (this.options.validateServices && this.options.requiredServices) {
      await this.validateRequiredServices(this.options.requiredServices);
    }

    const timeoutMs = this.options.timeout || 30000; // 30 seconds default
    const maxRetries = this.options.retries || 3;

    return next.handle().pipe(
      timeout(timeoutMs),
      retry(maxRetries),
      tap(async (result: unknown) => {
        // Cache successful result
        if (this.options.cacheable && this.cacheManager && result) {
          const cacheKey = this.generateCacheKey(request, operationId);
          const ttl = this.options.cacheTTL || 300; // 5 minutes default
          await this.cacheManager.set(cacheKey, result, ttl);
        }

        // Reset circuit breaker on success
        if (this.options.circuitBreaker) {
          this.resetCircuitBreaker(operationId);
        }
      }),
      catchError((error: unknown) => {
        const errorMessage = this.getErrorMessage(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Service integration error in ${operationId}: ${errorMessage}`,
          errorStack,
        );

        // Update circuit breaker on failure
        if (this.options.circuitBreaker) {
          this.recordFailure(operationId);
        }

        // Handle specific error types
        if (this.isTimeoutError(error)) {
          return throwError(
            () =>
              new RequestTimeoutException(
                `Service operation ${operationId} timed out after ${timeoutMs}ms`,
              ),
          );
        }

        // Fallback handling
        if (this.options.fallback) {
          return this.handleFallback(operationId, error);
        }

        return throwError(() => this.ensureError(error));
      }),
    );
  }

  private generateCacheKey(request: Request, operationId: string): string {
    if (this.options.cacheKey) {
      return this.options.cacheKey;
    }

    // Generate cache key based on operation and request parameters
    const params = JSON.stringify({
      url: request.url,
      query: request.query,
      body: request.body,
    });
    const hash = Buffer.from(params).toString('base64').slice(0, 16);
    return `service:${operationId}:${hash}`;
  }

  private async validateRequiredServices(services: string[]): Promise<void> {
    const validationPromises = services.map(async (service) => {
      try {
        // Implement health check for each service
        // This is a placeholder - implement actual service health checks
        return { service, healthy: true };
      } catch (error) {
        this.logger.warn(
          `Service ${service} is not available: ${this.getErrorMessage(error)}`,
        );
        return { service, healthy: false };
      }
    });

    const results = await Promise.all(validationPromises);
    const unhealthyServices = results.filter((r) => !r.healthy);

    if (unhealthyServices.length > 0) {
      throw new ServiceUnavailableException(
        `Required services unavailable: ${unhealthyServices.map((s) => s.service).join(', ')}`,
      );
    }
  }

  private isCircuitBreakerOpen(operationId: string): boolean {
    const state = this.circuitBreakerStates.get(operationId);
    if (!state || !this.options.circuitBreaker) return false;

    const { threshold = 5, resetTimeout = 60000 } = this.options.circuitBreaker;

    if (!state.isOpen) {
      return state.failures >= threshold;
    }

    // Check if reset timeout has passed
    if (Date.now() - state.lastFailure > resetTimeout) {
      state.isOpen = false;
      state.failures = 0;
      return false;
    }

    return true;
  }

  private recordFailure(operationId: string): void {
    if (!this.options.circuitBreaker) return;

    const state = this.circuitBreakerStates.get(operationId) || {
      failures: 0,
      isOpen: false,
      lastFailure: 0,
    };

    state.failures++;
    state.lastFailure = Date.now();

    const { threshold = 5 } = this.options.circuitBreaker;
    if (state.failures >= threshold) {
      state.isOpen = true;
      this.logger.warn(`Circuit breaker opened for ${operationId}`);
    }

    this.circuitBreakerStates.set(operationId, state);
  }

  private resetCircuitBreaker(operationId: string): void {
    const state = this.circuitBreakerStates.get(operationId);
    if (state) {
      state.failures = 0;
      state.isOpen = false;
      this.circuitBreakerStates.set(operationId, state);
    }
  }

  private handleFallback(
    operationId: string,
    error: unknown,
  ): Observable<FallbackResponse> {
    this.logger.warn(`Using fallback for ${operationId}`);

    // Return a default fallback response
    return of({
      success: false,
      error: 'Service temporarily unavailable',
      message: 'Using fallback response due to service issues',
      fallback: true,
      originalError: this.getErrorMessage(error),
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private ensureError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(this.getErrorMessage(error));
  }

  private isTimeoutError(error: unknown): boolean {
    return (
      !!error &&
      typeof error === 'object' &&
      'name' in error &&
      (error as { name?: string }).name === 'TimeoutError'
    );
  }
}
