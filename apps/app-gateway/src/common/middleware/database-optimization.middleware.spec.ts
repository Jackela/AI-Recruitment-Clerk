/**
 * Database Optimization Middleware Tests
 * AI Recruitment Clerk - Testing for database connection pool and query optimization
 */

import { Request, Response, NextFunction } from 'express';
import { Connection } from 'mongoose';
import { DatabaseOptimizationMiddleware } from './database-optimization.middleware';

describe('DatabaseOptimizationMiddleware', () => {
  let middleware: DatabaseOptimizationMiddleware;
  let mockConnection: jest.Mocked<Partial<Connection>>;

  const createMockRequest = (overrides: Partial<Request> = {}): Request => {
    return {
      method: 'GET',
      path: '/api/test',
      query: {},
      ...overrides,
    } as Request;
  };

  const createMockResponse = (): Response => {
    const res: Partial<Response> = {
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          // Store callback for later invocation
          (res as any)._finishCallback = callback;
        }
        return res as Response;
      }),
    };
    return res as Response;
  };

  const createMockNext = (): NextFunction => jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();

    mockConnection = {
      readyState: 1, // Connected
      db: {
        admin: jest.fn().mockReturnValue({
          serverStatus: jest.fn().mockResolvedValue({
            connections: { current: 5 },
          }),
        }),
        listCollections: jest.fn(),
      } as any,
    };

    middleware = new DatabaseOptimizationMiddleware(
      mockConnection as unknown as Connection,
    );

    // Suppress logger output during tests
    jest.spyOn(middleware['logger'], 'debug').mockImplementation();
    jest.spyOn(middleware['logger'], 'warn').mockImplementation();
    jest.spyOn(middleware['logger'], 'error').mockImplementation();
    jest.spyOn(middleware['logger'], 'log').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('middleware execution', () => {
    it('should call next() to continue the request chain', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should set db query tracking properties on request', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res, next);

      expect(req['dbQueryStart']).toBeDefined();
      expect(req['dbQueryCount']).toBe(0);
      expect(req['dbSlowQueries']).toBe(0);
    });

    it('should update metrics on response finish', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res, next);

      // Simulate response finish
      const finishCallback = (res as any)._finishCallback;
      if (finishCallback) {
        finishCallback();
      }

      expect(req['dbQueryTime']).toBeDefined();
    });

    it('should log performance for slow queries', async () => {
      const warnSpy = jest.spyOn(middleware['logger'], 'warn');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Set a slow query time
      const originalNow = Date.now;
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        // First call is at start, subsequent calls simulate 200ms later
        return callCount === 1 ? 0 : 200;
      });

      await middleware.use(req, res, next);

      // Simulate response finish
      const finishCallback = (res as any)._finishCallback;
      if (finishCallback) {
        finishCallback();
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SLOW DB'),
      );

      Date.now = originalNow;
    });

    it('should log debug for normal queries', async () => {
      const debugSpy = jest.spyOn(middleware['logger'], 'debug');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Fast query time (under threshold)
      const originalNow = Date.now;
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 0 : 50; // 50ms response
      });

      await middleware.use(req, res, next);

      const finishCallback = (res as any)._finishCallback;
      if (finishCallback) {
        finishCallback();
      }

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('DB:'),
      );

      Date.now = originalNow;
    });
  });

  describe('connection pool health check', () => {
    it('should check connection pool health when connection is ready', async () => {
      Object.defineProperty(mockConnection, 'readyState', { value: 1, writable: true }); // Connected

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res, next);

      // Health check should have updated metrics
      const metrics = middleware.getPerformanceMetrics();
      expect(metrics.connectionPoolSize).toBeGreaterThan(0);
    });

    it('should warn when connection is not ready', async () => {
      Object.defineProperty(mockConnection, 'readyState', { value: 0, writable: true }); // Disconnected
      const warnSpy = jest.spyOn(middleware['logger'], 'warn');

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res, next);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('connection not ready'),
      );
    });

    it('should handle connection pool health check errors', async () => {
      const errorSpy = jest.spyOn(middleware['logger'], 'error');
      Object.defineProperty(mockConnection, 'readyState', {
        get: () => {
          throw new Error('Connection error');
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res, next);

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('query plan caching', () => {
    it('should mark request as cached when query plan exists', async () => {
      // Add a query plan to cache
      const queryKey = 'GET:/api/test:{}';
      middleware['queryCache'].set(queryKey, {
        plan: {},
        hitCount: 5,
        lastUsed: Date.now(),
        avgExecutionTime: 50,
      });

      const req = createMockRequest({
        method: 'GET',
        path: '/api/test',
        query: {},
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res, next);

      expect(req['queryPlanCached']).toBe(true);
    });

    it('should increment hit count for cached query plans', async () => {
      const queryKey = 'GET:/api/test:{}';
      middleware['queryCache'].set(queryKey, {
        plan: {},
        hitCount: 5,
        lastUsed: Date.now() - 1000,
        avgExecutionTime: 50,
      });

      const req = createMockRequest({
        method: 'GET',
        path: '/api/test',
        query: {},
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res, next);

      const cachedPlan = middleware['queryCache'].get(queryKey);
      expect(cachedPlan?.hitCount).toBe(6);
    });

    it('should not mark request as cached when query plan does not exist', async () => {
      const req = createMockRequest({
        method: 'GET',
        path: '/api/new-endpoint',
        query: {},
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res, next);

      expect(req['queryPlanCached']).toBeUndefined();
    });
  });

  describe('metrics tracking', () => {
    it('should track slow queries', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // Simulate slow query
      const originalNow = Date.now;
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 0 : 150; // 150ms response (above 100ms threshold)
      });

      await middleware.use(req, res, next);

      const finishCallback = (res as any)._finishCallback;
      if (finishCallback) {
        finishCallback();
      }

      const metrics = middleware.getPerformanceMetrics();
      expect(metrics.slowQueries).toBeGreaterThan(0);

      Date.now = originalNow;
    });

    it('should update average query execution time', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const originalNow = Date.now;
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 0 : 100;
      });

      await middleware.use(req, res, next);

      const finishCallback = (res as any)._finishCallback;
      if (finishCallback) {
        finishCallback();
      }

      const metrics = middleware.getPerformanceMetrics();
      expect(metrics.queryExecutionTime).toBeGreaterThan(0);

      Date.now = originalNow;
    });

    it('should increment query count on each request', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res, next);

      const finishCallback = (res as any)._finishCallback;
      if (finishCallback) {
        finishCallback();
      }

      expect(req['dbQueryCount']).toBe(1);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return current performance metrics', () => {
      const metrics = middleware.getPerformanceMetrics();

      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('pendingConnections');
      expect(metrics).toHaveProperty('queryExecutionTime');
      expect(metrics).toHaveProperty('slowQueries');
      expect(metrics).toHaveProperty('connectionPoolSize');
      expect(metrics).toHaveProperty('lastOptimization');
    });

    it('should return a copy of metrics (not the original)', () => {
      const metrics1 = middleware.getPerformanceMetrics();
      metrics1.slowQueries = 999;

      const metrics2 = middleware.getPerformanceMetrics();
      expect(metrics2.slowQueries).not.toBe(999);
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('should return healthy status when performance is good', async () => {
      const result = await middleware.getOptimizationRecommendations();

      expect(result.health).toBe('healthy');
      expect(result.recommendations).toContain(
        '数据库性能表现良好，继续保持当前优化策略',
      );
    });

    it('should warn when average query time is high', async () => {
      // Simulate high query time
      middleware['metrics'].queryExecutionTime = 150; // Above 100ms threshold

      const result = await middleware.getOptimizationRecommendations();

      expect(result.health).toBe('warning');
      expect(result.recommendations).toContain(
        '平均查询时间较高，建议优化慢查询和添加索引',
      );
    });

    it('should warn when connection pool usage is high', async () => {
      middleware['metrics'].activeConnections = 9; // 90% of default 10
      middleware['config'].connectionPoolSize = 10;

      const result = await middleware.getOptimizationRecommendations();

      expect(result.health).toBe('warning');
      expect(result.recommendations).toContain(
        '连接池使用率高，建议增加连接池大小或优化连接管理',
      );
    });

    it('should return critical status when slow queries are high', async () => {
      middleware['metrics'].slowQueries = 60; // Above 50 threshold

      const result = await middleware.getOptimizationRecommendations();

      expect(result.health).toBe('critical');
      expect(result.recommendations).toContain(
        '慢查询数量较多，需要重点优化数据库查询性能',
      );
    });

    it('should include performance metrics in response', async () => {
      const result = await middleware.getOptimizationRecommendations();

      expect(result.performance).toBeDefined();
      expect(result.performance).toHaveProperty('activeConnections');
      expect(result.performance).toHaveProperty('queryExecutionTime');
    });
  });

  describe('triggerManualOptimization', () => {
    it('should return success on successful optimization', async () => {
      const result = await middleware.triggerManualOptimization();

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.optimizations).toContain('query_performance');
      expect(result.optimizations).toContain('connection_pool');
      expect(result.optimizations).toContain('session_cleanup');
    });

    it('should log optimization start and completion', async () => {
      const logSpy = jest.spyOn(middleware['logger'], 'log');

      await middleware.triggerManualOptimization();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manual database optimization triggered'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manual optimization completed'),
      );
    });

    it('should return failure on optimization error', async () => {
      jest
        .spyOn(middleware as any, 'optimizeQueryPerformance')
        .mockRejectedValue(new Error('Optimization failed'));

      const result = await middleware.triggerManualOptimization();

      expect(result.success).toBe(false);
    });

    it('should track duration correctly', async () => {
      const originalNow = Date.now;
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 0 : 100; // 100ms duration
      });

      const result = await middleware.triggerManualOptimization();

      expect(result.duration).toBe(100);

      Date.now = originalNow;
    });
  });

  describe('query cache cleanup', () => {
    it('should clean up stale query plans', () => {
      const debugSpy = jest.spyOn(middleware['logger'], 'debug');

      // Add stale query plans
      const now = Date.now();
      middleware['queryCache'].set('old-query', {
        plan: {},
        hitCount: 1,
        lastUsed: now - 4000000, // More than 1 hour ago
        avgExecutionTime: 50,
      });
      middleware['queryCache'].set('recent-query', {
        plan: {},
        hitCount: 10,
        lastUsed: now - 100000, // Less than 1 hour ago
        avgExecutionTime: 30,
      });

      middleware['cleanupQueryPlanCache']();

      expect(middleware['queryCache'].has('old-query')).toBe(false);
      expect(middleware['queryCache'].has('recent-query')).toBe(true);
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned 1 stale query plans'),
      );
    });

    it('should not log when no stale plans are cleaned', () => {
      const debugSpy = jest.spyOn(middleware['logger'], 'debug').mockClear();

      // Add only recent query plans
      middleware['queryCache'].set('recent-query', {
        plan: {},
        hitCount: 10,
        lastUsed: Date.now() - 100000,
        avgExecutionTime: 30,
      });

      middleware['cleanupQueryPlanCache']();

      const cleanupLogs = debugSpy.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('Cleaned'),
      );
      expect(cleanupLogs.length).toBe(0);
    });
  });

  describe('performance trend analysis', () => {
    it('should trigger optimization for high query time', () => {
      const logSpy = jest.spyOn(middleware['logger'], 'warn');
      middleware['metrics'].queryExecutionTime = 250; // Above 200ms (2x threshold)

      middleware['analyzePerformanceTrends']();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Average query time high'),
      );
    });

    it('should trigger optimization for high connection usage', () => {
      const logSpy = jest.spyOn(middleware['logger'], 'warn');
      middleware['metrics'].activeConnections = 9;
      middleware['config'].connectionPoolSize = 10;

      middleware['analyzePerformanceTrends']();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection pool usage high'),
      );
    });
  });

  describe('connection pool optimization', () => {
    it('should increase pool size up to maximum', async () => {
      middleware['config'].connectionPoolSize = 18;

      await middleware['optimizeConnectionPool']();

      expect(middleware['config'].connectionPoolSize).toBe(20); // Max
    });

    it('should not exceed maximum pool size', async () => {
      middleware['config'].connectionPoolSize = 20;

      await middleware['optimizeConnectionPool']();

      expect(middleware['config'].connectionPoolSize).toBe(20);
    });

    it('should log pool size increase', async () => {
      const logSpy = jest.spyOn(middleware['logger'], 'log');
      middleware['config'].connectionPoolSize = 10;

      await middleware['optimizeConnectionPool']();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection pool size increased to 12'),
      );
    });
  });

  describe('index requirement analysis', () => {
    it('should suggest compound indexes when slow queries are high', async () => {
      middleware['metrics'].slowQueries = 15;

      const suggestions = await middleware['analyzeIndexRequirements']();

      expect(suggestions).toContain(
        'Consider adding compound indexes for frequently queried fields',
      );
    });

    it('should return empty array when slow queries are low', async () => {
      middleware['metrics'].slowQueries = 5;

      const suggestions = await middleware['analyzeIndexRequirements']();

      expect(suggestions).toEqual([]);
    });
  });

  describe('periodic optimization', () => {
    it('should perform optimization after 30 minutes', async () => {
      const optimizeSpy = jest.spyOn(middleware as any, 'performGeneralOptimization');
      middleware['metrics'].lastOptimization = Date.now() - 2000000; // > 30 mins ago

      await middleware['performPeriodicOptimization']();

      expect(optimizeSpy).toHaveBeenCalled();
    });

    it('should not optimize if less than 30 minutes since last optimization', async () => {
      const optimizeSpy = jest.spyOn(middleware as any, 'performGeneralOptimization');
      middleware['metrics'].lastOptimization = Date.now() - 1000000; // < 30 mins ago

      await middleware['performPeriodicOptimization']();

      expect(optimizeSpy).not.toHaveBeenCalled();
    });
  });

  describe('database metrics collection', () => {
    it('should collect metrics when connection is ready', async () => {
      Object.defineProperty(mockConnection, 'readyState', { value: 1, writable: true });
      (mockConnection.db?.admin as jest.Mock)().serverStatus.mockResolvedValue({
        connections: { current: 8 },
      });

      await middleware['collectDatabaseMetrics']();

      expect(middleware['metrics'].activeConnections).toBe(8);
    });

    it('should handle metrics collection failure gracefully', async () => {
      const warnSpy = jest.spyOn(middleware['logger'], 'warn');
      Object.defineProperty(mockConnection, 'readyState', { value: 1, writable: true });
      (mockConnection.db?.admin as jest.Mock)().serverStatus.mockRejectedValue(
        new Error('DB error'),
      );

      await middleware['collectDatabaseMetrics']();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to collect database metrics'),
        'DB error',
      );
    });

    it('should not collect metrics when connection is not ready', async () => {
      Object.defineProperty(mockConnection, 'readyState', { value: 0, writable: true });

      await middleware['collectDatabaseMetrics']();

      expect(mockConnection.db?.admin).not.toHaveBeenCalled();
    });
  });

  describe('general optimization', () => {
    it('should run all optimization strategies', async () => {
      const queryOptSpy = jest.spyOn(middleware as any, 'optimizeQueryPerformance');
      const poolOptSpy = jest.spyOn(middleware as any, 'optimizeConnectionPool');
      const sessionCleanupSpy = jest.spyOn(middleware as any, 'cleanupStaleSessions');

      await middleware['performGeneralOptimization']();

      expect(queryOptSpy).toHaveBeenCalled();
      expect(poolOptSpy).toHaveBeenCalled();
      expect(sessionCleanupSpy).toHaveBeenCalled();
    });
  });

  describe('query key generation', () => {
    it('should generate unique keys for different requests', () => {
      const req1 = createMockRequest({
        method: 'GET',
        path: '/api/users',
        query: { id: '1' },
      });

      const req2 = createMockRequest({
        method: 'POST',
        path: '/api/users',
        query: {},
      });

      const key1 = middleware['generateQueryKey'](req1);
      const key2 = middleware['generateQueryKey'](req2);

      expect(key1).not.toBe(key2);
    });

    it('should generate same key for identical requests', () => {
      const req1 = createMockRequest({
        method: 'GET',
        path: '/api/users',
        query: { id: '1' },
      });

      const req2 = createMockRequest({
        method: 'GET',
        path: '/api/users',
        query: { id: '1' },
      });

      const key1 = middleware['generateQueryKey'](req1);
      const key2 = middleware['generateQueryKey'](req2);

      expect(key1).toBe(key2);
    });

    it('should include query parameters in key', () => {
      const req = createMockRequest({
        method: 'GET',
        path: '/api/users',
        query: { filter: 'active', page: '1' },
      });

      const key = middleware['generateQueryKey'](req);

      expect(key).toContain('filter');
      expect(key).toContain('active');
    });
  });
});
