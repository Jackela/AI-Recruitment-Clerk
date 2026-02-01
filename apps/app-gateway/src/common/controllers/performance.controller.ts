/**
 * 性能监控控制器
 * AI Recruitment Clerk - 系统性能监控和报告
 */

import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type { PerformanceMonitoringInterceptor } from '../interceptors/performance-monitoring.interceptor';
import type { CacheService } from '../../cache/cache.service';
import type { CacheOptimizationService } from '../../cache/cache-optimization.service';
import type { DatabaseOptimizationMiddleware } from '../middleware/database-optimization.middleware';

/**
 * Exposes endpoints for performance.
 */
@ApiTags('performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance')
export class PerformanceController {
  /**
   * Initializes a new instance of the Performance Controller.
   * @param performanceInterceptor - The performance interceptor.
   * @param cacheService - The cache service.
   * @param cacheOptimization - The cache optimization.
   * @param dbOptimization - The db optimization.
   */
  constructor(
    private readonly performanceInterceptor: PerformanceMonitoringInterceptor,
    private readonly cacheService: CacheService,
    private readonly cacheOptimization: CacheOptimizationService,
    private readonly dbOptimization: DatabaseOptimizationMiddleware,
  ) {}

  /**
   * Retrieves performance stats.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取实时性能统计',
    description: '获取系统当前性能指标和实时统计信息',
  })
  @ApiResponse({ status: 200, description: '性能统计获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions(Permission.READ_ANALYSIS)
  @Get('stats')
  async getPerformanceStats() {
    const [performanceStats, cacheMetrics, dbMetrics, cacheHealth] =
      await Promise.all([
        this.performanceInterceptor.getPerformanceStats(),
        this.cacheService.getMetrics(),
        this.dbOptimization.getPerformanceMetrics(),
        this.cacheService.healthCheck(),
      ]);

    return {
      timestamp: new Date().toISOString(),
      api: performanceStats,
      cache: {
        metrics: cacheMetrics,
        health: cacheHealth,
      },
      database: dbMetrics,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    };
  }

  /**
   * Retrieves historical metrics.
   * @param date - The date.
   * @param window - The window.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取性能历史数据',
    description: '获取指定时间段的历史性能数据',
  })
  @ApiQuery({ name: 'date', required: false, description: '日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'window', required: false, description: '时间窗口标识' })
  @ApiResponse({ status: 200, description: '历史数据获取成功' })
  @Permissions(Permission.READ_ANALYSIS)
  @Get('history')
  async getHistoricalMetrics(
    @Query('date') date?: string,
    @Query('window') window?: string,
  ) {
    const metrics = await this.performanceInterceptor.getHistoricalMetrics(
      date,
      window,
    );

    if (metrics.length === 0) {
      return {
        message: 'No historical data available for the specified period',
        date: date || new Date().toISOString().split('T')[0],
        window: window || 'current',
        metrics: [],
      };
    }

    // 计算聚合统计
    const totalRequests = metrics.length;
    const averageResponseTime =
      metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const slowRequests = metrics.filter((m) => m.responseTime > 200).length;
    const errorRequests = metrics.filter((m) => m.statusCode >= 400).length;
    const cacheHits = metrics.filter((m) => m.cacheHit).length;

    return {
      period: {
        date: date || new Date().toISOString().split('T')[0],
        window: window || 'current',
      },
      summary: {
        totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        slowRequestRate: Math.round((slowRequests / totalRequests) * 100),
        errorRate: Math.round((errorRequests / totalRequests) * 100),
        cacheHitRate: Math.round((cacheHits / totalRequests) * 100),
      },
      metrics: metrics.slice(-100), // 返回最近100条记录
    };
  }

  /**
   * Generates performance report.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '生成性能报告',
    description: '生成完整的系统性能分析报告',
  })
  @ApiResponse({ status: 200, description: '性能报告生成成功' })
  @Permissions(Permission.READ_ANALYSIS)
  @Get('report')
  async generatePerformanceReport() {
    const [apiReport, cacheReport, dbReport] = await Promise.all([
      this.performanceInterceptor.generatePerformanceReport(),
      this.cacheOptimization.getOptimizationReport(),
      this.dbOptimization.getOptimizationRecommendations(),
    ]);

    const overallScore = this.calculateOverallScore(
      apiReport,
      cacheReport,
      dbReport,
    );
    const criticalIssues = this.identifyCriticalIssues(
      apiReport,
      cacheReport,
      dbReport,
    );

    return {
      generatedAt: new Date().toISOString(),
      overallScore,
      criticalIssues,
      api: apiReport,
      cache: cacheReport,
      database: dbReport,
      recommendations: this.generateConsolidatedRecommendations(
        apiReport,
        cacheReport,
        dbReport,
      ),
    };
  }

  /**
   * Performs the trigger optimization operation.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '触发性能优化',
    description: '手动触发系统性能优化流程',
  })
  @ApiResponse({ status: 200, description: '优化流程执行成功' })
  @ApiResponse({ status: 500, description: '优化流程执行失败' })
  @Permissions(Permission.CREATE_JOB) // 使用较高权限
  @Post('optimize')
  async triggerOptimization() {
    const startTime = Date.now();

    try {
      const [cacheOptimization, dbOptimization] = await Promise.all([
        this.cacheOptimization.triggerOptimization(),
        this.dbOptimization.triggerManualOptimization(),
      ]);

      const duration = Date.now() - startTime;

      return {
        success: true,
        duration,
        results: {
          cache: cacheOptimization,
          database: dbOptimization,
        },
        message: 'Performance optimization completed successfully',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        duration,
        error: error.message,
        message: 'Performance optimization failed',
      };
    }
  }

  /**
   * Retrieves cache performance.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取缓存性能详情',
    description: '获取详细的缓存性能指标和优化建议',
  })
  @ApiResponse({ status: 200, description: '缓存性能数据获取成功' })
  @Permissions(Permission.READ_ANALYSIS)
  @Get('cache')
  async getCachePerformance() {
    const [metrics, health, optimizationReport] = await Promise.all([
      this.cacheService.getMetrics(),
      this.cacheService.healthCheck(),
      this.cacheOptimization.getOptimizationReport(),
    ]);

    return {
      metrics,
      health,
      optimization: optimizationReport,
      recommendations: this.generateCacheRecommendations(metrics, health),
    };
  }

  /**
   * Retrieves database performance.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取数据库性能详情',
    description: '获取详细的数据库性能指标和优化建议',
  })
  @ApiResponse({ status: 200, description: '数据库性能数据获取成功' })
  @Permissions(Permission.READ_ANALYSIS)
  @Get('database')
  async getDatabasePerformance() {
    const [metrics, recommendations] = await Promise.all([
      this.dbOptimization.getPerformanceMetrics(),
      this.dbOptimization.getOptimizationRecommendations(),
    ]);

    return {
      metrics,
      recommendations: recommendations.recommendations,
      health: recommendations.health,
      connectionInfo: {
        poolSize: metrics.connectionPoolSize,
        activeConnections: metrics.activeConnections,
        utilization: Math.round(
          (metrics.activeConnections / metrics.connectionPoolSize) * 100,
        ),
      },
    };
  }

  /**
   * Performs the warmup cache operation.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '预热缓存',
    description: '手动预热系统缓存以提升性能',
  })
  @ApiResponse({ status: 200, description: '缓存预热成功' })
  @Permissions(Permission.CREATE_JOB)
  @Post('cache/warmup')
  async warmupCache() {
    const result = await this.cacheOptimization.warmupCache([
      'critical',
      'frequently-accessed',
    ]);

    return {
      success: result.success,
      preloadedKeys: result.preloadedKeys,
      duration: result.duration,
      message: result.success
        ? `Cache warmup completed: ${result.preloadedKeys} keys preloaded in ${result.duration}ms`
        : 'Cache warmup failed',
    };
  }

  private calculateOverallScore(
    apiReport: any,
    cacheReport: any,
    dbReport: any,
  ): number {
    let score = 100;

    // API性能评分 (40%)
    const apiScore = Math.max(
      0,
      100 - apiReport.summary.averageResponseTime / 5,
    ); // 500ms = 0分
    score = score * 0.4 + apiScore * 0.4;

    // 缓存性能评分 (30%)
    const cacheScore = cacheReport.performance.hitRate * 100;
    score = score * 0.7 + cacheScore * 0.3;

    // 数据库性能评分 (30%)
    const dbScore = Math.max(
      0,
      100 - dbReport.performance.queryExecutionTime / 2,
    ); // 200ms = 0分
    score = score * 0.7 + dbScore * 0.3;

    return Math.round(score);
  }

  private identifyCriticalIssues(
    apiReport: any,
    cacheReport: any,
    dbReport: any,
  ): string[] {
    const issues: string[] = [];

    if (apiReport.summary.averageResponseTime > 500) {
      issues.push('API平均响应时间超过500ms，严重影响用户体验');
    }

    if (cacheReport.performance.hitRate < 0.3) {
      issues.push('缓存命中率低于30%，缓存效果极差');
    }

    if (dbReport.performance.queryExecutionTime > 200) {
      issues.push('数据库查询时间过长，需要紧急优化');
    }

    if (dbReport.health === 'critical') {
      issues.push('数据库健康状态危急，需要立即处理');
    }

    return issues;
  }

  private generateConsolidatedRecommendations(
    apiReport: any,
    cacheReport: any,
    dbReport: any,
  ): string[] {
    const recommendations = new Set<string>();

    // 合并所有建议
    apiReport.recommendations?.forEach((rec: string) =>
      recommendations.add(rec),
    );
    cacheReport.recommendations?.forEach((rec: string) =>
      recommendations.add(rec),
    );
    dbReport.recommendations?.forEach((rec: string) =>
      recommendations.add(rec),
    );

    // 添加综合建议
    if (apiReport.summary.slowRequestPercentage > 20) {
      recommendations.add('建议全面检查系统架构，考虑引入负载均衡和缓存层');
    }

    if (cacheReport.performance.hitRate < 0.5) {
      recommendations.add('建议重新设计缓存策略，增加预加载和延长TTL时间');
    }

    return Array.from(recommendations);
  }

  private generateCacheRecommendations(metrics: any, health: any): string[] {
    const recommendations: string[] = [];

    if (metrics.hitRate < 50) {
      recommendations.push('缓存命中率较低，建议增加缓存预加载策略');
    }

    if (metrics.errors > 10) {
      recommendations.push('缓存错误较多，建议检查Redis连接和配置');
    }

    if (health.status !== 'healthy') {
      recommendations.push('缓存服务健康状态异常，建议立即检查');
    }

    if (recommendations.length === 0) {
      recommendations.push('缓存性能表现良好');
    }

    return recommendations;
  }
}
