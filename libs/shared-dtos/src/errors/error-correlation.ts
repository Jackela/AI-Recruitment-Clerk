/**
 * Cross-Service Error Correlation Utilities
 * Provides request tracing and context propagation across microservices
 */

import { randomBytes } from 'crypto';

/**
 * Error correlation context interface
 */
export interface ErrorCorrelationContext {
  requestId: string; // Unique request identifier
  traceId: string; // Distributed trace ID
  spanId: string; // Current service span
  parentSpanId?: string; // Parent service span
  userId?: string; // User context
  sessionId?: string; // Session context
  clientIp?: string; // Client information
  userAgent?: string; // User agent
  timestamp: string; // Context creation timestamp
  serviceName: string; // Originating service
  operationName: string; // Specific operation
  startTime?: number; // Operation start time
  executionTime?: number; // Operation execution time
  metadata?: Record<string, any>; // Additional context metadata
}

/**
 * Request context for HTTP operations
 */
export interface RequestContext {
  method: string;
  url: string;
  path: string;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  body?: any;
  ip?: string;
  userAgent?: string;
}

/**
 * Error correlation manager for cross-service request tracing
 */
export class ErrorCorrelationManager {
  private static readonly TRACE_HEADER_NAME = 'x-trace-id';
  private static readonly REQUEST_HEADER_NAME = 'x-request-id';
  private static readonly SPAN_HEADER_NAME = 'x-span-id';
  private static readonly PARENT_SPAN_HEADER_NAME = 'x-parent-span-id';

  // Thread-local storage for correlation context (using AsyncLocalStorage in production)
  private static currentContext: ErrorCorrelationContext | undefined =
    undefined;
  private static contextStack: ErrorCorrelationContext[] = [];

  /**
   * Generate unique request identifier
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate distributed trace identifier
   */
  static generateTraceId(): string {
    return `trace_${Date.now()}_${randomBytes(12).toString('hex')}`;
  }

  /**
   * Generate service span identifier
   */
  static generateSpanId(): string {
    return `span_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Create correlation context from HTTP request
   */
  static createContextFromRequest(
    request: any,
    serviceName: string,
    operationName: string,
  ): ErrorCorrelationContext {
    const headers = request.headers || {};

    // Extract existing correlation IDs or generate new ones
    const traceId = headers[this.TRACE_HEADER_NAME] || this.generateTraceId();
    const requestId =
      headers[this.REQUEST_HEADER_NAME] || this.generateRequestId();
    const parentSpanId = headers[this.SPAN_HEADER_NAME] || undefined;
    const spanId = this.generateSpanId();

    const context: ErrorCorrelationContext = {
      requestId,
      traceId,
      spanId,
      parentSpanId,
      userId: headers['x-user-id'] || request.user?.id || undefined,
      sessionId: headers['x-session-id'] || request.session?.id || undefined,
      clientIp: this.extractClientIp(request),
      userAgent: headers['user-agent'],
      timestamp: new Date().toISOString(),
      serviceName,
      operationName,
      metadata: {
        method: request.method,
        url: request.url,
        path: request.path || request.route?.path,
        query: request.query,
        contentType: headers['content-type'],
      },
    };

    return context;
  }

  /**
   * Create context for internal operations
   */
  static createInternalContext(
    serviceName: string,
    operationName: string,
    parentContext?: ErrorCorrelationContext,
  ): ErrorCorrelationContext {
    const context: ErrorCorrelationContext = {
      requestId: parentContext?.requestId || this.generateRequestId(),
      traceId: parentContext?.traceId || this.generateTraceId(),
      spanId: this.generateSpanId(),
      parentSpanId: parentContext?.spanId,
      userId: parentContext?.userId,
      sessionId: parentContext?.sessionId,
      timestamp: new Date().toISOString(),
      serviceName,
      operationName,
      metadata: parentContext?.metadata,
    };

    return context;
  }

  /**
   * Set current correlation context
   */
  static setContext(context: ErrorCorrelationContext): void {
    // Store previous context in stack
    if (this.currentContext) {
      this.contextStack.push(this.currentContext);
    }
    this.currentContext = context;
  }

  /**
   * Get current correlation context
   */
  static getContext(): ErrorCorrelationContext | undefined {
    return this.currentContext || undefined;
  }

  /**
   * Update current correlation context
   */
  static updateContext(updates: Partial<ErrorCorrelationContext>): void {
    if (this.currentContext) {
      this.currentContext = {
        ...this.currentContext,
        ...updates,
        metadata: {
          ...this.currentContext.metadata,
          ...updates.metadata,
        },
      };
    }
  }

  /**
   * Clear current context and restore previous
   */
  static clearContext(): void {
    this.currentContext = this.contextStack.pop() || undefined;
  }

  /**
   * Execute function with correlation context
   */
  static async withContext<T>(
    context: ErrorCorrelationContext,
    operation: () => Promise<T>,
  ): Promise<T> {
    this.setContext(context);
    try {
      const startTime = Date.now();
      const result = await operation();
      context.executionTime = Date.now() - startTime;
      return result;
    } finally {
      this.clearContext();
    }
  }

  /**
   * Create correlation headers for outbound requests
   */
  static createCorrelationHeaders(
    context?: ErrorCorrelationContext,
  ): Record<string, string> {
    const ctx = context || this.getContext();
    if (!ctx) {
      return {};
    }

    return {
      [this.TRACE_HEADER_NAME]: ctx.traceId,
      [this.REQUEST_HEADER_NAME]: ctx.requestId,
      [this.SPAN_HEADER_NAME]: ctx.spanId,
      ...(ctx.parentSpanId && {
        [this.PARENT_SPAN_HEADER_NAME]: ctx.parentSpanId,
      }),
      ...(ctx.userId && { 'x-user-id': ctx.userId }),
      ...(ctx.sessionId && { 'x-session-id': ctx.sessionId }),
    };
  }

  /**
   * Enrich context with additional metadata
   */
  static enrichContext(
    context: ErrorCorrelationContext,
    metadata: Record<string, any>,
  ): ErrorCorrelationContext {
    return {
      ...context,
      metadata: {
        ...context.metadata,
        ...metadata,
      },
    };
  }

  /**
   * Create child context for nested operations
   */
  static createChildContext(
    parentContext: ErrorCorrelationContext,
    serviceName: string,
    operationName: string,
  ): ErrorCorrelationContext {
    return {
      ...parentContext,
      spanId: this.generateSpanId(),
      parentSpanId: parentContext.spanId,
      serviceName,
      operationName,
      timestamp: new Date().toISOString(),
      executionTime: undefined, // Reset execution time for child operation
    };
  }

  /**
   * Extract client IP address from request
   */
  private static extractClientIp(request: any): string | undefined {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      undefined
    );
  }

  /**
   * Generate correlation summary for logging
   */
  static getCorrelationSummary(
    context?: ErrorCorrelationContext,
  ): Record<string, any> {
    const ctx = context || this.getContext();
    if (!ctx) {
      return {};
    }

    return {
      requestId: ctx.requestId,
      traceId: ctx.traceId,
      spanId: ctx.spanId,
      parentSpanId: ctx.parentSpanId,
      serviceName: ctx.serviceName,
      operationName: ctx.operationName,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      executionTime: ctx.executionTime,
      timestamp: ctx.timestamp,
    };
  }

  /**
   * Validate correlation context completeness
   */
  static validateContext(context: ErrorCorrelationContext): {
    isValid: boolean;
    missingFields: string[];
  } {
    const requiredFields = [
      'requestId',
      'traceId',
      'spanId',
      'serviceName',
      'operationName',
      'timestamp',
    ];
    const missingFields = requiredFields.filter(
      (field) => !(context as any)[field],
    );

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }
}

/**
 * Correlation context decorator for methods
 */
export function WithCorrelation(serviceName: string, operationName: string) {
  return function (
    _target: any,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Try to extract context from first argument (often a request object)
      let context = ErrorCorrelationManager.getContext();

      if (!context && args[0] && typeof args[0] === 'object') {
        const potentialRequest = args[0];
        if (
          potentialRequest.headers ||
          potentialRequest.method ||
          potentialRequest.url
        ) {
          context = ErrorCorrelationManager.createContextFromRequest(
            potentialRequest,
            serviceName,
            operationName,
          );
        }
      }

      if (!context) {
        context = ErrorCorrelationManager.createInternalContext(
          serviceName,
          operationName,
        );
      }

      return ErrorCorrelationManager.withContext(context, () =>
        method.apply(this, args),
      );
    };

    return descriptor;
  };
}

/**
 * Async Local Storage based correlation context (for production use)
 * This would replace the simple static storage in production environments
 */
export class AsyncCorrelationManager {
  private static asyncLocalStorage: any; // AsyncLocalStorage from 'async_hooks'

  /**
   * Performs the initialize operation.
   * @returns The result of the operation.
   */
  static initialize() {
    if (typeof require !== 'undefined') {
      try {
        const { AsyncLocalStorage } = require('async_hooks');
        this.asyncLocalStorage = new AsyncLocalStorage();
      } catch (error) {
        console.warn(
          'AsyncLocalStorage not available, falling back to basic correlation manager',
        );
      }
    }
  }

  /**
   * Performs the run operation.
   * @param context - The context.
   * @param callback - The callback.
   * @returns The T.
   */
  static run<T>(context: ErrorCorrelationContext, callback: () => T): T {
    if (this.asyncLocalStorage) {
      return this.asyncLocalStorage.run(context, callback);
    }
    // Fallback to basic context management
    return ErrorCorrelationManager.withContext(context, async () =>
      callback(),
    ) as T;
  }

  /**
   * Retrieves store.
   * @returns The ErrorCorrelationContext | undefined.
   */
  static getStore(): ErrorCorrelationContext | undefined {
    if (this.asyncLocalStorage) {
      return this.asyncLocalStorage.getStore();
    }
    return ErrorCorrelationManager.getContext();
  }
}

// Initialize async correlation manager
AsyncCorrelationManager.initialize();
