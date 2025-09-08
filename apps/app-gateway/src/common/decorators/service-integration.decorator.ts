import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { ServiceIntegrationInterceptor } from '../interceptors/service-integration.interceptor';

/**
 * Decorator for service integration with automatic error handling,
 * timeout management, and retry logic for microservice communications.
 */
export function ServiceIntegration(options?: {
  timeout?: number;
  retries?: number;
  fallback?: boolean;
  cacheable?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}) {
  return applyDecorators(
    UseInterceptors(new ServiceIntegrationInterceptor(options)),
  );
}

/**
 * Decorator for operations that require cross-service validation
 */
export function CrossServiceValidation(services: string[]) {
  return applyDecorators(
    UseInterceptors(
      new ServiceIntegrationInterceptor({
        requiredServices: services,
        validateServices: true,
      }),
    ),
  );
}

/**
 * Decorator for operations with circuit breaker pattern
 */
export function CircuitBreaker(options: {
  threshold?: number;
  timeout?: number;
  resetTimeout?: number;
}) {
  return applyDecorators(
    UseInterceptors(
      new ServiceIntegrationInterceptor({
        circuitBreaker: options,
      }),
    ),
  );
}
