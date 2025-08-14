/**
 * 缓存服务
 * AI Recruitment Clerk - 智能缓存管理
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  dels: number;
  errors: number;
  hitRate: number;
  totalOperations: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    dels: 0,
    errors: 0,
    hitRate: 0,
    totalOperations: 0
  };

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    // 每30秒记录一次缓存指标
    setInterval(() => this.logMetrics(), 30000);
  }

  /**
   * 获取缓存值 - 带指标收集
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.cacheManager.get<T>(key);
      if (result !== null && result !== undefined) {
        this.metrics.hits++;
        console.log(`🎯 Cache HIT [${key}]`);
      } else {
        this.metrics.misses++;
        console.log(`❌ Cache MISS [${key}]`);
      }
      this.updateTotalOperations();
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`缓存获取失败 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 设置缓存值 - 带指标收集
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl;
      await this.cacheManager.set(key, value, ttl);
      this.metrics.sets++;
      console.log(`💾 Cache SET [${key}]: TTL=${ttl}ms`);
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`缓存设置失败 [${key}]:`, error);
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      console.error(`缓存删除失败 [${key}]:`, error);
    }
  }

  /**
   * 重置所有缓存
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
    } catch (error) {
      console.error('缓存重置失败:', error);
    }
  }

  /**
   * 缓存包装器 - 智能缓存与指标收集
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const startTime = Date.now();
    try {
      console.log(`🔍 Cache wrap operation for key: ${key}`);
      
      // 先检查缓存
      const cached = await this.get<T>(key);
      if (cached !== null && cached !== undefined) {
        const duration = Date.now() - startTime;
        console.log(`⚡ Cache wrap HIT [${key}] in ${duration}ms`);
        return cached;
      }
      
      // 缓存未命中，执行函数并缓存结果
      console.log(`🏭 Cache wrap MISS [${key}] - executing function`);
      const result = await fn();
      
      // 存储到缓存
      await this.set(key, result, options);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Cache wrap completed [${key}] in ${duration}ms`);
      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error(`❌ Cache wrapper failed for key [${key}]:`, error);
      // 如果缓存失败，直接执行原函数
      return await fn();
    }
  }

  /**
   * 生成缓存键 - 改进版本，确保键的唯一性和一致性
   */
  generateKey(prefix: string, ...parts: (string | number | undefined | null)[]): string {
    // 过滤空值并转换为字符串，确保一致性
    const cleanParts = parts
      .filter(part => part !== undefined && part !== null && part !== '')
      .map(part => String(part).toLowerCase().trim());
    
    const key = `${prefix}:${cleanParts.join(':')}`;
    console.log(`Generated cache key: ${key}`);
    return key;
  }

  /**
   * 健康检查缓存键
   */
  getHealthCacheKey(): string {
    return this.generateKey('health', 'check');
  }

  /**
   * API文档缓存键
   */
  getApiDocsCacheKey(): string {
    return this.generateKey('api', 'docs');
  }

  /**
   * 用户会话缓存键
   */
  getUserSessionKey(userId: string): string {
    return this.generateKey('session', userId);
  }

  /**
   * 职位查询缓存键
   */
  getJobQueryKey(query: any): string {
    // 确保对象属性顺序一致，避免因属性顺序不同导致JSON字符串不同
    const orderedQuery = {};
    Object.keys(query).sort().forEach(key => {
      orderedQuery[key] = query[key];
    });

    const queryStr = JSON.stringify(orderedQuery);
    const hash = crypto.createHash('sha256').update(queryStr).digest('hex');
    return this.generateKey('db', 'jobs', 'findall', hash);
  }

  /**
   * 更新总操作数并计算命中率
   */
  private updateTotalOperations(): void {
    this.metrics.totalOperations = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = this.metrics.totalOperations > 0 
      ? (this.metrics.hits / this.metrics.totalOperations) * 100 
      : 0;
  }

  /**
   * 记录缓存指标
   */
  private logMetrics(): void {
    this.updateTotalOperations();
    this.logger.log(`📊 Cache Metrics: Hits: ${this.metrics.hits}, Misses: ${this.metrics.misses}, Hit Rate: ${this.metrics.hitRate.toFixed(2)}%, Sets: ${this.metrics.sets}, Errors: ${this.metrics.errors}`);
  }

  /**
   * 获取当前缓存指标
   */
  getMetrics(): CacheMetrics {
    this.updateTotalOperations();
    return { ...this.metrics };
  }

  /**
   * 重置缓存指标
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      dels: 0,
      errors: 0,
      hitRate: 0,
      totalOperations: 0
    };
    this.logger.log('🔄 Cache metrics reset');
  }

  /**
   * 缓存健康检查
   */
  async healthCheck(): Promise<{
    status: string;
    connected: boolean;
    metrics: CacheMetrics;
  }> {
    try {
      // 测试缓存连接
      const testKey = 'health-check-' + Date.now();
      await this.cacheManager.set(testKey, 'ok', 1000);
      const testValue = await this.cacheManager.get(testKey);
      await this.cacheManager.del(testKey);
      
      return {
        status: testValue === 'ok' ? 'healthy' : 'degraded',
        connected: true,
        metrics: this.getMetrics()
      };
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        metrics: this.getMetrics()
      };
    }
  }
}