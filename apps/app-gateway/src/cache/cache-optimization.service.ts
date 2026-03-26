/**
 * 缓存优化服务
 * AI Recruitment Clerk - 智能缓存管理与性能优化
 */

import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { CacheService } from './cache.service';
import { Cron } from '@nestjs/schedule';

/**
 * Defines the shape of performance stats.
 */
export interface PerformanceStats {
  hitRate: number;
  missRate: number;
  evictionCount: number;
  preloadCount: number;
  totalSize: number;
  lastOptimization: number;
}

/**
 * Defines the shape of the cache optimization config.
 */
export interface CacheOptimizationConfig {
  // 缓存策略配置
  strategies: {
    frequency: 'high' | 'medium' | 'low';
    ttl: number;
    priority: 'critical' | 'important' | 'normal';
    invalidationTriggers: string[];
  };

  // 预加载配置
  preloadRules: {
    pattern: string;
    schedule: string;
    dependencies?: string[];
  }[];

  // 清理规则
  cleanupRules: {
    maxAge: number;
    maxSize: number;
    lowHitRateThreshold: number;
  };
}

/**
 * Provides cache optimization functionality.
 */
@Injectable()
export class CacheOptimizationService implements OnModuleInit {
  private readonly logger: Logger = new Logger(CacheOptimizationService.name);

  // 优化配置
  private config: CacheOptimizationConfig = {
    strategies: {
      frequency: 'high',
      ttl: 300000, // 5分钟默认TTL
      priority: 'normal',
      invalidationTriggers: ['create', 'update', 'delete'],
    },
    preloadRules: [
      {
        pattern: 'jobs:list',
        schedule: '0 */5 * * * *', // 每5分钟预加载
        dependencies: ['db:jobs:findAll'],
      },
      {
        pattern: 'health:check',
        schedule: '0 * * * * *', // 每分钟预加载
      },
    ],
    cleanupRules: {
      maxAge: 3600000, // 1小时
      maxSize: 10000, // 最大10000个键
      lowHitRateThreshold: 0.1, // 命中率低于10%
    },
  };

  // 缓存性能统计
  private performanceStats: PerformanceStats = {
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    preloadCount: 0,
    totalSize: 0,
    lastOptimization: Date.now(),
  };

  /**
   * Initializes a new instance of the Cache Optimization Service.
   * @param cacheService - The cache service.
   */
  constructor(private readonly cacheService: CacheService) {
  // Intentionally empty
}

  /**
   * Performs the on module init operation.
   * @returns The result of the operation.
   */
  public async onModuleInit(): Promise<void> {
    this.logger.log('🔧 Cache optimization service initialized');
    await this.loadOptimizationConfig();
    this.startPerformanceMonitoring();
  }

  /**
   * 加载缓存优化配置
   */
  private async loadOptimizationConfig(): Promise<void> {
    try {
      const configKey = this.cacheService.generateKey(
        'cache',
        'optimization',
        'config',
      );
      const savedConfig =
        await this.cacheService.get<CacheOptimizationConfig>(configKey);

      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
        this.logger.log('✅ Cache optimization config loaded from cache');
      } else {
        // 保存默认配置
        await this.cacheService.set(configKey, this.config, { ttl: 86400000 }); // 24小时
        this.logger.log('📋 Default cache optimization config saved');
      }
    } catch {
      this.logger.warn(
        'Failed to load cache optimization config',
      );
    }
  }

  /**
   * 智能缓存策略选择
   */
  public async optimizeForDataType(
    dataType: string,
    accessPattern: 'read-heavy' | 'write-heavy' | 'mixed',
  ): Promise<{
    ttl: number;
    strategy: string;
    preload: boolean;
  }> {
    const baseStrategies = {
      'read-heavy': { ttl: 600000, strategy: 'long-term', preload: true }, // 10分钟
      'write-heavy': { ttl: 60000, strategy: 'short-term', preload: false }, // 1分钟
      mixed: { ttl: 300000, strategy: 'balanced', preload: true }, // 5分钟
    };

    let recommendation = baseStrategies[accessPattern];

    // 根据数据类型进行细化调整
    switch(dataType) {
      case 'user-profile':
        recommendation = {
          ttl: 1800000,
          strategy: 'user-session',
          preload: false,
        }; // 30分钟
        break;
      case 'job-listing':
        recommendation = {
          ttl: 300000,
          strategy: 'content-cache',
          preload: true,
        }; // 5分钟
        break;
      case 'resume-analysis':
        recommendation = {
          ttl: 3600000,
          strategy: 'computation-cache',
          preload: false,
        }; // 1小时
        break;
      case 'api-response':
        recommendation = { ttl: 120000, strategy: 'api-cache', preload: false }; // 2分钟
        break;
      case 'analytics':
        recommendation = {
          ttl: 900000,
          strategy: 'analytics-cache',
          preload: true,
        }; // 15分钟
        break;
    }

    this.logger.debug(
      `Cache optimization for ${dataType} (${accessPattern}):`,
      recommendation,
    );
    return recommendation;
  }

  /**
   * 预加载热点数据
   */
  @Cron('0 */5 * * * *') // 每5分钟执行
  public async preloadHotData(): Promise<void> {
    try {
      this.logger.debug('🔄 Starting cache preload cycle...');

      for(const rule of this.config.preloadRules) {
        await this.executePreloadRule(rule);
      }

      this.performanceStats.preloadCount++;
      this.logger.debug('✅ Cache preload cycle completed');
    } catch {
      this.logger.error('Cache preload error');
    }
  }

  private async executePreloadRule(rule: {
    pattern: string;
    schedule: string;
    dependencies?: string[];
  }): Promise<void> {
    try {
      switch(rule.pattern) {
        case 'jobs:list':
          await this.preloadJobsList();
          break;
        case 'health:check':
          await this.preloadHealthCheck();
          break;
        default:
          this.logger.debug(`Unknown preload pattern: ${rule.pattern}`);
      }
    } catch {
      this.logger.warn(
        `Failed to execute preload rule ${rule.pattern}`,
      );
    }
  }

  private async preloadJobsList(): Promise<void> {
    const cacheKey = this.cacheService.generateKey('jobs', 'list', 'preload');
    const exists = await this.cacheService.get(cacheKey);

    if (!exists) {
      // 这里应该调用实际的数据加载逻辑
      // 为了演示，我们使用模拟数据
      const jobsData = {
        jobs: [],
        total: 0,
        preloadedAt: new Date().toISOString(),
      };

      await this.cacheService.set(cacheKey, jobsData, { ttl: 300000 });
      this.logger.debug('📋 Jobs list preloaded to cache');
    }
  }

  private async preloadHealthCheck(): Promise<void> {
    const healthData = await this.cacheService.healthCheck();
    const cacheKey = this.cacheService.getHealthCacheKey();

    await this.cacheService.set(cacheKey, healthData, { ttl: 60000 }); // 1分钟TTL
    this.logger.debug('🏥 Health check data preloaded');
  }

  /**
   * 智能缓存清理
   */
  @Cron('0 0 */6 * * *') // 每6小时执行
  public async intelligentCleanup(): Promise<void> {
    try {
      this.logger.log('🧹 Starting intelligent cache cleanup...');

      const metrics = this.cacheService.getMetrics();
      const cleanupResult = {
        expiredKeys: 0,
        lowHitRateKeys: 0,
        oversizedKeys: 0,
        totalCleaned: 0,
      };

      // 这里应该实现实际的清理逻辑
      // 由于Redis的限制，我们主要记录统计信息

      if (metrics.hitRate < this.config.cleanupRules.lowHitRateThreshold) {
        this.logger.warn(
          `⚠️ Low cache hit rate detected: ${(metrics.hitRate * 100).toFixed(1)}%`,
        );
        // 触发缓存策略调整
        await this.adjustCacheStrategy('increase_ttl');
      }

      this.performanceStats.evictionCount += cleanupResult.totalCleaned;
      this.performanceStats.lastOptimization = Date.now();

      this.logger.log(
        `✅ Cache cleanup completed: ${cleanupResult.totalCleaned} keys cleaned`,
      );
    } catch {
      this.logger.error('Cache cleanup error');
    }
  }

  /**
   * 动态调整缓存策略
   */
  private async adjustCacheStrategy(
    action: 'increase_ttl' | 'decrease_ttl' | 'add_preload' | 'remove_preload',
  ): Promise<void> {
    try {
      switch(action) {
        case 'increase_ttl':
          this.config.strategies.ttl = Math.min(
            this.config.strategies.ttl * 1.5,
            3600000,
          ); // 最大1小时
          break;
        case 'decrease_ttl':
          this.config.strategies.ttl = Math.max(
            this.config.strategies.ttl * 0.7,
            30000,
          ); // 最小30秒
          break;
        case 'add_preload':
          // 添加更多预加载规则
          break;
        case 'remove_preload':
          // 移除效果不佳的预加载规则
          break;
      }

      // 保存调整后的配置
      const configKey = this.cacheService.generateKey(
        'cache',
        'optimization',
        'config',
      );
      await this.cacheService.set(configKey, this.config, { ttl: 86400000 });

      this.logger.log(
        `📈 Cache strategy adjusted: ${action}, new TTL: ${this.config.strategies.ttl}ms`,
      );
    } catch {
      this.logger.error('Failed to adjust cache strategy');
    }
  }

  /**
   * 开始性能监控
   */
  private startPerformanceMonitoring(): void {
    public setInterval(async (): Promise<void> => {
      try {
        const metrics = this.cacheService.getMetrics();

        this.performanceStats.hitRate = metrics.hitRate / 100; // 转换为小数
        this.performanceStats.missRate = 1 - this.performanceStats.hitRate;
        this.performanceStats.totalSize = metrics.totalOperations;

        // 记录性能统计到缓存
        const statsKey = this.cacheService.generateKey(
          'cache',
          'performance',
          'stats',
        );
        await this.cacheService.set(statsKey, this.performanceStats, {
          ttl: 300000,
        });

        // 性能警告
        if (this.performanceStats.hitRate < 0.5) {
          this.logger.warn(
            `⚠️ Cache hit rate below 50%: ${(this.performanceStats.hitRate * 100).toFixed(1)}%`,
          );
        }
      } catch {
        this.logger.error('Performance monitoring error');
      }
    }, 60000); // 每分钟更新一次
  }

  /**
   * 缓存预热
   */
  public async warmupCache(
    patterns: string[] = ['critical', 'frequently-accessed'],
  ): Promise<{
    success: boolean;
    preloadedKeys: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let preloadedKeys = 0;

    try {
      this.logger.log('🔥 Starting cache warmup...');

      for(const pattern of patterns) {
        switch(pattern) {
          case 'critical':
            await this.preloadHealthCheck();
            preloadedKeys++;
            break;
          case 'frequently-accessed':
            await this.preloadJobsList();
            preloadedKeys++;
            break;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Cache warmup completed: ${preloadedKeys} keys preloaded in ${duration}ms`,
      );

      return {
        success: true,
        preloadedKeys,
        duration,
      };
    } catch {
      this.logger.error('Cache warmup failed');
      return {
        success: false,
        preloadedKeys,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 获取缓存优化报告
   */
  public async getOptimizationReport(): Promise<{
    performance: PerformanceStats;
    config: CacheOptimizationConfig;
    recommendations: string[];
    health: Awaited<ReturnType<CacheService['healthCheck']>>;
  }> {
    const cacheHealth = await this.cacheService.healthCheck();
    const recommendations = this.generateOptimizationRecommendations();

    return {
      performance: this.performanceStats,
      config: this.config,
      recommendations,
      health: cacheHealth,
    };
  }

  private generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.performanceStats.hitRate < 0.6) {
      recommendations.push('缓存命中率低于60%，建议增加预加载和延长TTL');
    }

    if (this.performanceStats.hitRate > 0.9) {
      recommendations.push('缓存命中率很高，可以考虑减少预加载频率以节省资源');
    }

    const timeSinceLastOptimization =
      Date.now() - this.performanceStats.lastOptimization;
    if (timeSinceLastOptimization > 86400000) {
      // 24小时
      recommendations.push('缓存策略已超过24小时未优化，建议运行优化流程');
    }

    if (recommendations.length === 0) {
      recommendations.push('缓存性能表现良好，继续保持当前策略');
    }

    return recommendations;
  }

  /**
   * 手动触发缓存优化
   */
  public async triggerOptimization(): Promise<{
    success: boolean;
    actions: string[];
    duration: number;
  }> {
    const startTime = Date.now();
    const actions: string[] = [];

    try {
      this.logger.log('🚀 Manual cache optimization triggered...');

      // 执行清理
      await this.intelligentCleanup();
      actions.push('cleanup');

      // 执行预加载
      await this.preloadHotData();
      actions.push('preload');

      // 生成性能报告
      const report = await this.getOptimizationReport();
      actions.push('analysis');

      // 根据报告调整策略
      if (report.performance.hitRate < 0.6) {
        await this.adjustCacheStrategy('increase_ttl');
        actions.push('strategy_adjustment');
      }

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Cache optimization completed in ${duration}ms`);

      return {
        success: true,
        actions,
        duration,
      };
    } catch (error) {
      this.logger.error('Manual cache optimization failed:', error);
      return {
        success: false,
        actions,
        duration: Date.now() - startTime,
      };
    }
  }
}
