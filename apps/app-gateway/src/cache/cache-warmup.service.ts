/**
 * 缓存预热服务
 * AI Recruitment Clerk - 启动时缓存预加载
 */

import type { OnApplicationBootstrap } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { JobRepository } from '../repositories/job.repository';
import type { CacheService } from './cache.service';

/**
 * Provides cache warmup functionality.
 */
@Injectable()
export class CacheWarmupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CacheWarmupService.name);

  /**
   * Initializes a new instance of the Cache Warmup Service.
   * @param cacheService - The cache service.
   * @param jobRepository - The job repository.
   */
  constructor(
    private readonly cacheService: CacheService,
    private readonly jobRepository: JobRepository,
  ) {}

  /**
   * Performs the on application bootstrap operation.
   * @returns The result of the operation.
   */
  async onApplicationBootstrap() {
    // 延迟5秒启动预热，让应用完全启动
    setTimeout(() => {
      this.startWarmupProcess();
    }, 5000);

    // 延迟10秒启动智能刷新机制，确保预热完成后再启动
    setTimeout(() => {
      this.startIntelligentRefreshMechanism();
    }, 10000);
  }

  /**
   * 启动缓存预热流程
   */
  private async startWarmupProcess(): Promise<void> {
    this.logger.log('🔥 Starting cache warmup process...');

    const startTime = Date.now();
    let warmedCount = 0;

    try {
      // 1. 预热健康检查数据
      await this.warmupHealthCheck();
      warmedCount++;

      // 2. 预热作业统计数据
      await this.warmupJobStatistics();
      warmedCount++;

      // 3. 预热常用查询
      await this.warmupCommonQueries();
      warmedCount++;

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Cache warmup completed: ${warmedCount} categories warmed in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('❌ Cache warmup failed:', error);
    }
  }

  /**
   * 预热健康检查数据
   */
  private async warmupHealthCheck(): Promise<void> {
    try {
      this.logger.log('🩺 Warming up health check cache...');

      // 调用健康检查方法，这会自动缓存结果
      await this.jobRepository.healthCheck();

      this.logger.debug('✓ Health check cache warmed');
    } catch (error) {
      this.logger.warn('⚠️ Health check warmup failed:', error);
    }
  }

  /**
   * 预热作业统计数据
   */
  private async warmupJobStatistics(): Promise<void> {
    try {
      this.logger.log('📊 Warming up job statistics cache...');

      // 预热状态统计
      await this.jobRepository.countByStatus();

      // 预热公司统计
      await this.jobRepository.countByCompany();

      this.logger.debug('✓ Job statistics cache warmed');
    } catch (error) {
      this.logger.warn('⚠️ Job statistics warmup failed:', error);
    }
  }

  /**
   * 预热常用查询
   */
  private async warmupCommonQueries(): Promise<void> {
    try {
      this.logger.log('🔍 Warming up common queries cache...');

      // 预热最常用的作业查询（无条件的列表查询）
      await this.jobRepository.findAll({ limit: 10 });

      // 预热活跃作业查询
      await this.jobRepository.findAll({ status: 'active', limit: 10 });

      this.logger.debug('✓ Common queries cache warmed');
    } catch (error) {
      this.logger.warn('⚠️ Common queries warmup failed:', error);
    }
  }

  /**
   * 手动触发缓存预热（可以通过API调用）
   */
  async triggerWarmup(): Promise<{
    status: string;
    warmedCategories: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let warmedCount = 0;

    try {
      await this.warmupHealthCheck();
      warmedCount++;

      await this.warmupJobStatistics();
      warmedCount++;

      await this.warmupCommonQueries();
      warmedCount++;

      const duration = Date.now() - startTime;

      return {
        status: 'success',
        warmedCategories: warmedCount,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Manual warmup failed:', error);

      return {
        status: 'failed',
        warmedCategories: warmedCount,
        duration,
      };
    }
  }

  /**
   * 智能预热 - 基于使用模式预热缓存
   */
  async intelligentWarmup(): Promise<void> {
    this.logger.log('🧠 Starting intelligent cache warmup...');

    try {
      // 获取缓存指标，分析哪些数据被频繁访问
      const metrics = this.cacheService.getMetrics();

      if (metrics.hitRate < 50) {
        // 命中率较低，加强预热
        this.logger.log('📈 Low hit rate detected, enhancing warmup...');

        // 预热更多数据
        await this.jobRepository.findAll({ limit: 20 });
        await this.jobRepository.findAll({ status: 'active', limit: 20 });
        await this.jobRepository.findAll({ status: 'completed', limit: 10 });
      }

      this.logger.log('🧠 Intelligent warmup completed');
    } catch (error) {
      this.logger.error('Intelligent warmup failed:', error);
    }
  }

  /**
   * 启动智能缓存刷新机制
   */
  startIntelligentRefreshMechanism(): void {
    this.logger.log('🔄 Starting intelligent cache refresh mechanism...');

    // 每5分钟检查一次缓存状态
    setInterval(async () => {
      await this.performIntelligentRefresh();
    }, 300000); // 5分钟

    // 每小时进行一次深度预热
    setInterval(async () => {
      await this.performDeepWarmup();
    }, 3600000); // 1小时
  }

  /**
   * 执行智能刷新
   */
  private async performIntelligentRefresh(): Promise<void> {
    try {
      const metrics = this.cacheService.getMetrics();
      this.logger.debug(
        `📊 Cache metrics - Hit rate: ${metrics.hitRate.toFixed(2)}%, Errors: ${metrics.errors}`,
      );

      // 基于命中率决定刷新策略
      if (metrics.hitRate < 30) {
        this.logger.log(
          '⚠️ Low cache hit rate detected, triggering enhanced refresh...',
        );
        await this.triggerWarmup();
      } else if (metrics.errors > 10) {
        this.logger.log(
          '❌ High error rate detected, refreshing critical caches...',
        );
        await this.refreshCriticalCaches();
      } else if (metrics.hitRate > 80) {
        // 命中率很高，可以进行预测性刷新
        this.logger.debug('✨ High hit rate, performing predictive refresh...');
        await this.predictiveRefresh();
      }

      // 重置错误计数器，避免累积
      if (metrics.errors > 50) {
        this.cacheService.resetMetrics();
        this.logger.log('🔄 Cache metrics reset due to high error count');
      }
    } catch (error) {
      this.logger.error('Intelligent refresh failed:', error);
    }
  }

  /**
   * 执行深度预热（更全面的缓存预热）
   */
  private async performDeepWarmup(): Promise<void> {
    this.logger.log('🔥 Performing deep cache warmup...');

    try {
      const startTime = Date.now();

      // 预热更多的作业数据
      await Promise.all([
        this.jobRepository.findAll({ limit: 50 }),
        this.jobRepository.findAll({ status: 'active', limit: 30 }),
        this.jobRepository.findAll({ status: 'completed', limit: 20 }),
        this.jobRepository.findAll({ status: 'paused', limit: 10 }),
        this.jobRepository.countByStatus(),
        this.jobRepository.countByCompany(),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Deep warmup completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Deep warmup failed:', error);
    }
  }

  /**
   * 刷新关键缓存
   */
  private async refreshCriticalCaches(): Promise<void> {
    this.logger.log('🎯 Refreshing critical caches...');

    try {
      // 清理并重新预热健康检查
      await this.cacheService.del(this.cacheService.getHealthCacheKey());
      await this.warmupHealthCheck();

      // 刷新作业统计
      const statusKey = this.cacheService.generateKey(
        'db',
        'jobs',
        'count',
        'status',
      );
      const companyKey = this.cacheService.generateKey(
        'db',
        'jobs',
        'count',
        'company',
      );

      await this.cacheService.del(statusKey);
      await this.cacheService.del(companyKey);

      await this.warmupJobStatistics();

      this.logger.log('✅ Critical caches refreshed');
    } catch (error) {
      this.logger.error('Critical cache refresh failed:', error);
    }
  }

  /**
   * 预测性缓存刷新（基于使用模式）
   */
  private async predictiveRefresh(): Promise<void> {
    this.logger.debug('🔮 Performing predictive cache refresh...');

    try {
      // 预测性地刷新一些可能即将过期的缓存
      const currentHour = new Date().getHours();

      // 工作时间（9-18点）更频繁刷新作业相关缓存
      if (currentHour >= 9 && currentHour <= 18) {
        await this.jobRepository.findAll({ limit: 15 });
        await this.jobRepository.countByStatus();
      }

      // 非工作时间重点维护系统健康检查
      else {
        await this.warmupHealthCheck();
      }

      this.logger.debug('✅ Predictive refresh completed');
    } catch (error) {
      this.logger.warn('Predictive refresh failed:', error);
    }
  }

  /**
   * 获取缓存刷新状态
   */
  getRefreshStatus(): {
    isActive: boolean;
    lastRefresh: Date | null;
    nextDeepWarmup: Date | null;
  } {
    return {
      isActive: true,
      lastRefresh: new Date(), // 这里应该存储实际的最后刷新时间
      nextDeepWarmup: new Date(Date.now() + 3600000), // 下次深度预热时间
    };
  }
}
