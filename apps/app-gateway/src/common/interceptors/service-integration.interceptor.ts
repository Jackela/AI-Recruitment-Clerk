import type {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import {
  Injectable,
  ServiceUnavailableException,
  RequestTimeoutException,
  Logger,
  Inject,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { throwError, of } from 'rxjs';
import { catchError, timeout, retry, tap } from 'rxjs/operators';
import type { Cache } from 'cache-manager';

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
  serviceHealthChecks?: Record<string, () => boolean | Promise<boolean>>;
  circuitBreaker?: {
    threshold?: number;
    timeout?: number;
    resetTimeout?: number;
  };
}

/**
 * Represents the service integration interceptor.
 */
@Injectable()
export class ServiceIntegrationInterceptor implements NestInterceptor {
  private readonly logger: Logger = new Logger(
    ServiceIntegrationInterceptor.name,
  );
  private circuitBreakerStates: Map<
    string,
    {
      failures: number;
      isOpen: boolean;
      lastFailure: number;
    }
  > = new Map();

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
  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Observable<any>> {
    const timeoutMs = this.options.timeout ?? 30000; // 30 seconds default
    const maxRetries = this.options.retries ?? 3;

    // Check if context has switchToHttp method (for HTTP requests)
    if (!context.switchToHttp) {
      // Non-HTTP context (like WebSocket, RPC), skip request-specific logic
      return next.handle().pipe(
        timeout(timeoutMs),
        retry(maxRetries),
        catchError((error) => {
          this.logger.error(
            `Service integration error: ${error.message}`,
            error.stack,
          );
          return throwError(() => error);
        }),
      );
    }

    const request = context.switchToHttp().getRequest();
    if (!request) {
      throw new Error('Invalid context');
    }
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
      const cachedResult = await this.cacheManager.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Cache hit for ${operationId}`);
        return of(cachedResult);
      }
    }

    // Validate required services
    if (this.options.validateServices && this.options.requiredServices) {
      await this.validateRequiredServices(this.options.requiredServices);
    }

    return next.handle().pipe(
      timeout(timeoutMs),
      retry(maxRetries),
      tap(async (result) => {
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
      catchError((error) => {
        this.logger.error(
          `Service integration error in ${operationId}: ${error.message}`,
          error.stack,
        );

        // Update circuit breaker on failure
        if (this.options.circuitBreaker) {
          this.recordFailure(operationId);
        }

        // Handle specific error types
        if (error.name === 'TimeoutError') {
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

        return throwError(() => error);
      }),
    );
  }

  /**
   * Generates a cache key.
   * @param request - The request.
   * @param operationId - The operation id.
   * @returns The cache key.
   */
  private generateCacheKey(request: unknown, operationId: string): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (request as any).body;
    const bodyHash = body ? JSON.stringify(body) : '';
    return `service:${operationId}:${bodyHash}`;
  }

  /**
   * Validates the required services.
   * @param services - The services.
   */
  private async validateRequiredServices(services: string[]): Promise<void> {
    this.logger.debug(`Validating services: ${services.join(', ')}`);

    const unavailableServices: string[] = [];

    for (const service of services) {
      const healthCheck = this.options.serviceHealthChecks?.[service];
      const isAvailable = healthCheck ? await healthCheck() : true;

      if (!isAvailable) {
        unavailableServices.push(service);
      }
    }

    if (unavailableServices.length > 0) {
      throw new ServiceUnavailableException(
        `Required services unavailable: ${unavailableServices.join(', ')}`,
      );
    }
  }

  /**
   * Checks if circuit breaker is open.
   * @param operationId - The operation id.
   * @returns True if circuit breaker is open, false otherwise.
   */
  private isCircuitBreakerOpen(operationId: string): boolean {
    const state = this.circuitBreakerStates.get(operationId);
    if (!state) return false;

    if (state.isOpen) {
      const now = Date.now();
      const resetTimeout = this.options.circuitBreaker?.resetTimeout || 60000;
      if (now - state.lastFailure > resetTimeout) {
        // Try half-open state
        state.isOpen = false;
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Records a failure.
   * @param operationId - The operation id.
   */
  private recordFailure(operationId: string): void {
    const state = this.circuitBreakerStates.get(operationId) || {
      failures: 0,
      isOpen: false,
      lastFailure: 0,
    };

    state.failures++;
    state.lastFailure = Date.now();

    const threshold = this.options.circuitBreaker?.threshold || 5;
    if (state.failures >= threshold) {
      state.isOpen = true;
      this.logger.warn(`Circuit breaker opened for ${operationId}`);
    }

    this.circuitBreakerStates.set(operationId, state);
  }

  /**
   * Resets the circuit breaker.
   * @param operationId - The operation id.
   */
  private resetCircuitBreaker(operationId: string): void {
    this.circuitBreakerStates.delete(operationId);
  }

  /**
   * Handles the fallback.
   * @param operationId - The operation id.
   * @param error - The error.
   * @returns The fallback result.
   */
  private handleFallback(
    operationId: string,
    error: Error,
  ): Observable<{ fallback: true; operationId: string; error: string }> {
    this.logger.warn(`Using fallback response for ${operationId}`, {
      error: error.message,
    });

    return of({
      fallback: true,
      operationId,
      error: error.message,
    });
  }
}
