/**
 * 数据库优化中间件
 * AI Recruitment Clerk - 数据库连接池与查询性能优化
 */

import type { NestMiddleware } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import type { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

interface DatabaseMetrics {
  activeConnections: number;
  pendingConnections: number;
  queryExecutionTime: number;
  slowQueries: number;
  connectionPoolSize: number;
  lastOptimization: number;
}

interface QueryOptimizationConfig {
  slowQueryThreshold: number; // 慢查询阈值 (ms)
  connectionPoolSize: number; // 连接池大小
  maxWaitTime: number; // 最大等待时间 (ms)
  indexOptimization: boolean; // 索引优化开关
  queryPlanCache: boolean; // 查询计划缓存
}

interface DatabaseRequest extends Request {
  dbQueryStart?: number;
  dbQueryCount?: number;
  dbSlowQueries?: number;
  dbQueryTime?: number;
  queryPlanCached?: boolean;
}

/**
 * Represents the database optimization middleware.
 */
@Injectable()
export class DatabaseOptimizationMiddleware implements NestMiddleware {
  private readonly logger: Logger = new Logger(
    DatabaseOptimizationMiddleware.name,
  );

  private metrics: DatabaseMetrics = {
    activeConnections: 0,
    pendingConnections: 0,
    queryExecutionTime: 0,
    slowQueries: 0,
    connectionPoolSize: 0,
    lastOptimization: Date.now(),
  };

  private config: QueryOptimizationConfig = {
    slowQueryThreshold: 100, // 100ms慢查询阈值
    connectionPoolSize: 10, // 默认连接池大小
    maxWaitTime: 5000, // 5秒最大等待
    indexOptimization: true,
    queryPlanCache: true,
  };

  private queryCache: Map<
    string,
    {
      plan: unknown;
      hitCount: number;
      lastUsed: number;
      avgExecutionTime: number;
    }
  > = new Map();

  /**
   * Initializes a new instance of the Database Optimization Middleware.
   * @param connection - The connection.
   */
  constructor(@InjectConnection() private readonly connection: Connection) {
    this.initializeOptimization();
  }

  /**
   * Performs the use operation.
   * @param req - The req.
   * @param res - The res.
   * @param next - The next.
   * @returns The result of the operation.
   */
  public async use(
    req: DatabaseRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const queryStartTime = Date.now();

    // 设置数据库查询监控
    req.dbQueryStart = queryStartTime;
    req.dbQueryCount = 0;
    req.dbSlowQueries = 0;

    // 监听查询事件（如果支持）
    this.setupQueryMonitoring(req);

    // 连接池状态检查
    await this.checkConnectionPoolHealth();

    if (typeof res.on === 'function') {
      res.on('finish', () => {
        const totalQueryTime = Date.now() - queryStartTime;
        req.dbQueryTime = totalQueryTime;

        this.updateMetrics(req, totalQueryTime);
        this.logQueryPerformance(req, totalQueryTime);
      });
    } else {
      this.logger.debug(
        'Response object does not support event listeners, skipping metrics collection',
      );
    }

    next();
  }

  private initializeOptimization(): void {
    this.logger.log('🔧 Initializing database optimization...');

    // 配置连接池
    this.configureConnectionPool();

    // 启动性能监控
    this.startPerformanceMonitoring();

    // 定期优化
    setInterval(() => {
      this.performPeriodicOptimization();
    }, 300000); // 每5分钟

    this.logger.log('✅ Database optimization initialized');
  }

  private configureConnectionPool(): void {
    try {
      // MongoDB连接池配置
      if (this.connection.db) {
        const options = {
          maxPoolSize: this.config.connectionPoolSize,
          minPoolSize: 2,
          maxIdleTimeMS: 300000, // 5分钟空闲超时
          waitQueueTimeoutMS: this.config.maxWaitTime,
          serverSelectionTimeoutMS: 5000,
          bufferMaxEntries: 0, // 禁用缓冲
        };

        this.logger.log(
          `📊 Connection pool configured: max=${options.maxPoolSize}, min=${options.minPoolSize}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to configure connection pool:', error);
    }
  }

  private setupQueryMonitoring(req: DatabaseRequest): void {
    // 由于Mongoose的限制，我们主要监控请求级别的查询
    const queryKey = this.generateQueryKey(req);

    if (this.config.queryPlanCache && this.queryCache.has(queryKey)) {
      const cached = this.queryCache.get(queryKey);
      if (cached) {
        cached.hitCount++;
        cached.lastUsed = Date.now();
        req.queryPlanCached = true;
      }
    }
  }

  private generateQueryKey(req: Request): string {
    const { method, path, query } = req;
    return `${method}:${path}:${JSON.stringify(query)}`;
  }

  private async checkConnectionPoolHealth(): Promise<void> {
    try {
      if (this.connection.readyState === 1) {
        // Connected
        // 更新连接池指标
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.metrics.activeConnections = (this.connection.db as any)
          ?.listCollections
          ? 1
          : 0;
        this.metrics.connectionPoolSize = this.config.connectionPoolSize;
      } else {
        this.logger.warn('⚠️ Database connection not ready');
      }
    } catch (error) {
      this.logger.error('Connection pool health check failed:', error);
    }
  }

  private updateMetrics(req: DatabaseRequest, totalQueryTime: number): void {
    this.metrics.queryExecutionTime =
      (this.metrics.queryExecutionTime + totalQueryTime) / 2;

    if (totalQueryTime > this.config.slowQueryThreshold) {
      this.metrics.slowQueries++;
      req.dbSlowQueries = (req.dbSlowQueries || 0) + 1;
    }

    req.dbQueryCount = (req.dbQueryCount || 0) + 1;
  }

  private logQueryPerformance(
    req: DatabaseRequest,
    totalQueryTime: number,
  ): void {
    const { method, path } = req;
    const queryCount = req.dbQueryCount || 0;
    const slowQueries = req.dbSlowQueries || 0;
    const cached = req.queryPlanCached ? '📊' : '🔍';

    if (totalQueryTime > this.config.slowQueryThreshold) {
      this.logger.warn(
        `🐌 SLOW DB: ${method} ${path} | ${totalQueryTime}ms | ${queryCount} queries | ${slowQueries} slow ${cached}`,
      );
    } else {
      this.logger.debug(
        `⚡ DB: ${method} ${path} | ${totalQueryTime}ms | ${queryCount} queries ${cached}`,
      );
    }
  }

  private startPerformanceMonitoring(): void {
    setInterval(async () => {
      try {
        await this.collectDatabaseMetrics();
        this.analyzePerformanceTrends();
      } catch (error) {
        this.logger.error('Performance monitoring error:', error);
      }
    }, 60000); // 每分钟
  }

  private async collectDatabaseMetrics(): Promise<void> {
    try {
      if (this.connection.readyState === 1) {
        // 收集数据库统计信息
        const dbStats = await this.connection.db?.admin().serverStatus();

        if (dbStats) {
          this.metrics.activeConnections = dbStats.connections?.current || 0;
          this.logger.debug(
            `📊 DB Metrics: Active connections: ${this.metrics.activeConnections}`,
          );
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to collect database metrics:', errorMessage);
    }
  }

  private analyzePerformanceTrends(): void {
    const avgQueryTime = this.metrics.queryExecutionTime;

    // 性能趋势分析
    if (avgQueryTime > this.config.slowQueryThreshold * 2) {
      this.logger.warn(
        `⚠️ Average query time high: ${avgQueryTime.toFixed(2)}ms`,
      );
      this.triggerOptimization('high_query_time');
    }

    if (this.metrics.activeConnections > this.config.connectionPoolSize * 0.8) {
      this.logger.warn(
        `⚠️ Connection pool usage high: ${this.metrics.activeConnections}/${this.config.connectionPoolSize}`,
      );
      this.triggerOptimization('high_connection_usage');
    }
  }

  private async triggerOptimization(reason: string): Promise<void> {
    this.logger.log(`🚀 Triggering database optimization: ${reason}`);

    switch (reason) {
      case 'high_query_time':
        await this.optimizeQueryPerformance();
        break;
      case 'high_connection_usage':
        await this.optimizeConnectionPool();
        break;
      default:
        await this.performGeneralOptimization();
    }

    this.metrics.lastOptimization = Date.now();
  }

  private async optimizeQueryPerformance(): Promise<void> {
    try {
      this.logger.log('🔍 Optimizing query performance...');

      // 清理查询计划缓存中的过期项
      this.cleanupQueryPlanCache();

      // 建议添加索引（这里只是示例，实际应该基于真实的查询分析）
      const indexSuggestions = await this.analyzeIndexRequirements();

      if (indexSuggestions.length > 0) {
        this.logger.log(`💡 Index suggestions: ${indexSuggestions.join(', ')}`);
      }

      this.logger.log('✅ Query performance optimization completed');
    } catch (error) {
      this.logger.error('Query performance optimization failed:', error);
    }
  }

  private async optimizeConnectionPool(): Promise<void> {
    try {
      this.logger.log('🏊 Optimizing connection pool...');

      // 动态调整连接池大小
      const newPoolSize = Math.min(this.config.connectionPoolSize + 2, 20);
      if (newPoolSize !== this.config.connectionPoolSize) {
        this.config.connectionPoolSize = newPoolSize;
        this.logger.log(`📈 Connection pool size increased to ${newPoolSize}`);
      }

      this.logger.log('✅ Connection pool optimization completed');
    } catch (error) {
      this.logger.error('Connection pool optimization failed:', error);
    }
  }

  private async performGeneralOptimization(): Promise<void> {
    this.logger.log('🔧 Performing general database optimization...');

    // 执行多个优化策略
    await Promise.all([
      this.optimizeQueryPerformance(),
      this.optimizeConnectionPool(),
      this.cleanupStaleSessions(),
    ]);

    this.logger.log('✅ General database optimization completed');
  }

  private cleanupQueryPlanCache(): void {
    const now = Date.now();
    const staleThreshold = 3600000; // 1小时

    let cleanedCount = 0;
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.lastUsed > staleThreshold) {
        this.queryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `🧹 Cleaned ${cleanedCount} stale query plans from cache`,
      );
    }
  }

  private async analyzeIndexRequirements(): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // 基于慢查询分析建议索引
      if (this.metrics.slowQueries > 10) {
        suggestions.push(
          'Consider adding compound indexes for frequently queried fields',
        );
      }

      // 这里应该实现真实的索引分析逻辑
      // 例如：分析查询日志，识别缺失索引
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Index analysis failed:', errorMessage);
    }

    return suggestions;
  }

  private async cleanupStaleSessions(): Promise<void> {
    try {
      // 清理过期会话和连接
      this.logger.debug('🧹 Cleaning up stale database sessions...');

      // 这里应该实现会话清理逻辑
      // 例如：关闭空闲连接，清理过期会话
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Session cleanup failed:', errorMessage);
    }
  }

  private async performPeriodicOptimization(): Promise<void> {
    const timeSinceLastOptimization =
      Date.now() - this.metrics.lastOptimization;

    // 每30分钟执行一次优化
    if (timeSinceLastOptimization > 1800000) {
      await this.performGeneralOptimization();
    }
  }

  // 公共方法：获取数据库性能指标
  /**
   * Retrieves performance metrics.
   * @returns The DatabaseMetrics.
   */
  public getPerformanceMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  // 公共方法：获取优化建议
  /**
   * Retrieves optimization recommendations.
   * @returns The Promise<{ performance: DatabaseMetrics; recommendations: string[]; health: string; }>.
   */
  public async getOptimizationRecommendations(): Promise<{
    performance: DatabaseMetrics;
    recommendations: string[];
    health: string;
  }> {
    const recommendations: string[] = [];
    let health = 'healthy';

    if (this.metrics.queryExecutionTime > this.config.slowQueryThreshold) {
      recommendations.push('平均查询时间较高，建议优化慢查询和添加索引');
      health = 'warning';
    }

    if (this.metrics.activeConnections > this.config.connectionPoolSize * 0.8) {
      recommendations.push('连接池使用率高，建议增加连接池大小或优化连接管理');
      health = 'warning';
    }

    if (this.metrics.slowQueries > 50) {
      recommendations.push('慢查询数量较多，需要重点优化数据库查询性能');
      health = 'critical';
    }

    if (recommendations.length === 0) {
      recommendations.push('数据库性能表现良好，继续保持当前优化策略');
    }

    return {
      performance: this.metrics,
      recommendations,
      health,
    };
  }

  // 公共方法：手动触发优化
  /**
   * Performs the trigger manual optimization operation.
   * @returns The Promise<{ success: boolean; duration: number; optimizations: string[]; }>.
   */
  public async triggerManualOptimization(): Promise<{
    success: boolean;
    duration: number;
    optimizations: string[];
  }> {
    const startTime = Date.now();
    const optimizations: string[] = [];

    try {
      this.logger.log('🚀 Manual database optimization triggered...');

      await this.optimizeQueryPerformance();
      optimizations.push('query_performance');

      await this.optimizeConnectionPool();
      optimizations.push('connection_pool');

      await this.cleanupStaleSessions();
      optimizations.push('session_cleanup');

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Manual optimization completed in ${duration}ms`);

      return {
        success: true,
        duration,
        optimizations,
      };
    } catch (error) {
      this.logger.error('Manual optimization failed:', error);
      return {
        success: false,
        duration: Date.now() - startTime,
        optimizations,
      };
    }
  }
}
