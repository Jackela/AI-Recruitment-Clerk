import type {
  ErrorCorrelationContext,
  HttpRequestLike} from './error-correlation';
import {
  ErrorCorrelationManager,
  WithCorrelation
} from './error-correlation';

describe('ErrorCorrelationManager', () => {
  beforeEach(() => {
    // Clear context before each test
    while (ErrorCorrelationManager.getContext()) {
      ErrorCorrelationManager.clearContext();
    }
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = ErrorCorrelationManager.generateRequestId();
      const id2 = ErrorCorrelationManager.generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-f0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-f0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateTraceId', () => {
    it('should generate unique trace IDs', () => {
      const id1 = ErrorCorrelationManager.generateTraceId();
      const id2 = ErrorCorrelationManager.generateTraceId();

      expect(id1).toMatch(/^trace_\d+_[a-f0-9]+$/);
      expect(id2).toMatch(/^trace_\d+_[a-f0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateSpanId', () => {
    it('should generate unique span IDs', () => {
      const id1 = ErrorCorrelationManager.generateSpanId();
      const id2 = ErrorCorrelationManager.generateSpanId();

      expect(id1).toMatch(/^span_[a-f0-9]+$/);
      expect(id2).toMatch(/^span_[a-f0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createContextFromRequest', () => {
    it('should create context from minimal request', () => {
      const request: HttpRequestLike = {};
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.serviceName).toBe('test-service');
      expect(context.operationName).toBe('test-operation');
      expect(context.requestId).toBeDefined();
      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
      expect(context.timestamp).toBeDefined();
    });

    it('should extract trace ID from headers', () => {
      const request: HttpRequestLike = {
        headers: { 'x-trace-id': 'existing-trace-123' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.traceId).toBe('existing-trace-123');
    });

    it('should extract request ID from headers', () => {
      const request: HttpRequestLike = {
        headers: { 'x-request-id': 'existing-request-456' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.requestId).toBe('existing-request-456');
    });

    it('should extract parent span ID from headers', () => {
      const request: HttpRequestLike = {
        headers: { 'x-span-id': 'parent-span-789' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.parentSpanId).toBe('parent-span-789');
    });

    it('should handle array headers', () => {
      const request: HttpRequestLike = {
        headers: { 'x-trace-id': ['trace-from-array'] },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.traceId).toBe('trace-from-array');
    });

    it('should extract user ID from headers', () => {
      const request: HttpRequestLike = {
        headers: { 'x-user-id': 'user-123' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.userId).toBe('user-123');
    });

    it('should extract user ID from request.user', () => {
      const request: HttpRequestLike = {
        user: { id: 'user-from-object' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.userId).toBe('user-from-object');
    });

    it('should extract session ID from headers', () => {
      const request: HttpRequestLike = {
        headers: { 'x-session-id': 'session-456' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.sessionId).toBe('session-456');
    });

    it('should extract session ID from request.session', () => {
      const request: HttpRequestLike = {
        session: { id: 'session-from-object' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.sessionId).toBe('session-from-object');
    });

    it('should extract user agent from headers', () => {
      const request: HttpRequestLike = {
        headers: { 'user-agent': 'Mozilla/5.0' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.userAgent).toBe('Mozilla/5.0');
    });

    it('should extract client IP from x-forwarded-for', () => {
      const request: HttpRequestLike = {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.clientIp).toBe('192.168.1.1');
    });

    it('should extract client IP from x-real-ip', () => {
      const request: HttpRequestLike = {
        headers: { 'x-real-ip': '192.168.1.2' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.clientIp).toBe('192.168.1.2');
    });

    it('should extract client IP from connection.remoteAddress', () => {
      const request: HttpRequestLike = {
        connection: { remoteAddress: '192.168.1.3' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.clientIp).toBe('192.168.1.3');
    });

    it('should extract client IP from socket.remoteAddress', () => {
      const request: HttpRequestLike = {
        socket: { remoteAddress: '192.168.1.4' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.clientIp).toBe('192.168.1.4');
    });

    it('should extract client IP from request.ip', () => {
      const request: HttpRequestLike = {
        ip: '192.168.1.5',
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.clientIp).toBe('192.168.1.5');
    });

    it('should extract metadata from request', () => {
      const request: HttpRequestLike = {
        method: 'POST',
        url: '/api/test?param=value',
        path: '/api/test',
        query: { param: 'value' },
        headers: { 'content-type': 'application/json' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.metadata?.method).toBe('POST');
      expect(context.metadata?.url).toBe('/api/test?param=value');
      expect(context.metadata?.path).toBe('/api/test');
      expect(context.metadata?.query).toEqual({ param: 'value' });
      expect(context.metadata?.contentType).toBe('application/json');
    });

    it('should extract path from route.path', () => {
      const request: HttpRequestLike = {
        route: { path: '/api/route-path' },
      };
      const context = ErrorCorrelationManager.createContextFromRequest(
        request,
        'test-service',
        'test-operation',
      );

      expect(context.metadata?.path).toBe('/api/route-path');
    });
  });

  describe('createInternalContext', () => {
    it('should create context without parent', () => {
      const context = ErrorCorrelationManager.createInternalContext(
        'internal-service',
        'background-job',
      );

      expect(context.serviceName).toBe('internal-service');
      expect(context.operationName).toBe('background-job');
      expect(context.requestId).toBeDefined();
      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
      expect(context.parentSpanId).toBeUndefined();
    });

    it('should inherit from parent context', () => {
      const parentContext: ErrorCorrelationContext = {
        requestId: 'parent-request',
        traceId: 'parent-trace',
        spanId: 'parent-span',
        serviceName: 'parent-service',
        operationName: 'parent-op',
        timestamp: new Date().toISOString(),
        userId: 'user-123',
        sessionId: 'session-456',
        metadata: { custom: 'value' },
      };

      const childContext = ErrorCorrelationManager.createInternalContext(
        'child-service',
        'child-op',
        parentContext,
      );

      expect(childContext.requestId).toBe('parent-request');
      expect(childContext.traceId).toBe('parent-trace');
      expect(childContext.spanId).not.toBe('parent-span');
      expect(childContext.parentSpanId).toBe('parent-span');
      expect(childContext.userId).toBe('user-123');
      expect(childContext.sessionId).toBe('session-456');
      expect(childContext.metadata).toEqual({ custom: 'value' });
    });
  });

  describe('setContext and getContext', () => {
    it('should set and get context', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      ErrorCorrelationManager.setContext(context);
      const retrieved = ErrorCorrelationManager.getContext();

      expect(retrieved).toEqual(context);
      ErrorCorrelationManager.clearContext();
    });

    it('should return undefined when no context set', () => {
      expect(ErrorCorrelationManager.getContext()).toBeUndefined();
    });

    it('should maintain context stack', () => {
      const context1: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };
      const context2: ErrorCorrelationContext = {
        requestId: 'req-2',
        traceId: 'trace-2',
        spanId: 'span-2',
        serviceName: 'service-2',
        operationName: 'op-2',
        timestamp: new Date().toISOString(),
      };

      ErrorCorrelationManager.setContext(context1);
      ErrorCorrelationManager.setContext(context2);

      expect(ErrorCorrelationManager.getContext()).toEqual(context2);

      ErrorCorrelationManager.clearContext();
      expect(ErrorCorrelationManager.getContext()).toEqual(context1);

      ErrorCorrelationManager.clearContext();
      expect(ErrorCorrelationManager.getContext()).toBeUndefined();
    });
  });

  describe('updateContext', () => {
    it('should update existing context', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      ErrorCorrelationManager.setContext(context);
      ErrorCorrelationManager.updateContext({ userId: 'user-123' });

      expect(ErrorCorrelationManager.getContext()?.userId).toBe('user-123');
      ErrorCorrelationManager.clearContext();
    });

    it('should merge metadata', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
        metadata: { existing: 'value' },
      };

      ErrorCorrelationManager.setContext(context);
      ErrorCorrelationManager.updateContext({
        metadata: { newField: 'newValue' },
      });

      const updated = ErrorCorrelationManager.getContext();
      expect(updated?.metadata?.existing).toBe('value');
      expect(updated?.metadata?.newField).toBe('newValue');
      ErrorCorrelationManager.clearContext();
    });

    it('should do nothing if no context set', () => {
      expect(() =>
        ErrorCorrelationManager.updateContext({ userId: 'user-123' }),
      ).not.toThrow();
    });
  });

  describe('withContext', () => {
    it('should execute operation with context', async () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      const result = await ErrorCorrelationManager.withContext(
        context,
        async () => {
          expect(ErrorCorrelationManager.getContext()).toEqual(context);
          return 'success';
        },
      );

      expect(result).toBe('success');
      expect(ErrorCorrelationManager.getContext()).toBeUndefined();
    });

    it('should track execution time', async () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      await ErrorCorrelationManager.withContext(context, async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
      });

      // Allow for small timing variations
      expect(context.executionTime).toBeGreaterThanOrEqual(5);
    });

    it('should clear context on error', async () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      await expect(
        ErrorCorrelationManager.withContext(context, async () => {
          throw new Error('Test error');
        }),
      ).rejects.toThrow('Test error');

      expect(ErrorCorrelationManager.getContext()).toBeUndefined();
    });

    it('should restore previous context after operation', async () => {
      const parentContext: ErrorCorrelationContext = {
        requestId: 'parent-req',
        traceId: 'parent-trace',
        spanId: 'parent-span',
        serviceName: 'parent-service',
        operationName: 'parent-op',
        timestamp: new Date().toISOString(),
      };
      const childContext: ErrorCorrelationContext = {
        requestId: 'child-req',
        traceId: 'child-trace',
        spanId: 'child-span',
        serviceName: 'child-service',
        operationName: 'child-op',
        timestamp: new Date().toISOString(),
      };

      ErrorCorrelationManager.setContext(parentContext);

      await ErrorCorrelationManager.withContext(childContext, async () => {
        expect(ErrorCorrelationManager.getContext()?.requestId).toBe(
          'child-req',
        );
      });

      expect(ErrorCorrelationManager.getContext()?.requestId).toBe(
        'parent-req',
      );
      ErrorCorrelationManager.clearContext();
    });
  });

  describe('createCorrelationHeaders', () => {
    it('should create headers from context', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      const headers = ErrorCorrelationManager.createCorrelationHeaders(context);

      expect(headers['x-trace-id']).toBe('trace-1');
      expect(headers['x-request-id']).toBe('req-1');
      expect(headers['x-span-id']).toBe('span-1');
    });

    it('should include parent span ID if present', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        parentSpanId: 'parent-span',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      const headers = ErrorCorrelationManager.createCorrelationHeaders(context);

      expect(headers['x-parent-span-id']).toBe('parent-span');
    });

    it('should include user ID if present', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        userId: 'user-123',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      const headers = ErrorCorrelationManager.createCorrelationHeaders(context);

      expect(headers['x-user-id']).toBe('user-123');
    });

    it('should include session ID if present', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        sessionId: 'session-456',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      const headers = ErrorCorrelationManager.createCorrelationHeaders(context);

      expect(headers['x-session-id']).toBe('session-456');
    });

    it('should use current context if not provided', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'current-req',
        traceId: 'current-trace',
        spanId: 'current-span',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      ErrorCorrelationManager.setContext(context);
      const headers = ErrorCorrelationManager.createCorrelationHeaders();

      expect(headers['x-trace-id']).toBe('current-trace');
      ErrorCorrelationManager.clearContext();
    });

    it('should return empty object if no context', () => {
      const headers = ErrorCorrelationManager.createCorrelationHeaders();
      expect(headers).toEqual({});
    });
  });

  describe('enrichContext', () => {
    it('should enrich context with new metadata', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
        metadata: { existing: 'value' },
      };

      const enriched = ErrorCorrelationManager.enrichContext(context, {
        newField: 'newValue',
      });

      expect(enriched.metadata?.existing).toBe('value');
      expect(enriched.metadata?.newField).toBe('newValue');
      expect(context.metadata?.newField).toBeUndefined(); // Original unchanged
    });
  });

  describe('createChildContext', () => {
    it('should create child context with parent linkage', () => {
      const parentContext: ErrorCorrelationContext = {
        requestId: 'parent-req',
        traceId: 'parent-trace',
        spanId: 'parent-span',
        serviceName: 'parent-service',
        operationName: 'parent-op',
        timestamp: new Date().toISOString(),
        userId: 'user-123',
      };

      const childContext = ErrorCorrelationManager.createChildContext(
        parentContext,
        'child-service',
        'child-op',
      );

      expect(childContext.requestId).toBe('parent-req');
      expect(childContext.traceId).toBe('parent-trace');
      expect(childContext.spanId).not.toBe('parent-span');
      expect(childContext.parentSpanId).toBe('parent-span');
      expect(childContext.serviceName).toBe('child-service');
      expect(childContext.operationName).toBe('child-op');
      expect(childContext.userId).toBe('user-123');
      expect(childContext.executionTime).toBeUndefined();
    });
  });

  describe('getCorrelationSummary', () => {
    it('should return summary of context', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        parentSpanId: 'parent-span',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
        userId: 'user-123',
        sessionId: 'session-456',
        executionTime: 100,
      };

      const summary =
        ErrorCorrelationManager.getCorrelationSummary(context);

      expect(summary.requestId).toBe('req-1');
      expect(summary.traceId).toBe('trace-1');
      expect(summary.spanId).toBe('span-1');
      expect(summary.parentSpanId).toBe('parent-span');
      expect(summary.serviceName).toBe('service-1');
      expect(summary.operationName).toBe('op-1');
      expect(summary.userId).toBe('user-123');
      expect(summary.sessionId).toBe('session-456');
      expect(summary.executionTime).toBe(100);
    });

    it('should use current context if not provided', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'current-req',
        traceId: 'current-trace',
        spanId: 'current-span',
        serviceName: 'current-service',
        operationName: 'current-op',
        timestamp: new Date().toISOString(),
      };

      ErrorCorrelationManager.setContext(context);
      const summary = ErrorCorrelationManager.getCorrelationSummary();

      expect(summary.requestId).toBe('current-req');
      ErrorCorrelationManager.clearContext();
    });

    it('should return empty object if no context', () => {
      const summary = ErrorCorrelationManager.getCorrelationSummary();
      expect(summary).toEqual({});
    });
  });

  describe('validateContext', () => {
    it('should validate complete context', () => {
      const context: ErrorCorrelationContext = {
        requestId: 'req-1',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'service-1',
        operationName: 'op-1',
        timestamp: new Date().toISOString(),
      };

      const result = ErrorCorrelationManager.validateContext(context);

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const context = {
        requestId: 'req-1',
        // Missing traceId, spanId, serviceName, operationName, timestamp
      } as ErrorCorrelationContext;

      const result = ErrorCorrelationManager.validateContext(context);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('traceId');
      expect(result.missingFields).toContain('spanId');
      expect(result.missingFields).toContain('serviceName');
      expect(result.missingFields).toContain('operationName');
      expect(result.missingFields).toContain('timestamp');
    });
  });
});

describe('WithCorrelation decorator', () => {
  beforeEach(() => {
    while (ErrorCorrelationManager.getContext()) {
      ErrorCorrelationManager.clearContext();
    }
  });

  it('should wrap method with correlation context', async () => {
    class TestService {
      @WithCorrelation('test-service', 'test-operation')
      async testMethod(): Promise<string> {
        const context = ErrorCorrelationManager.getContext();
        expect(context).toBeDefined();
        expect(context?.serviceName).toBe('test-service');
        expect(context?.operationName).toBe('test-operation');
        return 'success';
      }
    }

    const service = new TestService();
    const result = await service.testMethod();

    expect(result).toBe('success');
    expect(ErrorCorrelationManager.getContext()).toBeUndefined();
  });

  it('should create context from request-like argument', async () => {
    class TestService {
      @WithCorrelation('test-service', 'test-operation')
      async testMethod(_request: { headers: Record<string, string> }): Promise<string> {
        const context = ErrorCorrelationManager.getContext();
        expect(context?.traceId).toBe('from-header');
        return 'success';
      }
    }

    const service = new TestService();
    await service.testMethod({
      headers: { 'x-trace-id': 'from-header' },
    });

    expect(ErrorCorrelationManager.getContext()).toBeUndefined();
  });

  it('should preserve existing context', async () => {
    const existingContext: ErrorCorrelationContext = {
      requestId: 'existing-req',
      traceId: 'existing-trace',
      spanId: 'existing-span',
      serviceName: 'existing-service',
      operationName: 'existing-op',
      timestamp: new Date().toISOString(),
    };

    class TestService {
      @WithCorrelation('decorator-service', 'decorator-op')
      async testMethod(): Promise<string> {
        const context = ErrorCorrelationManager.getContext();
        // Should use existing context, not create new one
        expect(context?.traceId).toBe('existing-trace');
        return 'success';
      }
    }

    ErrorCorrelationManager.setContext(existingContext);
    const service = new TestService();
    await service.testMethod();

    ErrorCorrelationManager.clearContext();
  });

  it('should clear context on error', async () => {
    class TestService {
      @WithCorrelation('test-service', 'test-operation')
      async failingMethod(): Promise<string> {
        throw new Error('Method failed');
      }
    }

    const service = new TestService();

    await expect(service.failingMethod()).rejects.toThrow('Method failed');
    expect(ErrorCorrelationManager.getContext()).toBeUndefined();
  });
});
