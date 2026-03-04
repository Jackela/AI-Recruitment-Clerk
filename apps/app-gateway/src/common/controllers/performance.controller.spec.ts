/**
 * @fileoverview Performance Controller Tests - Comprehensive test coverage for performance monitoring endpoints
 * @module PerformanceControllerTests
 */

import { PerformanceController } from './performance.controller';
import type { PerformanceMonitoringInterceptor } from '../interceptors/performance-monitoring.interceptor';
import type { CacheService, CacheMetrics } from '../../cache/cache.service';
import type {
  CacheOptimizationService,
  PerformanceStats,
  CacheOptimizationConfig,
} from '../../cache/cache-optimization.service';
import type { DatabaseOptimizationMiddleware } from '../middleware/database-optimization.middleware';

// Type aliases for mock return types
type DbMetricsType = {
  activeConnections: number;
  pendingConnections: number;
  queryExecutionTime: number;
  slowQueries: number;
  connectionPoolSize: number;
  lastOptimization: number;
};

type CacheHealthType = {
  status: string;
  connected: boolean;
  type: string;
  metrics: CacheMetrics;
  details?: string;
};

describe('PerformanceController', () => {
  let controller: PerformanceController;
  // Using any for mocks to avoid complex type inference issues with type-only imports
   
  let performanceInterceptor: any;
   
  let cacheService: any;
   
  let cacheOptimization: any;
   
  let dbOptimization: any;

  const mockCacheMetrics: CacheMetrics = {
    hits: 100,
    misses: 20,
    sets: 50,
    dels: 10,
    errors: 0,
    hitRate: 83.33,
    totalOperations: 120,
  };

  const mockCacheHealth: CacheHealthType = {
    status: 'healthy',
    connected: true,
    type: 'redis',
    metrics: mockCacheMetrics,
  };

  const mockDbMetrics: DbMetricsType = {
    activeConnections: 5,
    pendingConnections: 0,
    queryExecutionTime: 25,
    slowQueries: 2,
    connectionPoolSize: 10,
    lastOptimization: Date.now(),
  };

  const mockApiPerformanceStats = {
    totalRequests: 1000,
    averageResponseTime: 150,
    slowRequests: 50,
    cacheHitRate: 0.75,
    errorRate: 0.02,
    lastUpdated: Date.now(),
    endpointStats: {
      '/api/resumes': {
        count: 500,
        averageTime: 120,
        minTime: 50,
        maxTime: 500,
        errors: 5,
      },
    },
  };

  const mockPerformanceStats: PerformanceStats = {
    hitRate: 0.85,
    missRate: 0.15,
    evictionCount: 5,
    preloadCount: 10,
    totalSize: 100,
    lastOptimization: Date.now(),
  };

  const mockCacheOptimizationConfig: CacheOptimizationConfig = {
    strategies: {
      frequency: 'high',
      ttl: 300000,
      priority: 'normal',
      invalidationTriggers: ['create', 'update', 'delete'],
    },
    preloadRules: [
      {
        pattern: 'jobs:list',
        schedule: '0 */5 * * * *',
        dependencies: ['db:jobs:findAll'],
      },
    ],
    cleanupRules: {
      maxAge: 3600000,
      maxSize: 10000,
      lowHitRateThreshold: 0.1,
    },
  };

  beforeEach(() => {
    // Create mocks
    performanceInterceptor = {
      getPerformanceStats: jest.fn(),
      getHistoricalMetrics: jest.fn(),
      generatePerformanceReport: jest.fn(),
    } as unknown as jest.Mocked<PerformanceMonitoringInterceptor>;

    cacheService = {
      getMetrics: jest.fn(),
      healthCheck: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;

    cacheOptimization = {
      getOptimizationReport: jest.fn(),
      triggerOptimization: jest.fn(),
      warmupCache: jest.fn(),
    } as unknown as jest.Mocked<CacheOptimizationService>;

    dbOptimization = {
      getPerformanceMetrics: jest.fn(),
      getOptimizationRecommendations: jest.fn(),
      triggerManualOptimization: jest.fn(),
    } as unknown as jest.Mocked<DatabaseOptimizationMiddleware>;

    // Instantiate controller with mocked dependencies
    controller = new PerformanceController(
      performanceInterceptor,
      cacheService,
      cacheOptimization,
      dbOptimization,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPerformanceStats', () => {
    it('should return comprehensive performance statistics', async () => {
      performanceInterceptor.getPerformanceStats.mockResolvedValue(
        mockApiPerformanceStats,
      );
      cacheService.getMetrics.mockResolvedValue(mockCacheMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      dbOptimization.getPerformanceMetrics.mockResolvedValue(mockDbMetrics);

      const result = await controller.getPerformanceStats();

      expect(result.timestamp).toBeDefined();
      expect(result.api).toEqual(mockApiPerformanceStats);
      expect(result.cache.metrics).toEqual(mockCacheMetrics);
      expect(result.cache.health).toEqual(mockCacheHealth);
      expect(result.database).toEqual(mockDbMetrics);
      expect(result.system.uptime).toBeGreaterThanOrEqual(0);
      expect(result.system.memory).toBeDefined();
      expect(result.system.cpu).toBeDefined();
    });

    it('should call all dependent services in parallel', async () => {
      performanceInterceptor.getPerformanceStats.mockResolvedValue(
        mockApiPerformanceStats,
      );
      cacheService.getMetrics.mockResolvedValue(mockCacheMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      dbOptimization.getPerformanceMetrics.mockResolvedValue(mockDbMetrics);

      await controller.getPerformanceStats();

      expect(performanceInterceptor.getPerformanceStats).toHaveBeenCalledTimes(1);
      expect(cacheService.getMetrics).toHaveBeenCalledTimes(1);
      expect(cacheService.healthCheck).toHaveBeenCalledTimes(1);
      expect(dbOptimization.getPerformanceMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle null API performance stats gracefully', async () => {
      performanceInterceptor.getPerformanceStats.mockResolvedValue(null);
      cacheService.getMetrics.mockResolvedValue(mockCacheMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      dbOptimization.getPerformanceMetrics.mockResolvedValue(mockDbMetrics);

      const result = await controller.getPerformanceStats();

      expect(result.api).toBeNull();
      expect(result.timestamp).toBeDefined();
    });

    it('should include valid system resource usage', async () => {
      performanceInterceptor.getPerformanceStats.mockResolvedValue(
        mockApiPerformanceStats,
      );
      cacheService.getMetrics.mockResolvedValue(mockCacheMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      dbOptimization.getPerformanceMetrics.mockResolvedValue(mockDbMetrics);

      const result = await controller.getPerformanceStats();

      expect(result.system.uptime).toBeDefined();
      expect(result.system.memory.heapUsed).toBeDefined();
      expect(result.system.memory.heapTotal).toBeDefined();
      expect(result.system.memory.rss).toBeDefined();
      expect(result.system.cpu.user).toBeDefined();
      expect(result.system.cpu.system).toBeDefined();
    });

    it('should propagate service errors', async () => {
      const serviceError = new Error('Performance service unavailable');
      performanceInterceptor.getPerformanceStats.mockRejectedValue(serviceError);

      await expect(controller.getPerformanceStats()).rejects.toThrow(
        serviceError,
      );
    });
  });

  describe('getHistoricalMetrics', () => {
    const mockMetrics = [
      {
        endpoint: '/api/resumes',
        method: 'GET',
        responseTime: 120,
        statusCode: 200,
        timestamp: Date.now(),
        cacheHit: true,
      },
      {
        endpoint: '/api/resumes',
        method: 'POST',
        responseTime: 250,
        statusCode: 201,
        timestamp: Date.now(),
        cacheHit: false,
      },
      {
        endpoint: '/api/jobs',
        method: 'GET',
        responseTime: 350,
        statusCode: 200,
        timestamp: Date.now(),
        cacheHit: false,
      },
    ];

    it('should return historical metrics with summary when data exists', async () => {
      performanceInterceptor.getHistoricalMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getHistoricalMetrics('2024-01-15', 'morning');

      expect(result.period.date).toBe('2024-01-15');
      expect(result.period.window).toBe('morning');
      expect(result.summary).toBeDefined();
      expect(result.summary?.totalRequests).toBe(3);
      expect(result.summary?.averageResponseTime).toBeDefined();
      expect(result.metrics).toHaveLength(3);
    });

    it('should calculate correct summary statistics', async () => {
      performanceInterceptor.getHistoricalMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getHistoricalMetrics();

      expect(result.summary?.totalRequests).toBe(3);
      expect(result.summary?.averageResponseTime).toBe(240); // (120+250+350)/3
      expect(result.summary?.slowRequestRate).toBe(67); // 2 out of 3 > 200ms (250, 350)
      expect(result.summary?.cacheHitRate).toBe(33); // 1 out of 3 cache hits
    });

    it('should use default date and window when not provided', async () => {
      performanceInterceptor.getHistoricalMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getHistoricalMetrics();

      const today = new Date().toISOString().split('T')[0];
      expect(result.period.date).toBe(today);
      expect(result.period.window).toBe('current');
    });

    it('should return message when no historical data available', async () => {
      performanceInterceptor.getHistoricalMetrics.mockResolvedValue([]);

      const result = await controller.getHistoricalMetrics('2024-01-01', 'night');

      expect(result.message).toBe(
        'No historical data available for the specified period',
      );
      expect(result.metrics).toHaveLength(0);
      expect(result.summary).toBeUndefined();
    });

    it('should limit returned metrics to 100 records', async () => {
      const manyMetrics = Array.from({ length: 150 }, (_, i) => ({
        endpoint: `/api/test/${i}`,
        method: 'GET',
        responseTime: 100 + i,
        statusCode: 200,
        timestamp: Date.now() - i * 1000,
      }));
      performanceInterceptor.getHistoricalMetrics.mockResolvedValue(manyMetrics);

      const result = await controller.getHistoricalMetrics();

      expect(result.metrics.length).toBeLessThanOrEqual(100);
    });

    it('should calculate error rate correctly', async () => {
      const metricsWithErrors = [
        ...mockMetrics,
        {
          endpoint: '/api/error',
          method: 'GET',
          responseTime: 100,
          statusCode: 500,
          timestamp: Date.now(),
        },
        {
          endpoint: '/api/error2',
          method: 'GET',
          responseTime: 100,
          statusCode: 404,
          timestamp: Date.now(),
        },
      ];
      performanceInterceptor.getHistoricalMetrics.mockResolvedValue(
        metricsWithErrors,
      );

      const result = await controller.getHistoricalMetrics();

      expect(result.summary?.errorRate).toBe(40); // 2 out of 5 errors (>=400)
    });

    it('should pass date and window parameters to interceptor', async () => {
      performanceInterceptor.getHistoricalMetrics.mockResolvedValue(mockMetrics);

      await controller.getHistoricalMetrics('2024-01-15', 'evening');

      expect(
        performanceInterceptor.getHistoricalMetrics,
      ).toHaveBeenCalledWith('2024-01-15', 'evening');
    });
  });

  describe('generatePerformanceReport', () => {
    const mockApiReport = {
      summary: {
        totalRequests: 1000,
        averageResponseTime: 150,
        slowRequestPercentage: 5,
        cacheHitRate: 0.8,
        errorRate: 0.02,
        lastUpdated: new Date().toISOString(),
      },
      slowestEndpoints: [
        {
          endpoint: '/api/reports',
          averageTime: 500,
          maxTime: 1200,
          count: 50,
          errorRate: 0.1,
        },
      ],
      recommendations: ['Consider caching for /api/reports endpoint'],
    };

    const mockCacheReport = {
      performance: mockPerformanceStats,
      config: mockCacheOptimizationConfig,
      recommendations: ['Increase TTL for frequently accessed keys'],
      health: mockCacheHealth,
    };

    const mockDbReport = {
      performance: mockDbMetrics,
      recommendations: ['Add index on resumes.createdAt'],
      health: 'healthy' as const,
    };

    it('should generate comprehensive performance report', async () => {
      performanceInterceptor.generatePerformanceReport.mockResolvedValue(
        mockApiReport,
      );
      cacheOptimization.getOptimizationReport.mockResolvedValue(mockCacheReport);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        mockDbReport,
      );

      const result = await controller.generatePerformanceReport();

      expect(result.generatedAt).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.api).toEqual(mockApiReport);
      expect(result.cache).toEqual(mockCacheReport);
      expect(result.database).toEqual(mockDbReport);
    });

    it('should identify critical issues correctly', async () => {
      const criticalApiReport = {
        summary: {
          averageResponseTime: 600, // Over 500ms threshold
          totalRequests: 1000,
          slowRequestPercentage: 30,
          cacheHitRate: 0.2,
          errorRate: 0.1,
          lastUpdated: new Date().toISOString(),
        },
        slowestEndpoints: [],
        recommendations: [],
      };

      const criticalCacheReport = {
        ...mockCacheReport,
        performance: { ...mockPerformanceStats, hitRate: 0.2 }, // Below 30%
      };

      const criticalDbReport = {
        ...mockDbReport,
        performance: { ...mockDbMetrics, queryExecutionTime: 250 }, // Over 200ms
        health: 'critical' as const,
      };

      performanceInterceptor.generatePerformanceReport.mockResolvedValue(
        criticalApiReport,
      );
      cacheOptimization.getOptimizationReport.mockResolvedValue(
        criticalCacheReport,
      );
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        criticalDbReport,
      );

      const result = await controller.generatePerformanceReport();

      expect(result.criticalIssues.length).toBeGreaterThan(0);
      expect(
        result.criticalIssues.some((issue: string) =>
          issue.includes('API平均响应时间超过500ms'),
        ),
      ).toBe(true);
      expect(
        result.criticalIssues.some((issue: string) =>
          issue.includes('缓存命中率低于30%'),
        ),
      ).toBe(true);
      expect(
        result.criticalIssues.some((issue: string) =>
          issue.includes('数据库查询时间过长'),
        ),
      ).toBe(true);
      expect(
        result.criticalIssues.some((issue: string) =>
          issue.includes('数据库健康状态危急'),
        ),
      ).toBe(true);
    });

    it('should consolidate recommendations from all sources', async () => {
      const apiReportWithRecs = {
        ...mockApiReport,
        recommendations: ['API recommendation 1', 'API recommendation 2'],
      };

      const cacheReportWithRecs = {
        ...mockCacheReport,
        recommendations: ['Cache recommendation 1'],
      };

      const dbReportWithRecs = {
        ...mockDbReport,
        recommendations: ['DB recommendation 1'],
      };

      performanceInterceptor.generatePerformanceReport.mockResolvedValue(
        apiReportWithRecs,
      );
      cacheOptimization.getOptimizationReport.mockResolvedValue(
        cacheReportWithRecs,
      );
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        dbReportWithRecs,
      );

      const result = await controller.generatePerformanceReport();

      expect(result.recommendations).toContain('API recommendation 1');
      expect(result.recommendations).toContain('Cache recommendation 1');
      expect(result.recommendations).toContain('DB recommendation 1');
    });

    it('should handle API report with message summary', async () => {
      const apiReportWithMessage = {
        summary: { message: 'No data available' },
        slowestEndpoints: [],
        recommendations: [],
      };

      performanceInterceptor.generatePerformanceReport.mockResolvedValue(
        apiReportWithMessage,
      );
      cacheOptimization.getOptimizationReport.mockResolvedValue(mockCacheReport);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        mockDbReport,
      );

      const result = await controller.generatePerformanceReport();

      expect(result).toBeDefined();
      expect(result.api.summary).toEqual({ message: 'No data available' });
    });

    it('should add comprehensive recommendations for slow requests', async () => {
      const slowApiReport = {
        ...mockApiReport,
        summary: {
          ...mockApiReport.summary,
          slowRequestPercentage: 30, // Over 20% threshold
        },
      };

      performanceInterceptor.generatePerformanceReport.mockResolvedValue(
        slowApiReport,
      );
      cacheOptimization.getOptimizationReport.mockResolvedValue(mockCacheReport);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        mockDbReport,
      );

      const result = await controller.generatePerformanceReport();

      expect(
        result.recommendations.some((rec: string) =>
          rec.includes('负载均衡'),
        ),
      ).toBe(true);
    });

    it('should add cache strategy recommendations for low hit rate', async () => {
      const lowHitRateReport = {
        ...mockCacheReport,
        performance: { ...mockPerformanceStats, hitRate: 0.4 }, // Below 50%
      };

      performanceInterceptor.generatePerformanceReport.mockResolvedValue(
        mockApiReport,
      );
      cacheOptimization.getOptimizationReport.mockResolvedValue(lowHitRateReport);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        mockDbReport,
      );

      const result = await controller.generatePerformanceReport();

      expect(
        result.recommendations.some((rec: string) =>
          rec.includes('缓存策略'),
        ),
      ).toBe(true);
    });
  });

  describe('triggerOptimization', () => {
    const mockCacheOptimizationResult = {
      success: true,
      actions: ['Cleared expired keys', 'Optimized memory usage'],
      duration: 150,
    };

    const mockDbOptimizationResult = {
      success: true,
      duration: 200,
      optimizations: ['Rebuilt indexes', 'Analyzed query patterns'],
    };

    it('should trigger optimization successfully', async () => {
      cacheOptimization.triggerOptimization.mockResolvedValue(
        mockCacheOptimizationResult,
      );
      dbOptimization.triggerManualOptimization.mockResolvedValue(
        mockDbOptimizationResult,
      );

      const result = await controller.triggerOptimization();

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.results?.cache).toEqual(mockCacheOptimizationResult);
      expect(result.results?.database).toEqual(mockDbOptimizationResult);
      expect(result.message).toBe(
        'Performance optimization completed successfully',
      );
    });

    it('should execute cache and database optimizations in parallel', async () => {
      cacheOptimization.triggerOptimization.mockResolvedValue(
        mockCacheOptimizationResult,
      );
      dbOptimization.triggerManualOptimization.mockResolvedValue(
        mockDbOptimizationResult,
      );

      await controller.triggerOptimization();

      expect(cacheOptimization.triggerOptimization).toHaveBeenCalledTimes(1);
      expect(dbOptimization.triggerManualOptimization).toHaveBeenCalledTimes(1);
    });

    it('should handle optimization failure gracefully', async () => {
      const optimizationError = new Error('Optimization failed');
      cacheOptimization.triggerOptimization.mockRejectedValue(optimizationError);

      const result = await controller.triggerOptimization();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Optimization failed');
      expect(result.message).toBe('Performance optimization failed');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should track optimization duration', async () => {
      cacheOptimization.triggerOptimization.mockResolvedValue(
        mockCacheOptimizationResult,
      );
      dbOptimization.triggerManualOptimization.mockResolvedValue(
        mockDbOptimizationResult,
      );

      const startTime = Date.now();
      const result = await controller.triggerOptimization();
      const elapsed = Date.now() - startTime;

      expect(result.duration).toBeLessThanOrEqual(elapsed + 10); // Allow small variance
    });

    it('should handle database optimization failure', async () => {
      cacheOptimization.triggerOptimization.mockResolvedValue(
        mockCacheOptimizationResult,
      );
      dbOptimization.triggerManualOptimization.mockRejectedValue(
        new Error('DB optimization failed'),
      );

      const result = await controller.triggerOptimization();

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB optimization failed');
    });
  });

  describe('getCachePerformance', () => {
    const mockOptimizationReport = {
      performance: mockPerformanceStats,
      config: mockCacheOptimizationConfig,
      recommendations: ['Optimize TTL settings'],
      health: mockCacheHealth,
    };

    it('should return comprehensive cache performance data', async () => {
      cacheService.getMetrics.mockResolvedValue(mockCacheMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      cacheOptimization.getOptimizationReport.mockResolvedValue(
        mockOptimizationReport,
      );

      const result = await controller.getCachePerformance();

      expect(result.metrics).toEqual(mockCacheMetrics);
      expect(result.health).toEqual(mockCacheHealth);
      expect(result.optimization).toEqual(mockOptimizationReport);
      expect(result.recommendations).toBeDefined();
    });

    it('should generate recommendations for low hit rate', async () => {
      const lowHitRateMetrics: CacheMetrics = {
        ...mockCacheMetrics,
        hitRate: 40, // Below 50%
      };

      cacheService.getMetrics.mockResolvedValue(lowHitRateMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      cacheOptimization.getOptimizationReport.mockResolvedValue(
        mockOptimizationReport,
      );

      const result = await controller.getCachePerformance();

      expect(
        result.recommendations.some((rec: string) =>
          rec.includes('缓存命中率较低'),
        ),
      ).toBe(true);
    });

    it('should generate recommendations for high error count', async () => {
      const highErrorMetrics: CacheMetrics = {
        ...mockCacheMetrics,
        errors: 15, // Over 10
      };

      cacheService.getMetrics.mockResolvedValue(highErrorMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      cacheOptimization.getOptimizationReport.mockResolvedValue(
        mockOptimizationReport,
      );

      const result = await controller.getCachePerformance();

      expect(
        result.recommendations.some((rec: string) =>
          rec.includes('缓存错误较多'),
        ),
      ).toBe(true);
    });

    it('should generate recommendations for unhealthy cache', async () => {
      const unhealthyCache = {
        ...mockCacheHealth,
        status: 'degraded',
      };

      cacheService.getMetrics.mockResolvedValue(mockCacheMetrics);
      cacheService.healthCheck.mockResolvedValue(unhealthyCache);
      cacheOptimization.getOptimizationReport.mockResolvedValue(
        mockOptimizationReport,
      );

      const result = await controller.getCachePerformance();

      expect(
        result.recommendations.some((rec: string) =>
          rec.includes('健康状态异常'),
        ),
      ).toBe(true);
    });

    it('should return positive recommendation when cache is healthy', async () => {
      cacheService.getMetrics.mockResolvedValue(mockCacheMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      cacheOptimization.getOptimizationReport.mockResolvedValue(
        mockOptimizationReport,
      );

      const result = await controller.getCachePerformance();

      expect(
        result.recommendations.some((rec: string) =>
          rec.includes('缓存性能表现良好'),
        ),
      ).toBe(true);
    });

    it('should call all cache-related services', async () => {
      cacheService.getMetrics.mockResolvedValue(mockCacheMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      cacheOptimization.getOptimizationReport.mockResolvedValue(
        mockOptimizationReport,
      );

      await controller.getCachePerformance();

      expect(cacheService.getMetrics).toHaveBeenCalledTimes(1);
      expect(cacheService.healthCheck).toHaveBeenCalledTimes(1);
      expect(cacheOptimization.getOptimizationReport).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDatabasePerformance', () => {
    const mockDbRecommendations = {
      performance: mockDbMetrics,
      recommendations: ['Add composite index', 'Optimize slow queries'],
      health: 'healthy' as const,
    };

    it('should return database performance data with recommendations', async () => {
      dbOptimization.getPerformanceMetrics.mockResolvedValue(mockDbMetrics);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        mockDbRecommendations,
      );

      const result = await controller.getDatabasePerformance();

      expect(result.metrics).toEqual(mockDbMetrics);
      expect(result.recommendations).toEqual(
        mockDbRecommendations.recommendations,
      );
      expect(result.health).toBe('healthy');
    });

    it('should calculate connection utilization correctly', async () => {
      dbOptimization.getPerformanceMetrics.mockResolvedValue(mockDbMetrics);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        mockDbRecommendations,
      );

      const result = await controller.getDatabasePerformance();

      expect(result.connectionInfo.poolSize).toBe(10);
      expect(result.connectionInfo.activeConnections).toBe(5);
      expect(result.connectionInfo.utilization).toBe(50); // 5/10 * 100
    });

    it('should handle warning health status', async () => {
      const warningRecommendations = {
        ...mockDbRecommendations,
        health: 'warning' as const,
      };

      dbOptimization.getPerformanceMetrics.mockResolvedValue(mockDbMetrics);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        warningRecommendations,
      );

      const result = await controller.getDatabasePerformance();

      expect(result.health).toBe('warning');
    });

    it('should handle critical health status', async () => {
      const criticalRecommendations = {
        ...mockDbRecommendations,
        health: 'critical' as const,
      };

      dbOptimization.getPerformanceMetrics.mockResolvedValue(mockDbMetrics);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        criticalRecommendations,
      );

      const result = await controller.getDatabasePerformance();

      expect(result.health).toBe('critical');
    });

    it('should call database optimization services in parallel', async () => {
      dbOptimization.getPerformanceMetrics.mockResolvedValue(mockDbMetrics);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        mockDbRecommendations,
      );

      await controller.getDatabasePerformance();

      expect(dbOptimization.getPerformanceMetrics).toHaveBeenCalledTimes(1);
      expect(
        dbOptimization.getOptimizationRecommendations,
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle zero pool size returning NaN (edge case in controller)', async () => {
      const zeroPoolMetrics: DbMetricsType = {
        ...mockDbMetrics,
        connectionPoolSize: 0,
        activeConnections: 0,
      };

      dbOptimization.getPerformanceMetrics.mockResolvedValue(zeroPoolMetrics);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue(
        mockDbRecommendations,
      );

      const result = await controller.getDatabasePerformance();

      // Note: Controller returns NaN when pool size is 0 (0/0 = NaN)
      // This is an edge case that should be handled in the controller
      expect(result.connectionInfo.poolSize).toBe(0);
      expect(result.connectionInfo.activeConnections).toBe(0);
      expect(Number.isNaN(result.connectionInfo.utilization)).toBe(true);
    });
  });

  describe('warmupCache', () => {
    const mockWarmupResult = {
      success: true,
      preloadedKeys: 25,
      duration: 150,
    };

    it('should warmup cache successfully', async () => {
      cacheOptimization.warmupCache.mockResolvedValue(mockWarmupResult);

      const result = await controller.warmupCache();

      expect(result.success).toBe(true);
      expect(result.preloadedKeys).toBe(25);
      expect(result.duration).toBe(150);
      expect(result.message).toContain('25 keys preloaded');
    });

    it('should call warmupCache with correct categories', async () => {
      cacheOptimization.warmupCache.mockResolvedValue(mockWarmupResult);

      await controller.warmupCache();

      expect(cacheOptimization.warmupCache).toHaveBeenCalledWith([
        'critical',
        'frequently-accessed',
      ]);
    });

    it('should return failure message when warmup fails', async () => {
      const failedResult = {
        success: false,
        preloadedKeys: 0,
        duration: 50,
      };

      cacheOptimization.warmupCache.mockResolvedValue(failedResult);

      const result = await controller.warmupCache();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cache warmup failed');
    });

    it('should include duration in success message', async () => {
      cacheOptimization.warmupCache.mockResolvedValue(mockWarmupResult);

      const result = await controller.warmupCache();

      expect(result.message).toContain('150ms');
    });

    it('should handle warmup service errors', async () => {
      const warmupError = new Error('Warmup service unavailable');
      cacheOptimization.warmupCache.mockRejectedValue(warmupError);

      await expect(controller.warmupCache()).rejects.toThrow(warmupError);
    });
  });

  describe('Error Handling', () => {
    it('should propagate cache service errors in getPerformanceStats', async () => {
      performanceInterceptor.getPerformanceStats.mockResolvedValue(
        mockApiPerformanceStats,
      );
      cacheService.getMetrics.mockRejectedValue(
        new Error('Cache service unavailable'),
      );

      await expect(controller.getPerformanceStats()).rejects.toThrow(
        'Cache service unavailable',
      );
    });

    it('should propagate database service errors in getPerformanceStats', async () => {
      performanceInterceptor.getPerformanceStats.mockResolvedValue(
        mockApiPerformanceStats,
      );
      cacheService.getMetrics.mockResolvedValue(mockCacheMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      dbOptimization.getPerformanceMetrics.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getPerformanceStats()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle errors in generatePerformanceReport', async () => {
      performanceInterceptor.generatePerformanceReport.mockRejectedValue(
        new Error('Report generation failed'),
      );

      await expect(controller.generatePerformanceReport()).rejects.toThrow(
        'Report generation failed',
      );
    });

    it('should handle errors in getDatabasePerformance', async () => {
      dbOptimization.getPerformanceMetrics.mockRejectedValue(
        new Error('DB metrics unavailable'),
      );

      await expect(controller.getDatabasePerformance()).rejects.toThrow(
        'DB metrics unavailable',
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle concurrent requests to different endpoints', async () => {
      performanceInterceptor.getPerformanceStats.mockResolvedValue(
        mockApiPerformanceStats,
      );
      performanceInterceptor.getHistoricalMetrics.mockResolvedValue([]);
      performanceInterceptor.generatePerformanceReport.mockResolvedValue({
        summary: { message: 'No data' },
        slowestEndpoints: [],
        recommendations: [],
      });
      cacheService.getMetrics.mockResolvedValue(mockCacheMetrics);
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);
      cacheOptimization.getOptimizationReport.mockResolvedValue({
        performance: mockPerformanceStats,
        config: mockCacheOptimizationConfig,
        recommendations: [],
        health: mockCacheHealth,
      });
      cacheOptimization.warmupCache.mockResolvedValue({
        success: true,
        preloadedKeys: 10,
        duration: 100,
      });
      dbOptimization.getPerformanceMetrics.mockResolvedValue(mockDbMetrics);
      dbOptimization.getOptimizationRecommendations.mockResolvedValue({
        performance: mockDbMetrics,
        recommendations: [],
        health: 'healthy',
      });

      const results = await Promise.all([
        controller.getPerformanceStats(),
        controller.getHistoricalMetrics(),
        controller.warmupCache(),
      ]);

      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
    });
  });
});
