/**
 * @fileoverview Cross-Service Error Correlation Utilities
 * @description Provides request tracing and context propagation across microservices.
 * Implements distributed tracing patterns for error tracking and debugging.
 * @module errors/error-correlation
 *
 * @example
 * // Create correlation context from HTTP request
 * const context = ErrorCorrelationManager.createContextFromRequest(
 *   request,
 *   'resume-parser-svc',
 *   'parseResume'
 * );
 *
 * // Use context in async operation
 * await ErrorCorrelationManager.withContext(context, async () => {
 *   // All errors within this scope will include correlation context
 *   await processResume();
 * });
 *
 * // Create headers for outbound service calls
 * const headers = ErrorCorrelationManager.createCorrelationHeaders();
 */

import { randomBytes } from 'crypto';

/**
 * Metadata structure for error correlation context.
 * Contains HTTP request details for debugging and tracing.
 * Uses unknown for flexibility while maintaining type safety.
 *
 * @example
 * const metadata: CorrelationMetadata = {
 *   method: 'POST',
 *   url: '/api/resumes/upload',
 *   path: '/api/resumes/upload',
 *   query: { format: 'pdf' },
 *   contentType: 'multipart/form-data'
 * };
 */
export interface CorrelationMetadata {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method?: string;
  /** Full request URL including query string */
  url?: string;
  /** Route path without query string */
  path?: string | undefined;
  /** Parsed query parameters as key-value pairs */
  query?: Record<string, unknown>;
  /** Content-Type header value */
  contentType?: string;
  /** Additional context-specific properties */
  [key: string]: unknown;
}

/**
 * Error correlation context interface for distributed tracing.
 * Contains all identifiers and metadata needed to trace a request
 * across multiple microservices.
 *
 * @example
 * const context: ErrorCorrelationContext = {
 *   requestId: 'req_1709123456789_a1b2c3d4e5f6',
 *   traceId: 'trace_1709123456789_a1b2c3d4e5f6g7h8i9j0',
 *   spanId: 'span_12345678abcdef',
 *   parentSpanId: 'span_abcdefgh123456',
 *   userId: 'user-123',
 *   serviceName: 'resume-parser-svc',
 *   operationName: 'parseResume',
 *   timestamp: '2024-02-28T10:30:00.000Z',
 *   clientIp: '192.168.1.100'
 * };
 */
export interface ErrorCorrelationContext {
  /** Unique request identifier for this specific request */
  requestId: string;
  /** Distributed trace ID that spans across all services */
  traceId: string;
  /** Current service span identifier */
  spanId: string;
  /** Parent service span identifier for nested calls */
  parentSpanId?: string;
  /** Authenticated user ID if available */
  userId?: string;
  /** Session ID for user session tracking */
  sessionId?: string;
  /** Client IP address (respects X-Forwarded-For header) */
  clientIp?: string;
  /** User agent string from request headers */
  userAgent?: string;
  /** ISO 8601 timestamp when context was created */
  timestamp: string;
  /** Name of the service where this context originated */
  serviceName: string;
  /** Name of the specific operation being performed */
  operationName: string;
  /** Unix timestamp in milliseconds when operation started */
  startTime?: number;
  /** Operation execution time in milliseconds */
  executionTime?: number;
  /** Additional HTTP request metadata */
  metadata?: CorrelationMetadata;
}

/**
 * Request context for HTTP operations.
 * Provides a simplified view of HTTP request data for correlation purposes.
 *
 * @example
 * const requestContext: RequestContext = {
 *   method: 'POST',
 *   url: '/api/resumes/upload?format=pdf',
 *   path: '/api/resumes/upload',
 *   query: { format: 'pdf' },
 *   headers: { 'content-type': 'multipart/form-data' },
 *   body: { resumeId: 'resume-123' },
 *   ip: '192.168.1.100',
 *   userAgent: 'Mozilla/5.0...'
 * };
 */
export interface RequestContext {
  /** HTTP method */
  method: string;
  /** Full request URL */
  url: string;
  /** Route path */
  path: string;
  /** Query parameters */
  query?: Record<string, unknown>;
  /** Request headers as key-value pairs */
  headers?: Record<string, string>;
  /** Request body (may be parsed JSON or raw) */
  body?: unknown;
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
}

/**
 * HTTP request-like object structure for correlation context extraction.
 * Designed to be compatible with NestJS Express request objects and similar interfaces.
 * All properties are optional to support various request-like objects.
 *
 * @example
 * // From NestJS controller
 * @Get()
 * async handleRequest(@Req() req: HttpRequestLike) {
 *   const context = ErrorCorrelationManager.createContextFromRequest(
 *     req,
 *     'my-service',
 *     'handleRequest'
 *   );
 * }
 */
export interface HttpRequestLike {
  /** HTTP headers (supports both single and multi-value headers) */
  headers?: Record<string, string | string[] | undefined>;
  /** HTTP method */
  method?: string;
  /** Full request URL */
  url?: string;
  /** Route path */
  path?: string;
  /** Express/NestJS route object containing path pattern */
  route?: { path?: string };
  /** Parsed query string parameters */
  query?: Record<string, unknown>;
  /** Client IP from Express */
  ip?: string;
  /** Authenticated user object */
  user?: { id?: string };
  /** Session object */
  session?: { id?: string };
  /** Node.js connection object */
  connection?: { remoteAddress?: string };
  /** Node.js socket object */
  socket?: { remoteAddress?: string };
}

/**
 * Error correlation manager for cross-service request tracing.
 * Provides static methods for creating, managing, and propagating correlation context
 * across microservice boundaries.
 *
 * @example
 * // Create context from incoming HTTP request
 * const context = ErrorCorrelationManager.createContextFromRequest(
 *   request,
 *   'scoring-engine-svc',
 *   'calculateScore'
 * );
 *
 * // Execute operation with correlation context
 * const result = await ErrorCorrelationManager.withContext(context, async () => {
 *   return await scoringService.calculateScore(resumeId, jobId);
 * });
 *
 * // Create headers for outbound service call
 * const headers = ErrorCorrelationManager.createCorrelationHeaders(context);
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
   * Generates a unique request identifier.
   * Format: `req_{timestamp}_{random_hex}`
   *
   * @returns A unique request ID string
   * @example
   * const requestId = ErrorCorrelationManager.generateRequestId();
   * // Returns: 'req_1709123456789_a1b2c3d4e5f6'
   */
  public static generateRequestId(): string {
    return `req_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Generates a distributed trace identifier.
   * Format: `trace_{timestamp}_{random_hex}`
   *
   * @returns A unique trace ID string
   * @example
   * const traceId = ErrorCorrelationManager.generateTraceId();
   * // Returns: 'trace_1709123456789_a1b2c3d4e5f6g7h8i9j0'
   */
  public static generateTraceId(): string {
    return `trace_${Date.now()}_${randomBytes(12).toString('hex')}`;
  }

  /**
   * Generates a service span identifier.
   * Format: `span_{random_hex}`
   *
   * @returns A unique span ID string
   * @example
   * const spanId = ErrorCorrelationManager.generateSpanId();
   * // Returns: 'span_a1b2c3d4e5f6g7h8'
   */
  public static generateSpanId(): string {
    return `span_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Creates a correlation context from an HTTP request object.
   * Extracts existing correlation IDs from headers or generates new ones.
   *
   * @param request - The HTTP request object (NestJS/Express compatible)
   * @param serviceName - Name of the service processing the request
   * @param operationName - Name of the operation being performed
   * @returns A complete ErrorCorrelationContext object
   *
   * @example
   * const context = ErrorCorrelationManager.createContextFromRequest(
   *   request,
   *   'resume-parser-svc',
   *   'parseResume'
   * );
   * console.log(context.traceId); // Existing or new trace ID
   */
  public static createContextFromRequest(
    request: HttpRequestLike,
    serviceName: string,
    operationName: string,
  ): ErrorCorrelationContext {
    const headers = request.headers || {};

    // Extract existing correlation IDs or generate new ones
    const getHeader = (name: string): string | undefined => {
      const value = headers[name];
      return Array.isArray(value) ? value[0] : value;
    };

    const traceId = getHeader(this.TRACE_HEADER_NAME) || this.generateTraceId();
    const requestId =
      getHeader(this.REQUEST_HEADER_NAME) || this.generateRequestId();
    const parentSpanId = getHeader(this.SPAN_HEADER_NAME) || undefined;
    const spanId = this.generateSpanId();

    const context: ErrorCorrelationContext = {
      requestId,
      traceId,
      spanId,
      parentSpanId,
      userId: getHeader('x-user-id') || request.user?.id || undefined,
      sessionId: getHeader('x-session-id') || request.session?.id || undefined,
      clientIp: this.extractClientIp(request),
      userAgent: getHeader('user-agent'),
      timestamp: new Date().toISOString(),
      serviceName,
      operationName,
      metadata: {
        method: request.method,
        url: request.url,
        path: request.path || request.route?.path,
        query: request.query,
        contentType: getHeader('content-type'),
      },
    };

    return context;
  }

  /**
   * Creates a correlation context for internal (non-HTTP) operations.
   * Useful for background jobs, scheduled tasks, or internal service calls.
   *
   * @param serviceName - Name of the service performing the operation
   * @param operationName - Name of the operation being performed
   * @param parentContext - Optional parent context to inherit trace information
   * @returns A complete ErrorCorrelationContext object
   *
   * @example
   * // Create root context for a background job
   * const context = ErrorCorrelationManager.createInternalContext(
   *   'report-generator-svc',
   *   'generateScheduledReport'
   * );
   *
   * // Create child context inheriting from parent
   * const childContext = ErrorCorrelationManager.createInternalContext(
   *   'scoring-engine-svc',
   *   'calculateScore',
   *   parentContext
   * );
   */
  public static createInternalContext(
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
   * Sets the current correlation context.
   * Pushes the previous context onto a stack for later restoration.
   * Use with care - prefer `withContext` for automatic context management.
   *
   * @param context - The context to set as current
   *
   * @example
   * ErrorCorrelationManager.setContext(context);
   * // ... perform operations ...
   * ErrorCorrelationManager.clearContext();
   */
  public static setContext(context: ErrorCorrelationContext): void {
    // Store previous context in stack
    if (this.currentContext) {
      this.contextStack.push(this.currentContext);
    }
    this.currentContext = context;
  }

  /**
   * Gets the current correlation context.
   * Returns undefined if no context has been set.
   *
   * @returns The current context or undefined
   *
   * @example
   * const context = ErrorCorrelationManager.getContext();
   * if (context) {
   *   console.log(`Trace ID: ${context.traceId}`);
   * }
   */
  public static getContext(): ErrorCorrelationContext | undefined {
    return this.currentContext || undefined;
  }

  /**
   * Updates the current correlation context with partial changes.
   * Only affects the current context; does nothing if no context is set.
   *
   * @param updates - Partial context object with fields to update
   *
   * @example
   * ErrorCorrelationManager.updateContext({
   *   metadata: { customField: 'value' }
   * });
   */
  public static updateContext(updates: Partial<ErrorCorrelationContext>): void {
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
   * Clears the current context and restores the previous context from the stack.
   * Call this after `setContext` when the operation is complete.
   *
   * @example
   * ErrorCorrelationManager.setContext(context);
   * try {
   *   await performOperation();
   * } finally {
   *   ErrorCorrelationManager.clearContext();
   * }
   */
  public static clearContext(): void {
    this.currentContext = this.contextStack.pop() || undefined;
  }

  /**
   * Executes an async function with the specified correlation context.
   * Automatically sets the context before execution and restores the previous
   * context after completion (including on errors).
   * Tracks execution time automatically.
   *
   * @typeParam T - The return type of the operation
   * @param context - The context to use during execution
   * @param operation - The async function to execute
   * @returns The result of the operation
   *
   * @example
   * const result = await ErrorCorrelationManager.withContext(context, async () => {
   *   // All errors here will include correlation context
   *   return await processResume(resumeId);
   * });
   * console.log(`Execution time: ${context.executionTime}ms`);
   */
  public static async withContext<T>(
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
   * Creates HTTP headers for correlation context propagation to downstream services.
   * Include these headers in outbound HTTP requests to maintain trace continuity.
   *
   * @param context - Optional context to use; defaults to current context
   * @returns Headers object with correlation IDs
   *
   * @example
   * const headers = ErrorCorrelationManager.createCorrelationHeaders();
   * await fetch('http://downstream-service/api/endpoint', {
   *   headers: {
   *     ...headers,
   *     'Content-Type': 'application/json'
   *   }
   * });
   * // Returns: { 'x-trace-id': '...', 'x-request-id': '...', 'x-span-id': '...' }
   */
  public static createCorrelationHeaders(
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
   * Enriches a context with additional metadata without modifying the original.
   * Returns a new context object with merged metadata.
   *
   * @param context - The context to enrich
   * @param metadata - Additional metadata to merge
   * @returns A new context with merged metadata
   *
   * @example
   * const enrichedContext = ErrorCorrelationManager.enrichContext(context, {
   *   customField: 'value',
   *   processedBy: 'batch-job'
   * });
   */
  public static enrichContext(
    context: ErrorCorrelationContext,
    metadata: CorrelationMetadata,
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
   * Creates a child context for nested operations within a trace.
   * The child inherits the parent's trace and request IDs but gets a new span ID.
   * Use this when making internal calls to other services or components.
   *
   * @param parentContext - The parent context to inherit from
   * @param serviceName - Name of the child service
   * @param operationName - Name of the child operation
   * @returns A new child context with proper parent span linkage
   *
   * @example
   * const childContext = ErrorCorrelationManager.createChildContext(
   *   parentContext,
   *   'scoring-engine-svc',
   *   'calculateSkillMatch'
   * );
   * console.log(childContext.parentSpanId); // Same as parent's spanId
   */
  public static createChildContext(
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
  private static extractClientIp(request: HttpRequestLike): string | undefined {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const xRealIp = request.headers?.['x-real-ip'];

    return (
      (Array.isArray(forwardedFor) ? forwardedFor[0]?.split(',')[0]?.trim() : forwardedFor?.split(',')[0]?.trim()) ||
      (Array.isArray(xRealIp) ? xRealIp[0] : xRealIp) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      undefined
    );
  }

  /**
   * Gets a summary of the correlation context suitable for logging.
   * Returns a flat object with key correlation fields.
   *
   * @param context - Optional context to summarize; defaults to current context
   * @returns A flat object with correlation fields, or empty object if no context
   *
   * @example
   * const summary = ErrorCorrelationManager.getCorrelationSummary();
   * logger.info('Processing request', summary);
   * // Logs: { requestId: '...', traceId: '...', serviceName: '...', ... }
   */
  public static getCorrelationSummary(
    context?: ErrorCorrelationContext,
  ): Record<string, string | number | undefined> {
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
   * Validates that a correlation context has all required fields.
   * Required fields: requestId, traceId, spanId, serviceName, operationName, timestamp
   *
   * @param context - The context to validate
   * @returns Object with isValid flag and list of missing fields
   *
   * @example
   * const { isValid, missingFields } = ErrorCorrelationManager.validateContext(context);
   * if (!isValid) {
   *   console.warn(`Context is incomplete. Missing: ${missingFields.join(', ')}`);
   * }
   */
  public static validateContext(context: ErrorCorrelationContext): {
    isValid: boolean;
    missingFields: string[];
  } {
    const requiredFields: readonly (keyof ErrorCorrelationContext)[] = [
      'requestId',
      'traceId',
      'spanId',
      'serviceName',
      'operationName',
      'timestamp',
    ] as const;
    const missingFields = requiredFields.filter(
      (field) => !context[field],
    );

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }
}

/**
 * Decorator target type for method decorators.
 * Using a union of object and new() => unknown instead of Function for type safety.
 * @internal
 */
type DecoratorTarget = object | (new (...args: unknown[]) => unknown);

/**
 * Method decorator that automatically wraps the method in a correlation context.
 * The context is created before execution and cleared after completion.
 * Useful for ensuring all service methods have proper tracing.
 *
 * @param serviceName - Name of the service containing this method
 * @param operationName - Name to use for this operation in traces
 * @returns Method decorator function
 *
 * @example
 * class ResumeParserService {
 *   @WithCorrelation('resume-parser-svc', 'parseResume')
 *   async parseResume(file: Buffer): Promise<ResumeDTO> {
 *     // This method runs within a correlation context
 *     const context = ErrorCorrelationManager.getContext();
 *     console.log(`Trace ID: ${context?.traceId}`);
 *     return parsedResume;
 *   }
 * }
 */
export function WithCorrelation(serviceName: string, operationName: string) {
  return function (
    _target: DecoratorTarget,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      // Try to extract context from first argument (often a request object)
      let context = ErrorCorrelationManager.getContext();

      if (!context && args[0] && typeof args[0] === 'object') {
        const potentialRequest = args[0] as HttpRequestLike;
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
 * Async Local Storage based correlation context manager for production use.
 * Uses Node.js AsyncLocalStorage to automatically propagate context across
 * async operations without manual context management.
 *
 * This class provides an alternative to the static ErrorCorrelationManager
 * that works better in production environments with complex async flows.
 *
 * @example
 * // Initialize at application startup
 * AsyncCorrelationManager.initialize();
 *
 * // Run with context
 * AsyncCorrelationManager.run(context, () => {
 *   // Context is automatically available in all async operations
 *   const ctx = AsyncCorrelationManager.getStore();
 * });
 */
export class AsyncCorrelationManager {
  private static asyncLocalStorage: InstanceType<
    typeof import('async_hooks').AsyncLocalStorage<ErrorCorrelationContext>
  > | null = null;

  /**
   * Initializes the async local storage for context propagation.
   * Should be called once at application startup.
   * Falls back gracefully if AsyncLocalStorage is not available.
   *
   * @example
   * // Call in main.ts or bootstrap function
   * AsyncCorrelationManager.initialize();
   */
  public static initialize(): void {
    if (typeof require !== 'undefined') {
      try {
        const { AsyncLocalStorage } = require('async_hooks') as typeof import('async_hooks');
        this.asyncLocalStorage = new AsyncLocalStorage<ErrorCorrelationContext>();
      } catch (_error) {
        console.warn(
          'AsyncLocalStorage not available, falling back to basic correlation manager',
        );
      }
    }
  }

  /**
   * Runs a callback function within a correlation context.
   * The context is automatically available to all async operations within the callback.
   *
   * @typeParam T - The return type of the callback
   * @param context - The correlation context to use
   * @param callback - The function to execute with context
   * @returns The result of the callback
   *
   * @example
   * AsyncCorrelationManager.run(context, () => {
   *   // Context is automatically propagated
   *   return processRequest();
   * });
   */
  public static run<T>(context: ErrorCorrelationContext, callback: () => T): T {
    if (this.asyncLocalStorage) {
      return this.asyncLocalStorage.run(context, callback);
    }
    // Fallback to basic context management
    return ErrorCorrelationManager.withContext(context, async () =>
      callback(),
    ) as T;
  }

  /**
   * Gets the current correlation context from async local storage.
   * Returns undefined if called outside of a `run` context.
   *
   * @returns The current context or undefined
   *
   * @example
   * const context = AsyncCorrelationManager.getStore();
   * if (context) {
   *   console.log(`Trace ID: ${context.traceId}`);
   * }
   */
  public static getStore(): ErrorCorrelationContext | undefined {
    if (this.asyncLocalStorage) {
      return this.asyncLocalStorage.getStore();
    }
    return ErrorCorrelationManager.getContext();
  }
}

// Initialize async correlation manager
AsyncCorrelationManager.initialize();
