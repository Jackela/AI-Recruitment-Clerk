/**
 * 性能监控拦截器
 * AI Recruitment Clerk - 实时性能追踪与优化
 */

import type {
  NestInterceptor,
  ExecutionContext,
  CallHandler} from '@nestjs/common';
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { CacheService } from '../../cache/cache.service';

/**
 * Defines the shape of the performance metrics.
 */
export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
  userId?: string;
  cacheHit?: boolean;
  dbQueryTime?: number;
  redisQueryTime?: number;
}

/**
 * Represents the performance monitoring interceptor.
 */
@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  private readonly logger: Logger = new Logger(PerformanceMonitoringInterceptor.name);
  private readonly performanceThresholds: { warning: number; critical: number } = {
    warning: 200, // 200ms
    critical: 500, // 500ms
  };

  /**
   * Initializes a new instance of the Performance Monitoring Interceptor.
   * @param cacheService - The cache service.
   */
  constructor(private readonly cacheService: CacheService) {}

  /**
   * Performs the intercept operation.
   * @param context - The context.
   * @param next - The next.
   * @returns The Observable<unknown>.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const endpoint = `${request.method} ${request.route?.path || request.url}`;
    const method = request.method;
    const userId = request.user?.id;

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.recordPerformanceMetric(
            startTime,
            endpoint,
            method,
            response.statusCode,
            userId,
            request,
            data,
          );
        },
        error: (error) => {
          this.recordPerformanceMetric(
            startTime,
            endpoint,
            method,
            error.status || 500,
            userId,
            request,
            null,
            error,
          );
        },
      }),
    );
  }

  private async recordPerformanceMetric(
    startTime: number,
    endpoint: string,
    method: string,
    statusCode: number,
    userId?: string,
    request?: Record<string, unknown>,
    _data?: unknown,
    error?: { status?: number; message?: string },
  ): Promise<void> {
    const responseTime = Date.now() - startTime;
    const timestamp = Date.now();

    // 提取缓存命中信息
    const cacheHit = typeof request?.cacheHit === 'boolean' ? request.cacheHit : false;
    const dbQueryTime = typeof request?.dbQueryTime === 'number' ? request.dbQueryTime : 0;
    const redisQueryTime = typeof request?.redisQueryTime === 'number' ? request.redisQueryTime : 0;

    const metrics: PerformanceMetrics = {
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp,
      userId,
      cacheHit,
      dbQueryTime,
      redisQueryTime,
    };

    // 记录性能指标
    await this.storeMetrics(metrics);

    // 性能警告检查
    this.checkPerformanceThresholds(metrics, error);

    // 实时性能日志
    this.logPerformance(metrics, error);
  }

  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      // 存储到Redis进行实时监控
      const metricsKey = this.cacheService.generateKey(
        'performance',
        'metrics',
        new Date().toISOString().split('T')[0], // 按日期分组
        Math.floor(Date.now() / 300000).toString(), // 5分钟窗口
      );

      // 获取现有指标
      const existingMetrics =
        (await this.cacheService.get<PerformanceMetrics[]>(metricsKey)) || [];
      existingMetrics.push(metrics);

      // 保留最近100条记录
      if (existingMetrics.length > 100) {
        existingMetrics.splice(0, existingMetrics.length - 100);
      }

      // 存储更新的指标（1小时TTL）
      await this.cacheService.set(metricsKey, existingMetrics, {
        ttl: 3600000,
      });

      // 更新实时统计
      await this.updateRealtimeStats(metrics);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to store performance metrics:', errorMessage);
    }
  }

  private async updateRealtimeStats(metrics: PerformanceMetrics): Promise<void> {
    try {
      const statsKey = this.cacheService.generateKey(
        'performance',
        'stats',
        'realtime',
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats: any = (await this.cacheService.get(statsKey)) ?? {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        cacheHitRate: 0,
        errorRate: 0,
        lastUpdated: Date.now(),
        endpointStats: {},
      };

      // 更新总体统计
      stats.totalRequests += 1;
      stats.averageResponseTime =
        (stats.averageResponseTime * (stats.totalRequests - 1) +
          metrics.responseTime) /
        stats.totalRequests;

      if (metrics.responseTime > this.performanceThresholds.warning) {
        stats.slowRequests += 1;
      }

      if (metrics.statusCode >= 400) {
        stats.errorRate =
          (stats.errorRate * (stats.totalRequests - 1) + 1) /
          stats.totalRequests;
      } else {
        stats.errorRate =
          (stats.errorRate * (stats.totalRequests - 1)) / stats.totalRequests;
      }

      if (metrics.cacheHit !== undefined) {
        const currentHits = stats.cacheHitRate * (stats.totalRequests - 1);
        stats.cacheHitRate =
          (currentHits + (metrics.cacheHit ? 1 : 0)) / stats.totalRequests;
      }

      // 更新端点特定统计
      if (!stats.endpointStats[metrics.endpoint]) {
        stats.endpointStats[metrics.endpoint] = {
          count: 0,
          averageTime: 0,
          minTime: metrics.responseTime,
          maxTime: metrics.responseTime,
          errors: 0,
        };
      }

      const endpointStat = stats.endpointStats[metrics.endpoint];
      endpointStat.count += 1;
      endpointStat.averageTime =
        (endpointStat.averageTime * (endpointStat.count - 1) +
          metrics.responseTime) /
        endpointStat.count;
      endpointStat.minTime = Math.min(
        endpointStat.minTime,
        metrics.responseTime,
      );
      endpointStat.maxTime = Math.max(
        endpointStat.maxTime,
        metrics.responseTime,
      );

      if (metrics.statusCode >= 400) {
        endpointStat.errors += 1;
      }

      stats.lastUpdated = Date.now();

      // 存储统计信息（10分钟TTL）
      await this.cacheService.set(statsKey, stats, { ttl: 600000 });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to update realtime stats:', errorMessage);
    }
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics, error?: { message?: string }): void {
    const { responseTime, endpoint } = metrics;

    if (responseTime > this.performanceThresholds.critical) {
      this.logger.error(
        `🚨 CRITICAL: Slow response detected - ${endpoint} took ${responseTime}ms`,
        { metrics, error: error?.message },
      );
    } else if (responseTime > this.performanceThresholds.warning) {
      this.logger.warn(
        `⚠️ WARNING: Slow response detected - ${endpoint} took ${responseTime}ms`,
        { metrics },
      );
    }
  }

  private logPerformance(metrics: PerformanceMetrics, error?: { message?: string }): void {
    const {
      endpoint,
      responseTime,
      statusCode,
      cacheHit,
      dbQueryTime,
      redisQueryTime,
    } = metrics;

    const performanceInfo = [
      `${responseTime}ms`,
      cacheHit ? '📊 CACHE' : '🔍 DB',
      (dbQueryTime ?? 0) > 0 ? `DB:${dbQueryTime}ms` : '',
      (redisQueryTime ?? 0) > 0 ? `Redis:${redisQueryTime}ms` : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (error) {
      this.logger.error(
        `❌ ${endpoint} | ${statusCode} | ${performanceInfo} | ERROR: ${error.message}`,
      );
    } else if (responseTime > this.performanceThresholds.warning) {
      this.logger.warn(
        `⚠️ ${endpoint} | ${statusCode} | ${performanceInfo} | SLOW`,
      );
    } else {
      this.logger.debug(`✅ ${endpoint} | ${statusCode} | ${performanceInfo}`);
    }
  }

  // 获取性能统计的公共方法
  /**
   * Retrieves performance stats.
   * @returns A promise that resolves to the performance stats.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getPerformanceStats(): Promise<any> {
    try {
      const statsKey = this.cacheService.generateKey(
        'performance',
        'stats',
        'realtime',
      );
      return (
        (await this.cacheService.get(statsKey)) || {
          totalRequests: 0,
          averageResponseTime: 0,
          slowRequests: 0,
          cacheHitRate: 0,
          errorRate: 0,
          lastUpdated: Date.now(),
          endpointStats: {},
        }
      );
    } catch (error) {
      this.logger.error('Failed to get performance stats:', error);
      return null;
    }
  }

  // 获取历史指标
  /**
   * Retrieves historical metrics.
   * @param date - The date.
   * @param window - The window.
   * @returns A promise that resolves to an array of PerformanceMetrics.
   */
  public async getHistoricalMetrics(
    date?: string,
    window?: string,
  ): Promise<PerformanceMetrics[]> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const targetWindow = window || Math.floor(Date.now() / 300000).toString();

      const metricsKey = this.cacheService.generateKey(
        'performance',
        'metrics',
        targetDate,
        targetWindow,
      );

      return (
        (await this.cacheService.get<PerformanceMetrics[]>(metricsKey)) || []
      );
    } catch (error) {
      this.logger.error('Failed to get historical metrics:', error);
      return [];
    }
  }

  // 性能报告生成
  /**
   * Generates performance report.
   * @returns The Promise with summary, slowestEndpoints, and recommendations.
   */
  public async generatePerformanceReport(): Promise<{
    summary: Record<string, unknown>;
    slowestEndpoints: Array<{ endpoint: string; averageTime: number; maxTime: number; count: number; errorRate: number }>;
    recommendations: string[];
  }> {
    try {
      const stats = await this.getPerformanceStats();

      if (!stats || stats.totalRequests === 0) {
        return {
          summary: { message: 'No performance data available' },
          slowestEndpoints: [],
          recommendations: [],
        };
      }

      // 找出最慢的端点
      const slowestEndpoints = Object.entries(stats.endpointStats)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(([endpoint, stat]: [string, any]) => ({
          endpoint,
          averageTime: stat.averageTime,
          maxTime: stat.maxTime,
          count: stat.count,
          errorRate: stat.errors / stat.count,
        }))
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 10);

      // 生成性能建议
      const recommendations = this.generateRecommendations(
        stats,
        slowestEndpoints,
      );

      return {
        summary: {
          totalRequests: stats.totalRequests,
          averageResponseTime: Math.round(stats.averageResponseTime),
          slowRequestPercentage: Math.round(
            (stats.slowRequests / stats.totalRequests) * 100,
          ),
          cacheHitRate: Math.round(stats.cacheHitRate * 100),
          errorRate: Math.round(stats.errorRate * 100),
          lastUpdated: new Date(stats.lastUpdated).toISOString(),
        },
        slowestEndpoints,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  private generateRecommendations(
    stats: Record<string, unknown> & { cacheHitRate: number; errorRate: number; averageResponseTime: number; slowRequests: number; totalRequests: number },
    slowestEndpoints: Array<{ endpoint: string; averageTime: number }>,
  ): string[] {
    const recommendations: string[] = [];

    if (stats.cacheHitRate < 0.5) {
      recommendations.push('缓存命中率低于50%，建议增加缓存策略和TTL优化');
    }

    if (stats.errorRate > 0.05) {
      recommendations.push('错误率超过5%，需要检查错误处理和系统稳定性');
    }

    if (stats.averageResponseTime > 150) {
      recommendations.push('平均响应时间超过150ms，建议进行数据库查询优化');
    }

    if (slowestEndpoints.length > 0 && slowestEndpoints[0].averageTime > 300) {
      recommendations.push(
        `最慢端点 ${slowestEndpoints[0].endpoint} 平均响应时间超过300ms，需要重点优化`,
      );
    }

    const slowRequestPercentage =
      (stats.slowRequests / stats.totalRequests) * 100;
    if (slowRequestPercentage > 10) {
      recommendations.push('超过10%的请求响应缓慢，建议进行系统性能调优');
    }

    if (recommendations.length === 0) {
      recommendations.push('系统性能表现良好，继续保持当前优化策略');
    }

    return recommendations;
  }
}
