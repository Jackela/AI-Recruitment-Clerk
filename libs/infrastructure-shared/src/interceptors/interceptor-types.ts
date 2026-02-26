// Interceptor Types and Factory

/**
 * Defines the shape of the interceptor options.
 */
export interface InterceptorOptions {
  enableMetrics?: boolean;
  timeout?: number;
  retryAttempts?: number;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Defines the shape of the execution context.
 */
export interface ExecutionContext {
  switchToHttp(): Record<string, unknown>;
  getHandler(): (...args: unknown[]) => unknown;
  getClass(): new (...args: unknown[]) => unknown;
}

/**
 * Defines the shape of the call handler.
 */
export interface CallHandler {
  handle(): unknown;
}

/**
 * Defines the shape of the interceptor.
 */
export interface Interceptor {
  intercept(context: ExecutionContext, next: CallHandler): unknown;
}

/**
 * Represents the error interceptor factory.
 */
export class ErrorInterceptorFactory {
  /**
   * Creates correlation interceptor.
   * @param _serviceName - The service name.
   * @param _options - The options.
   * @returns The Interceptor.
   */
  public static createCorrelationInterceptor(
    _serviceName: string,
    _options?: InterceptorOptions,
  ): Interceptor {
    return {
      intercept: (_context: ExecutionContext, next: CallHandler) =>
        next.handle(),
    };
  }
  /**
   * Creates logging interceptor.
   * @param _serviceName - The service name.
   * @param _options - The options.
   * @returns The Interceptor.
   */
  public static createLoggingInterceptor(
    _serviceName: string,
    _options?: InterceptorOptions,
  ): Interceptor {
    return {
      intercept: (_context: ExecutionContext, next: CallHandler) =>
        next.handle(),
    };
  }
  /**
   * Creates performance interceptor.
   * @param _serviceName - The service name.
   * @param _options - The options.
   * @returns The Interceptor.
   */
  public static createPerformanceInterceptor(
    _serviceName: string,
    _options?: InterceptorOptions,
  ): Interceptor {
    return {
      intercept: (_context: ExecutionContext, next: CallHandler) =>
        next.handle(),
    };
  }
  /**
   * Creates recovery interceptor.
   * @param _serviceName - The service name.
   * @param _options - The options.
   * @returns The Interceptor.
   */
  public static createRecoveryInterceptor(
    _serviceName: string,
    _options?: InterceptorOptions,
  ): Interceptor {
    return {
      intercept: (_context: ExecutionContext, next: CallHandler) =>
        next.handle(),
    };
  }
}
