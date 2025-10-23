/**
 * Error Handling Interceptors
 * Provides correlation, logging, and performance tracking interceptors
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { Request, Response } from 'express';

import {
  ErrorCorrelationManager,
} from './error-correlation';
import {
  StructuredErrorLogger,
  StructuredLoggerFactory,
  PerformanceMetrics,
} from './structured-logging';
import { EnhancedAppException } from './enhanced-error-types';

/**
 * Error correlation interceptor
 * Manages correlation context for request tracing
 */
@Injectable()
export class ErrorCorrelationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorCorrelationInterceptor.name);

  /**
   * Initializes a new instance of the Error Correlation Interceptor.
   * @param serviceName - The service name.
   */
  constructor(private readonly serviceName: string) {}

  /**
   * Performs the intercept operation.
   * @param context - The context.
   * @param next - The next.
   * @returns The Observable<any>.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Get operation name from the execution context
    const operationName = this.getOperationName(context);

    // Create or propagate correlation context
    const correlationContext = ErrorCorrelationManager.createContextFromRequest(
      request,
      this.serviceName,
      operationName,
    );

    // Set correlation headers in response
    response.setHeader('X-Trace-ID', correlationContext.traceId);
    response.setHeader('X-Request-ID', correlationContext.requestId);
    response.setHeader('X-Span-ID', correlationContext.spanId);

    // Execute within correlation context
    ErrorCorrelationManager.setContext(correlationContext);

    return next.handle().pipe(
      tap(() => {
        // Request completed successfully
        this.logger.debug(`Request completed: ${correlationContext.traceId}`);
      }),
      catchError((error) => {
        // Ensure error has correlation context
        if (error instanceof EnhancedAppException) {
          error.withCorrelation(correlationContext);
        }

        return throwError(() => error);
      }),
      finalize(() => {
        // Clean up correlation context
        ErrorCorrelationManager.clearContext();
      }),
    );
  }

  /**
   * Extract operation name from execution context
   */
  private getOperationName(context: ExecutionContext): string {
    const handler = context.getHandler();
    const controller = context.getClass();

    return `${controller.name}.${handler.name}`;
  }
}

/**
 * Error logging interceptor
 * Provides structured logging for all operations
 */
@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly structuredLogger: StructuredErrorLogger;

  /**
   * Initializes a new instance of the Error Logging Interceptor.
   * @param serviceName - The service name.
   */
  constructor(private readonly serviceName: string) {
    this.structuredLogger = StructuredLoggerFactory.getLogger(serviceName);
  }

  /**
   * Performs the intercept operation.
   * @param context - The context.
   * @param next - The next.
   * @returns The Observable<any>.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const operationName = this.getOperationName(context);
    const startMetrics = this.structuredLogger.logOperationStart(operationName);

    return next.handle().pipe(
      tap((result) => {
        // Log successful completion
        this.structuredLogger.logOperationComplete(
          operationName,
          startMetrics,
          true,
          {
            resultType: typeof result,
            hasResult: result !== undefined && result !== null,
          },
        );
      }),
      catchError((error) => {
        // Log error completion
        this.structuredLogger.logOperationComplete(
          operationName,
          startMetrics,
          false,
          {
            errorType: error?.constructor?.name || 'Unknown',
            errorMessage: error?.message || 'Unknown error',
          },
        );

        // Log the error itself if it's an enhanced exception
        if (error instanceof EnhancedAppException) {
          this.structuredLogger.logError(error, operationName);
        }

        return throwError(() => error);
      }),
    );
  }

  /**
   * Extract operation name from execution context
   */
  private getOperationName(context: ExecutionContext): string {
    const handler = context.getHandler();
    const controller = context.getClass();

    return `${controller.name}.${handler.name}`;
  }
}

/**
 * Performance tracking interceptor
 * Tracks execution time and resource usage
 */
@Injectable()
export class PerformanceTrackingInterceptor implements NestInterceptor {
  private readonly structuredLogger: StructuredErrorLogger;
  private readonly logger = new Logger(PerformanceTrackingInterceptor.name);

  /**
   * Initializes a new instance of the Performance Tracking Interceptor.
   * @param serviceName - The service name.
   * @param performanceThresholds - The performance thresholds.
   */
  constructor(
    private readonly serviceName: string,
    private readonly performanceThresholds: {
      warnThreshold?: number; // milliseconds
      errorThreshold?: number; // milliseconds
    } = {},
  ) {
    this.structuredLogger = StructuredLoggerFactory.getLogger(serviceName);
    this.performanceThresholds = {
      warnThreshold: 1000, // 1 second
      errorThreshold: 5000, // 5 seconds
      ...performanceThresholds,
    };
  }

  /**
   * Performs the intercept operation.
   * @param context - The context.
   * @param next - The next.
   * @returns The Observable<any>.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const operationName = this.getOperationName(context);
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();

    return next.handle().pipe(
      finalize(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage(startCpu);

        const performanceMetrics: PerformanceMetrics = {
          startTime,
          endTime,
          duration,
          memoryUsage: endMemory,
          cpuUsage: endCpu,
        };

        // Log performance metrics
        this.structuredLogger.logPerformance(
          operationName,
          performanceMetrics,
          {
            memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
            cpuUserTime: endCpu.user / 1000,
            cpuSystemTime: endCpu.system / 1000,
          },
        );

        // Check performance thresholds
        this.checkPerformanceThresholds(operationName, duration);

        // Update correlation context with execution time
        const context = ErrorCorrelationManager.getContext();
        if (context) {
          context.executionTime = duration;
        }
      }),
    );
  }

  /**
   * Check if performance exceeds thresholds
   */
  private checkPerformanceThresholds(
    operationName: string,
    duration: number,
  ): void {
    const { warnThreshold, errorThreshold } = this.performanceThresholds;

    if (errorThreshold && duration > errorThreshold) {
      this.logger.error(
        `PERFORMANCE ALERT: ${operationName} took ${duration}ms (threshold: ${errorThreshold}ms)`,
        {
          operationName,
          duration,
          threshold: errorThreshold,
          severity: 'critical',
        },
      );
    } else if (warnThreshold && duration > warnThreshold) {
      this.logger.warn(
        `PERFORMANCE WARNING: ${operationName} took ${duration}ms (threshold: ${warnThreshold}ms)`,
        {
          operationName,
          duration,
          threshold: warnThreshold,
          severity: 'warning',
        },
      );
    }
  }

  /**
   * Extract operation name from execution context
   */
  private getOperationName(context: ExecutionContext): string {
    const handler = context.getHandler();
    const controller = context.getClass();

    return `${controller.name}.${handler.name}`;
  }
}

/**
 * Error recovery interceptor
 * Provides automatic error recovery strategies
 */
@Injectable()
export class ErrorRecoveryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorRecoveryInterceptor.name);
  private readonly circuitBreakers = new Map<
    string,
    {
      failures: number;
      lastFailure: number;
      state: 'closed' | 'open' | 'half-open';
    }
  >();

  /**
   * Initializes a new instance of the Error Recovery Interceptor.
   * @param serviceName - The service name.
   * @param recoveryConfig - The recovery config.
   */
  constructor(
    private readonly serviceName: string,
    private readonly recoveryConfig: {
      enableCircuitBreaker?: boolean;
      failureThreshold?: number;
      recoveryTimeout?: number;
      enableRetry?: boolean;
      maxRetries?: number;
    } = {},
  ) {
    this.recoveryConfig = {
      enableCircuitBreaker: true,
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      enableRetry: false, // Disabled by default to avoid infinite loops
      maxRetries: 3,
      ...recoveryConfig,
    };
  }

  /**
   * Performs the intercept operation.
   * @param context - The context.
   * @param next - The next.
   * @returns The Observable<any>.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const operationName = this.getOperationName(context);

    // Check circuit breaker state
    if (
      this.recoveryConfig.enableCircuitBreaker &&
      this.isCircuitOpen(operationName)
    ) {
      const circuitBreakerError = new EnhancedAppException(
        'EXTERNAL_SERVICE_ERROR' as any,
        'CIRCUIT_BREAKER_OPEN',
        `Circuit breaker is open for operation: ${operationName}`,
        503,
      )
        .withBusinessImpact('high')
        .withUserImpact('severe')
        .withRecoveryStrategies([
          'Wait for circuit breaker to reset',
          'Use alternative service',
          'Enable fallback mechanism',
        ]);

      return throwError(() => circuitBreakerError);
    }

    return next.handle().pipe(
      tap(() => {
        // Operation succeeded, reset circuit breaker
        if (this.recoveryConfig.enableCircuitBreaker) {
          this.resetCircuitBreaker(operationName);
        }
      }),
      catchError((error) => {
        // Record failure for circuit breaker
        if (this.recoveryConfig.enableCircuitBreaker) {
          this.recordFailure(operationName);
        }

        // Enhance error with recovery context
        if (error instanceof EnhancedAppException) {
          const recoveryStrategies = this.getRecoveryStrategies(
            error,
            operationName,
          );
          error.withRecoveryStrategies(recoveryStrategies);

          // Add circuit breaker information
          if (this.recoveryConfig.enableCircuitBreaker) {
            const circuitState = this.circuitBreakers.get(operationName);
            if (circuitState) {
              error.withMonitoringTags({
                'circuit.state': circuitState.state,
                'circuit.failures': circuitState.failures.toString(),
              });
            }
          }
        }

        return throwError(() => error);
      }),
    );
  }

  /**
   * Check if circuit breaker is open for operation
   */
  private isCircuitOpen(operationName: string): boolean {
    const circuit = this.circuitBreakers.get(operationName);
    if (!circuit) return false;

    const now = Date.now();

    if (circuit.state === 'open') {
      // Check if recovery timeout has passed
      if (now - circuit.lastFailure > this.recoveryConfig.recoveryTimeout!) {
        circuit.state = 'half-open';
        this.logger.log(`Circuit breaker half-open for ${operationName}`);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record failure for circuit breaker
   */
  private recordFailure(operationName: string): void {
    let circuit = this.circuitBreakers.get(operationName);
    if (!circuit) {
      circuit = { failures: 0, lastFailure: 0, state: 'closed' };
      this.circuitBreakers.set(operationName, circuit);
    }

    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= this.recoveryConfig.failureThreshold!) {
      circuit.state = 'open';
      this.logger.error(
        `Circuit breaker opened for ${operationName} after ${circuit.failures} failures`,
        { operationName, failures: circuit.failures },
      );
    }
  }

  /**
   * Reset circuit breaker after successful operation
   */
  private resetCircuitBreaker(operationName: string): void {
    const circuit = this.circuitBreakers.get(operationName);
    if (circuit && circuit.state !== 'closed') {
      circuit.failures = 0;
      circuit.state = 'closed';
      this.logger.log(`Circuit breaker reset for ${operationName}`);
    }
  }

  /**
   * Get recovery strategies based on error type
   */
  private getRecoveryStrategies(
    error: EnhancedAppException,
    operationName: string,
  ): string[] {
    const baseStrategies = error.enhancedDetails.recoveryStrategies || [];
    const contextStrategies: string[] = [];

    // Add circuit breaker specific strategies
    if (this.recoveryConfig.enableCircuitBreaker) {
      const circuit = this.circuitBreakers.get(operationName);
      if (circuit && circuit.state === 'open') {
        contextStrategies.push(
          `Wait ${Math.round(this.recoveryConfig.recoveryTimeout! / 1000)}s for circuit breaker reset`,
        );
      }
    }

    // Add retry strategies if enabled
    if (this.recoveryConfig.enableRetry) {
      contextStrategies.push(
        `Retry operation (max ${this.recoveryConfig.maxRetries} attempts)`,
      );
    }

    return [...baseStrategies, ...contextStrategies];
  }

  /**
   * Extract operation name from execution context
   */
  private getOperationName(context: ExecutionContext): string {
    const handler = context.getHandler();
    const controller = context.getClass();

    return `${controller.name}.${handler.name}`;
  }
}

/**
 * Factory functions for creating interceptors
 */
export class ErrorInterceptorFactory {
  /**
   * Create correlation interceptor
   */
  static createCorrelationInterceptor(
    serviceName: string,
  ): ErrorCorrelationInterceptor {
    return new ErrorCorrelationInterceptor(serviceName);
  }

  /**
   * Create logging interceptor
   */
  static createLoggingInterceptor(
    serviceName: string,
  ): ErrorLoggingInterceptor {
    return new ErrorLoggingInterceptor(serviceName);
  }

  /**
   * Create performance tracking interceptor
   */
  static createPerformanceInterceptor(
    serviceName: string,
    thresholds?: { warnThreshold?: number; errorThreshold?: number },
  ): PerformanceTrackingInterceptor {
    return new PerformanceTrackingInterceptor(serviceName, thresholds);
  }

  /**
   * Create error recovery interceptor
   */
  static createRecoveryInterceptor(
    serviceName: string,
    config?: {
      enableCircuitBreaker?: boolean;
      failureThreshold?: number;
      recoveryTimeout?: number;
    },
  ): ErrorRecoveryInterceptor {
    return new ErrorRecoveryInterceptor(serviceName, config);
  }

  /**
   * Create complete set of error handling interceptors
   */
  static createCompleteSet(
    serviceName: string,
    options: {
      enableCorrelation?: boolean;
      enableLogging?: boolean;
      enablePerformance?: boolean;
      enableRecovery?: boolean;
      performanceThresholds?: {
        warnThreshold?: number;
        errorThreshold?: number;
      };
      recoveryConfig?: {
        enableCircuitBreaker?: boolean;
        failureThreshold?: number;
        recoveryTimeout?: number;
      };
    } = {},
  ): any[] {
    const {
      enableCorrelation = true,
      enableLogging = true,
      enablePerformance = true,
      enableRecovery = false, // Disabled by default to avoid complexity
    } = options;

    const interceptors: any[] = [];

    if (enableCorrelation) {
      interceptors.push(this.createCorrelationInterceptor(serviceName));
    }

    if (enableLogging) {
      interceptors.push(this.createLoggingInterceptor(serviceName));
    }

    if (enablePerformance) {
      interceptors.push(
        this.createPerformanceInterceptor(
          serviceName,
          options.performanceThresholds,
        ),
      );
    }

    if (enableRecovery) {
      interceptors.push(
        this.createRecoveryInterceptor(serviceName, options.recoveryConfig),
      );
    }

    return interceptors;
  }
}
