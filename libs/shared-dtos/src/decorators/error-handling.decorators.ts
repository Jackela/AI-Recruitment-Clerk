/**
 * Error Handling Decorators - Consistent error management through decorators
 * Provides method and class-level error handling with automatic correlation and logging
 */

import { Logger } from '@nestjs/common';
import {
  EnhancedAppException,
  ExtendedErrorType,
} from '../errors/enhanced-error-types';
import { ErrorCorrelationManager } from '../errors/error-correlation';

/**
 * Interface for error handling configuration
 */
interface ErrorHandlingConfig {
  /** Default error type for this operation */
  defaultErrorType?: ExtendedErrorType | string;
  /** Default error code */
  defaultErrorCode?: string;
  /** Default severity level */
  defaultSeverity?: 'low' | 'medium' | 'high' | 'critical';
  /** Recovery strategies to include */
  recoveryStrategies?: string[];
  /** Whether to log errors automatically */
  logErrors?: boolean;
  /** Custom logger instance */
  logger?: Logger;
  /** Operation context for logging */
  operationContext?: string;
  /** Business impact level */
  businessImpact?: 'low' | 'medium' | 'high' | 'critical';
  /** User impact level */
  userImpact?: 'none' | 'minimal' | 'moderate' | 'severe';
}

/**
 * Method decorator for standardized error handling
 * Automatically catches and enhances errors with correlation context
 */
export function HandleErrors(config: ErrorHandlingConfig = {}) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const methodName = propertyName;
    const logger = config.logger || new Logger(`${className}.${methodName}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      const operationContext =
        config.operationContext || `${className}.${methodName}`;

      try {
        // Set operation context in correlation manager
        const existingContext = ErrorCorrelationManager.getContext();
        if (existingContext) {
          ErrorCorrelationManager.updateContext({
            operationName: operationContext,
          });
        }

        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        // Transform error using configuration
        const enhancedError = transformError(error, config, operationContext);

        // Log if configured
        if (config.logErrors !== false) {
          logEnhancedError(enhancedError, logger, operationContext);
        }

        throw enhancedError;
      }
    };

    return descriptor;
  };
}

/**
 * Class decorator for default error handling configuration
 * Sets default error handling behavior for all methods in the class
 */
export function DefaultErrorHandling(config: ErrorHandlingConfig) {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const className = constructor.name;
    const logger = config.logger || new Logger(className);

    // Store default config on the prototype
    constructor.prototype._defaultErrorConfig = config;
    constructor.prototype._defaultLogger = logger;

    return constructor;
  };
}

/**
 * Parameter decorator for error context injection
 * Injects error correlation context into method parameters
 */
export function ErrorContext() {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyName: string | symbol | undefined,
    parameterIndex: number,
  ) {
    if (propertyName === undefined) {
      throw new Error(
        'PropertyName cannot be undefined in ErrorContext decorator',
      );
    }
    const existingMetadata =
      Reflect.getMetadata('error:context', target, propertyName) || [];
    existingMetadata.push(parameterIndex);
    Reflect.defineMetadata(
      'error:context',
      existingMetadata,
      target,
      propertyName,
    );
  };
}

/**
 * Method decorator for retry with exponential backoff
 * Automatically retries operations with enhanced error handling
 */
export function RetryWithErrorHandling(options: {
  maxRetries?: number;
  baseDelay?: number;
  exponentialBackoff?: boolean;
  retryCondition?: (error: Error) => boolean;
  errorConfig?: ErrorHandlingConfig;
}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    exponentialBackoff = true,
    retryCondition = (error) =>
      !(
        error instanceof EnhancedAppException &&
        [
          'VALIDATION_ERROR',
          'AUTHENTICATION_ERROR',
          'AUTHORIZATION_ERROR',
        ].includes(error.enhancedDetails.type)
      ),
    errorConfig = {},
  } = options;

  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const logger =
      errorConfig.logger || new Logger(`${className}.${propertyName}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      let lastError: Error | undefined;
      let delay = baseDelay;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await method.apply(this, args);
        } catch (error) {
          lastError = error as Error;

          // Check if we should retry
          if (attempt === maxRetries || !retryCondition(lastError)) {
            break;
          }

          logger.warn(
            `Retry attempt ${attempt}/${maxRetries} for ${propertyName}`,
            {
              error: lastError.message,
              attempt,
              nextRetryIn: delay,
            },
          );

          await sleep(delay);

          if (exponentialBackoff) {
            delay *= 2;
          }
        }
      }

      // Transform final error (lastError is guaranteed to be defined here since we only reach this point after catching an error)
      const enhancedError = transformError(
        lastError as Error,
        errorConfig,
        `${className}.${propertyName}`,
      );
      throw enhancedError;
    };

    return descriptor;
  };
}

/**
 * Method decorator for performance monitoring with error correlation
 * Tracks method execution time and correlates with errors
 */
export function MonitorPerformance(
  config: {
    slowThreshold?: number;
    errorOnSlow?: boolean;
    includeArgs?: boolean;
    errorConfig?: ErrorHandlingConfig;
  } = {},
) {
  const {
    slowThreshold = 5000,
    errorOnSlow = false,
    includeArgs = false,
    errorConfig = {},
  } = config;

  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const logger =
      errorConfig.logger || new Logger(`${className}.${propertyName}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const operationContext = `${className}.${propertyName}`;

      try {
        // Update correlation context with performance tracking
        const existingContext = ErrorCorrelationManager.getContext();
        if (existingContext) {
          ErrorCorrelationManager.updateContext({
            executionTime: startTime,
            metadata: {
              ...existingContext.metadata,
              performanceTracking: true,
              args: includeArgs ? args : undefined,
            },
          });
        }

        const result = await method.apply(this, args);
        const executionTime = Date.now() - startTime;

        // Log performance metrics
        if (executionTime > slowThreshold) {
          const message = `Slow operation detected: ${operationContext} took ${executionTime}ms`;

          if (errorOnSlow) {
            const performanceError = new EnhancedAppException(
              ExtendedErrorType.PERFORMANCE_ERROR,
              'SLOW_OPERATION',
              message,
              500,
              { executionTime, threshold: slowThreshold },
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            performanceError.withSeverity('medium' as any);
            throw performanceError;
          } else {
            logger.warn(message, { executionTime, threshold: slowThreshold });
          }
        } else {
          logger.debug(`${operationContext} completed in ${executionTime}ms`);
        }

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;

        // Enhance error with performance context
        const enhancedError = transformError(
          error,
          errorConfig,
          operationContext,
        );
        enhancedError.withContext({ executionTime, failedAt: executionTime });

        throw enhancedError;
      }
    };

    return descriptor;
  };
}

/**
 * Transform error using configuration
 */
function transformError(
  error: Error,
  config: ErrorHandlingConfig,
  operationContext: string,
): EnhancedAppException {
  // If already enhanced, add additional context
  if (error instanceof EnhancedAppException) {
    if (config.recoveryStrategies) {
      error.withRecoveryStrategies(config.recoveryStrategies);
    }
    if (config.businessImpact) {
      error.withBusinessImpact(config.businessImpact);
    }
    if (config.userImpact) {
      error.withUserImpact(config.userImpact);
    }
    return error;
  }

  // Create new enhanced exception
  const enhancedError = new EnhancedAppException(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config.defaultErrorType as any) || 'SYSTEM_ERROR',
    config.defaultErrorCode || 'OPERATION_FAILED',
    error.message || 'An unexpected error occurred',
    500,
    { originalError: error.message },
    { operationContext },
  );

  // Apply configuration
  if (config.defaultSeverity) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enhancedError.withSeverity(config.defaultSeverity as any);
  }
  if (config.recoveryStrategies) {
    enhancedError.withRecoveryStrategies(config.recoveryStrategies);
  }
  if (config.businessImpact) {
    enhancedError.withBusinessImpact(config.businessImpact);
  }
  if (config.userImpact) {
    enhancedError.withUserImpact(config.userImpact);
  }

  return enhancedError;
}

/**
 * Log enhanced error with appropriate level
 */
function logEnhancedError(
  error: EnhancedAppException,
  logger: Logger,
  operationContext: string,
): void {
  const logData = {
    operationContext,
    errorType: error.enhancedDetails.type,
    errorCode: error.enhancedDetails.code,
    severity: error.enhancedDetails.severity,
    correlationId: error.enhancedDetails.correlationContext?.traceId,
    details: error.enhancedDetails.details,
  };

  switch (error.enhancedDetails.severity) {
    case 'critical':
      logger.fatal(error.message, logData);
      break;
    case 'high':
      logger.error(error.message, logData);
      break;
    case 'medium':
      logger.warn(error.message, logData);
      break;
    case 'low':
      logger.debug(error.message, logData);
      break;
    default:
      logger.error(error.message, logData);
  }
}

/**
 * Utility function for sleep delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
