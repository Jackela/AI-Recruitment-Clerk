import { ErrorCorrelationManager } from './error-correlation';

describe('ErrorCorrelationManager', () => {
  beforeEach(() => {
    ErrorCorrelationManager.setContext({});
  });

  describe('setContext', () => {
    it('should set context with traceId', () => {
      ErrorCorrelationManager.setContext({ traceId: 'trace-123' });
      const context = ErrorCorrelationManager.getContext();

      expect(context.traceId).toBe('trace-123');
    });

    it('should set context with requestId', () => {
      ErrorCorrelationManager.setContext({ requestId: 'req-456' });
      const context = ErrorCorrelationManager.getContext();

      expect(context.requestId).toBe('req-456');
    });

    it('should set context with both ids', () => {
      ErrorCorrelationManager.setContext({
        traceId: 'trace-123',
        requestId: 'req-456',
      });
      const context = ErrorCorrelationManager.getContext();

      expect(context.traceId).toBe('trace-123');
      expect(context.requestId).toBe('req-456');
    });

    it('should overwrite previous context', () => {
      ErrorCorrelationManager.setContext({ traceId: 'old-trace' });
      ErrorCorrelationManager.setContext({ traceId: 'new-trace' });

      const context = ErrorCorrelationManager.getContext();
      expect(context.traceId).toBe('new-trace');
    });

    it('should clear context when set to empty object', () => {
      ErrorCorrelationManager.setContext({ traceId: 'trace-123' });
      ErrorCorrelationManager.setContext({});

      const context = ErrorCorrelationManager.getContext();
      expect(context.traceId).toBeUndefined();
      expect(context.requestId).toBeUndefined();
    });

    it('should preserve partial context', () => {
      ErrorCorrelationManager.setContext({
        traceId: 'trace-123',
        requestId: 'req-456',
      });
      ErrorCorrelationManager.setContext({ traceId: 'new-trace' });

      const context = ErrorCorrelationManager.getContext();
      expect(context.traceId).toBe('new-trace');
      expect(context.requestId).toBeUndefined();
    });
  });

  describe('getContext', () => {
    it('should return empty object by default', () => {
      const context = ErrorCorrelationManager.getContext();
      expect(context).toEqual({});
    });

    it('should return previously set context', () => {
      ErrorCorrelationManager.setContext({ traceId: 'test-trace' });
      const context = ErrorCorrelationManager.getContext();

      expect(context.traceId).toBe('test-trace');
    });

    it('should return new object on each call', () => {
      ErrorCorrelationManager.setContext({ traceId: 'test' });
      const context1 = ErrorCorrelationManager.getContext();
      const context2 = ErrorCorrelationManager.getContext();

      expect(context1).toEqual(context2);
      expect(context1).not.toBe(context2);
    });

    it('should return context with both properties', () => {
      ErrorCorrelationManager.setContext({
        traceId: 'trace-123',
        requestId: 'req-456',
      });

      const context = ErrorCorrelationManager.getContext();
      expect(Object.keys(context)).toHaveLength(2);
    });
  });

  describe('generateTraceId', () => {
    it('should generate traceId with correct prefix', () => {
      const traceId = ErrorCorrelationManager.generateTraceId();
      expect(traceId.startsWith('trace-')).toBe(true);
    });

    it('should generate unique traceIds', () => {
      const traceId1 = ErrorCorrelationManager.generateTraceId();
      const traceId2 = ErrorCorrelationManager.generateTraceId();

      expect(traceId1).not.toBe(traceId2);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const traceId = ErrorCorrelationManager.generateTraceId();
      const after = Date.now();

      const timestamp = parseInt(traceId.split('-')[1]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should include random component', () => {
      const traceId = ErrorCorrelationManager.generateTraceId();
      const parts = traceId.split('-');

      expect(parts).toHaveLength(3);
      expect(parts[2]).toBeDefined();
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should generate different traceIds on multiple calls', () => {
      const traceIds = new Set();
      for (let i = 0; i < 100; i++) {
        traceIds.add(ErrorCorrelationManager.generateTraceId());
      }

      expect(traceIds.size).toBe(100);
    });
  });

  describe('integration', () => {
    it('should use generated traceId in context', () => {
      const traceId = ErrorCorrelationManager.generateTraceId();
      ErrorCorrelationManager.setContext({ traceId });

      const context = ErrorCorrelationManager.getContext();
      expect(context.traceId).toBe(traceId);
    });

    it('should maintain context across multiple operations', () => {
      const traceId = ErrorCorrelationManager.generateTraceId();
      ErrorCorrelationManager.setContext({ traceId, requestId: 'req-1' });

      for (let i = 0; i < 5; i++) {
        const context = ErrorCorrelationManager.getContext();
        expect(context.traceId).toBe(traceId);
      }
    });

    it('should allow updating context incrementally', () => {
      const traceId = ErrorCorrelationManager.generateTraceId();
      ErrorCorrelationManager.setContext({ traceId });

      const context1 = ErrorCorrelationManager.getContext();
      expect(context1.traceId).toBe(traceId);
      expect(context1.requestId).toBeUndefined();

      ErrorCorrelationManager.setContext({ ...context1, requestId: 'req-1' });

      const context2 = ErrorCorrelationManager.getContext();
      expect(context2.traceId).toBe(traceId);
      expect(context2.requestId).toBe('req-1');
    });
  });

  describe('static behavior', () => {
    it('should maintain state across calls', () => {
      ErrorCorrelationManager.setContext({ traceId: 'persistent-trace' });

      const manager2 = ErrorCorrelationManager;
      const context = manager2.getContext();

      expect(context.traceId).toBe('persistent-trace');
    });
  });
});
