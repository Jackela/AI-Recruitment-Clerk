/**
 * 性能监控拦截器
 * AI Recruitment Clerk - 实时性能追踪与优化
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '@ai-recruitment-clerk/user-management-domain';
import { CacheService } from '../../cache/cache.service';

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

type PerformanceRequest = AuthenticatedRequest &
  Request & {
  cacheHit?: boolean;
  dbQueryTime?: number;
  redisQueryTime?: number;
};

type RealtimeEndpointStat = {
  count: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  errors: number;
};

export type RealtimePerformanceStats = {
  totalRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: number;
  endpointStats: Record<string, RealtimeEndpointStat>;
};

type SlowEndpointReport = {
  endpoint: string;
  averageTime: number;
  maxTime: number;
  count: number;
  errorRate: number;
};

type PerformanceReportSummary = {
  totalRequests: number;
  averageResponseTime: number;
  slowRequestPercentage: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: string;
  note?: string;
};

export type PerformanceReport = {
  summary: PerformanceReportSummary;
  slowestEndpoints: SlowEndpointReport[];
  recommendations: string[];
};

/**
 * Represents the performance monitoring interceptor.
 */
@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceMonitoringInterceptor.name);
  private readonly performanceThresholds = {
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
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<PerformanceRequest>();
    const response = context.switchToHttp().getResponse();

    const endpoint = `${request.method} ${request.route?.path || request.url}`;
    const method = request.method;
    const userId = request.user?.id;

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordPerformanceMetric(
            startTime,
            endpoint,
            method,
            response.statusCode,
            userId,
            request,
          );
        },
        error: (error) => {
          const statusCode = this.resolveStatusCode(error);
          this.recordPerformanceMetric(
            startTime,
            endpoint,
            method,
            statusCode,
            userId,
            request,
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
    request?: PerformanceRequest,
    error?: unknown,
  ) {
    const responseTime = Date.now() - startTime;
    const timestamp = Date.now();

    const cacheHit = request?.cacheHit ?? false;
    const dbQueryTime = request?.dbQueryTime ?? 0;
    const redisQueryTime = request?.redisQueryTime ?? 0;

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

    await this.storeMetrics(metrics);
    this.checkPerformanceThresholds(metrics, error);
    this.logPerformance(metrics, error);
  }

  private async storeMetrics(metrics: PerformanceMetrics) {
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
    } catch (error) {
      this.logger.warn(
        `Failed to store performance metrics: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async updateRealtimeStats(metrics: PerformanceMetrics) {
    try {
      const statsKey = this.cacheService.generateKey(
        'performance',
        'stats',
        'realtime',
      );
      const stats =
        (await this.cacheService.get<RealtimePerformanceStats>(statsKey)) ||
        this.createInitialStats();

      const previousTotal = stats.totalRequests;
      const newTotal = previousTotal + 1;
      stats.totalRequests = newTotal;
      stats.averageResponseTime =
        (stats.averageResponseTime * previousTotal + metrics.responseTime) /
        newTotal;

      if (metrics.responseTime > this.performanceThresholds.warning) {
        stats.slowRequests += 1;
      }

      const currentErrors = stats.errorRate * previousTotal;
      const errorIncrement = metrics.statusCode >= 400 ? 1 : 0;
      stats.errorRate = (currentErrors + errorIncrement) / newTotal;

      if (metrics.cacheHit !== undefined) {
        const currentHits = stats.cacheHitRate * previousTotal;
        stats.cacheHitRate =
          (currentHits + (metrics.cacheHit ? 1 : 0)) / newTotal;
      }

      const endpointStat =
        stats.endpointStats[metrics.endpoint] ??
        this.createInitialEndpointStat(metrics.responseTime);
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
      stats.endpointStats[metrics.endpoint] = endpointStat;

      stats.lastUpdated = Date.now();

      await this.cacheService.set(statsKey, stats, { ttl: 600000 });
    } catch (error) {
      this.logger.warn(
        `Failed to update realtime stats: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics, error?: unknown) {
    const { responseTime, endpoint } = metrics;

    if (responseTime > this.performanceThresholds.critical) {
      this.logger.error(
        `🚨 CRITICAL: Slow response detected - ${endpoint} took ${responseTime}ms`,
        { metrics, error: this.getErrorMessage(error) },
      );
    } else if (responseTime > this.performanceThresholds.warning) {
      this.logger.warn(
        `⚠️ WARNING: Slow response detected - ${endpoint} took ${responseTime}ms`,
        { metrics },
      );
    }
  }

  private logPerformance(metrics: PerformanceMetrics, error?: unknown) {
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

    const errorMessage = this.getErrorMessage(error);

    if (errorMessage) {
      this.logger.error(
        `❌ ${endpoint} | ${statusCode} | ${performanceInfo} | ERROR: ${errorMessage}`,
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
   * @returns A promise that resolves to any.
   */
  async getPerformanceStats(): Promise<RealtimePerformanceStats | null> {
    try {
      const statsKey = this.cacheService.generateKey(
        'performance',
        'stats',
        'realtime',
      );
      return (
        (await this.cacheService.get<RealtimePerformanceStats>(statsKey)) ||
        this.createInitialStats()
      );
    } catch (error) {
      this.logger.error(
        `Failed to get performance stats: ${this.getErrorMessage(error)}`,
      );
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
  async getHistoricalMetrics(
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
      this.logger.error(
        `Failed to get historical metrics: ${this.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  // 性能报告生成
  /**
   * Generates performance report.
   * @returns The Promise<{ summary: any; slowestEndpoints: any[]; recommendations: string[]; }>.
   */
  async generatePerformanceReport(): Promise<PerformanceReport> {
    try {
      const stats = await this.getPerformanceStats();

      if (!stats || stats.totalRequests === 0) {
        return {
          summary: this.buildSummary(this.createInitialStats(), 'No performance data available'),
          slowestEndpoints: [],
          recommendations: [],
        };
      }

      const slowestEndpoints = this.buildSlowestEndpoints(stats);

      const recommendations = this.generateRecommendations(
        stats,
        slowestEndpoints,
      );

      return {
        summary: this.buildSummary(stats),
        slowestEndpoints,
        recommendations,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate performance report: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  private generateRecommendations(
    stats: RealtimePerformanceStats,
    slowestEndpoints: SlowEndpointReport[],
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
      stats.totalRequests === 0
        ? 0
        : (stats.slowRequests / stats.totalRequests) * 100;
    if (slowRequestPercentage > 10) {
      recommendations.push('超过10%的请求响应缓慢，建议进行系统性能调优');
    }

    if (recommendations.length === 0) {
      recommendations.push('系统性能表现良好，继续保持当前优化策略');
    }

    return recommendations;
  }

  private buildSlowestEndpoints(
    stats: RealtimePerformanceStats,
  ): SlowEndpointReport[] {
    return Object.entries(stats.endpointStats)
      .map(([endpoint, stat]) => ({
        endpoint,
        averageTime: stat.averageTime,
        maxTime: stat.maxTime,
        count: stat.count,
        errorRate: stat.count > 0 ? stat.errors / stat.count : 0,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);
  }

  private buildSummary(
    stats: RealtimePerformanceStats,
    note?: string,
  ): PerformanceReportSummary {
    const slowRequestPercentage =
      stats.totalRequests === 0
        ? 0
        : (stats.slowRequests / stats.totalRequests) * 100;
    return {
      totalRequests: stats.totalRequests,
      averageResponseTime: Math.round(stats.averageResponseTime),
      slowRequestPercentage: Math.round(slowRequestPercentage),
      cacheHitRate: Math.round(stats.cacheHitRate * 100),
      errorRate: Math.round(stats.errorRate * 100),
      lastUpdated: new Date(stats.lastUpdated).toISOString(),
      note,
    };
  }

  private createInitialStats(): RealtimePerformanceStats {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      cacheHitRate: 0,
      errorRate: 0,
      lastUpdated: Date.now(),
      endpointStats: {},
    };
  }

  private createInitialEndpointStat(
    responseTime: number,
  ): RealtimeEndpointStat {
    return {
      count: 0,
      averageTime: responseTime,
      minTime: responseTime,
      maxTime: responseTime,
      errors: 0,
    };
  }

  private getErrorMessage(error?: unknown): string | undefined {
    if (!error) {
      return undefined;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private resolveStatusCode(error: unknown): number {
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof (error as { status: unknown }).status === 'number'
    ) {
      return (error as { status: number }).status;
    }
    return 500;
  }
}
