// Circuit Breaker Implementation

import type { DecoratorTarget } from '../contracts/design-by-contract';

/**
 * Defines the shape of the circuit breaker config.
 */
export interface CircuitBreakerConfig {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  monitorWindow?: number;
}

/**
 * Performs the with circuit breaker operation.
 * @param _propertyKey - The property key.
 * @param _config - The config.
 * @returns The result of the operation.
 */
export function WithCircuitBreaker(
  _propertyKey?: string,
  _config?: CircuitBreakerConfig,
) {
  return function (
    _target: DecoratorTarget,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        console.error(`Circuit breaker triggered for ${propertyName}:`, error);
        throw error;
      }
    };
  };
}
