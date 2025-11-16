/**
 * 缓存服务
 * AI Recruitment Clerk - 智能缓存管理
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from './vector-store.service';

type RedisLikeClient = {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

/**
 * Defines the shape of the cache options.
 */
export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

/**
 * Options for semantic caching wrapper.
 */
export interface SemanticCacheOptions {
  ttl: number;
  similarityThreshold: number;
  maxResults?: number;
  cacheKey?: string;
  forceRefresh?: boolean;
}

/**
 * Defines the shape of the cache metrics.
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  dels: number;
  errors: number;
  hitRate: number;
  totalOperations: number;
}

/**
 * Provides cache functionality.
 */
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
    totalOperations: 0,
  };

  /**
   * Initializes a new instance of the Cache Service.
   * @param cacheManager - The cache manager.
   */
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {
    // 设置错误处理器防止未处理的错误
    this.setupErrorHandling();

    // 每30秒记录一次缓存指标
    setInterval(() => this.logMetrics(), 30000);
  }

  /**
   * 设置缓存错误处理
   */
  private setupErrorHandling(): void {
    try {
      // 如果是Redis缓存，设置错误处理器
      if (this.cacheManager.store) {
        const storeWithClient = this.cacheManager.store as {
          client?: RedisLikeClient;
        };
        const redisClient = storeWithClient.client;
        if (!redisClient) {
          return;
        }

        redisClient.on('error', (...args: unknown[]) => {
          const err =
            args[0] instanceof Error
              ? args[0]
              : new Error(String(args[0] ?? 'unknown error'));
          this.logger.warn(`Redis连接错误: ${err.message}`);
          this.metrics.errors++;
        });

        redisClient.on('connect', () => {
          this.logger.log('✅ Redis连接已建立');
        });

        redisClient.on('ready', () => {
          this.logger.log('✅ Redis连接就绪');
        });

        redisClient.on('reconnecting', () => {
          this.logger.log('🔄 Redis正在重连...');
        });

        redisClient.on('end', () => {
          this.logger.warn('⚠️ Redis连接已断开');
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('缓存错误处理器设置失败:', message);
    }
  }

  /**
   * 获取缓存值 - 带指标收集和错误处理
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await Promise.race([
        this.cacheManager.get<T>(key),
        new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Cache get timeout')), 5000);
        }),
      ]);

      if (result !== null && result !== undefined) {
        this.metrics.hits++;
        this.logger.debug(`🎯 Cache HIT [${key}]`);
      } else {
        this.metrics.misses++;
        this.logger.debug(`❌ Cache MISS [${key}]`);
      }
      this.updateTotalOperations();
      return (result ?? null) as T | null;
    } catch (error) {
      this.metrics.errors++;
      this.logger.warn(`缓存获取失败 [${key}]: ${error.message}`);
      return null;
    }
  }

  /**
   * 设置缓存值 - 带指标收集和错误处理
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl;
      await Promise.race([
        this.cacheManager.set(key, value, ttl),
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Cache set timeout')), 5000);
        }),
      ]);

      this.metrics.sets++;
      this.logger.debug(`💾 Cache SET [${key}]: TTL=${ttl}ms`);
    } catch (error) {
      this.metrics.errors++;
      this.logger.warn(`缓存设置失败 [${key}]: ${error.message}`);
      // 缓存设置失败不应该阻塞业务流程
    }
  }

  /**
   * 删除缓存 - 增强错误处理
   */
  async del(key: string): Promise<void> {
    try {
      await Promise.race([
        this.cacheManager.del(key),
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Cache del timeout')), 5000);
        }),
      ]);

      this.metrics.dels++;
      this.logger.debug(`🗑️ Cache DEL [${key}]`);
    } catch (error) {
      this.metrics.errors++;
      this.logger.warn(`缓存删除失败 [${key}]: ${error.message}`);
    }
  }

  /**
   * 重置所有缓存 - 增强错误处理
   */
  async reset(): Promise<void> {
    try {
      await Promise.race([
        this.cacheManager.reset(),
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Cache reset timeout')), 10000);
        }),
      ]);

      this.logger.log('🔄 缓存已重置');
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`缓存重置失败: ${error.message}`);
    }
  }

  /**
   * 缓存包装器 - 智能缓存与指标收集
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      this.logger.debug(`🔍 Cache wrap operation for key: ${key}`);

      // 先检查缓存
      const cached = await this.get<T>(key);
      if (cached !== null && cached !== undefined) {
        const duration = Date.now() - startTime;
        this.logger.debug(`⚡ Cache wrap HIT [${key}] in ${duration}ms`);
        return cached;
      }

      // 缓存未命中，执行函数并缓存结果
      this.logger.debug(`🏭 Cache wrap MISS [${key}] - executing function`);
      const result = await fn();

      // 存储到缓存（异步，不阻塞返回）
      this.set(key, result, options).catch((err) => {
        this.logger.warn(`缓存存储失败 [${key}]: ${err.message}`);
      });

      const duration = Date.now() - startTime;
      this.logger.debug(`✅ Cache wrap completed [${key}] in ${duration}ms`);
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.logger.warn(
        `❌ Cache wrapper failed for key [${key}]: ${error.message}`,
      );
      // 如果缓存失败，直接执行原函数
      try {
        return await fn();
      } catch (fnError) {
        this.logger.error(`原函数执行也失败 [${key}]: ${fnError.message}`);
        throw fnError;
      }
    }
  }

  /**
   * 语义缓存包装器：通过向量相似度提升缓存命中率。
   */
  async wrapSemantic<T>(
    semanticText: string,
    fallbackFn: () => Promise<T>,
    options: SemanticCacheOptions,
  ): Promise<T> {
    if (!options) {
      this.logger.warn('wrapSemantic invoked without options; skipping cache.');
      return fallbackFn();
    }

    const normalizedText = semanticText ?? '';

    let queryVector: number[] | null = null;
    try {
      queryVector = await this.embeddingService.createEmbedding(normalizedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Embedding generation failed, bypassing semantic cache: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    }

    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      this.logger.warn('Embedding provider returned empty vector; bypassing semantic cache.');
      return fallbackFn();
    }

    const rawThreshold = Number(options.similarityThreshold ?? 0);
    const similarityThreshold = Number.isFinite(rawThreshold)
      ? Math.max(0, Math.min(1, rawThreshold))
      : 0;

    const shouldSearch = options.forceRefresh !== true;
    const matches = shouldSearch
      ? await this.vectorStoreService.findSimilar(
          queryVector,
          similarityThreshold,
          options.maxResults ?? 5,
        )
      : [];

    const relevantMatches = matches.filter(
      (match) => match.similarity >= similarityThreshold,
    );

    for (const match of relevantMatches) {
      let cached: T | null | undefined;
      try {
        cached = await this.cacheManager.get<T>(match.cacheKey);
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      if (cached !== null && cached !== undefined) {
        if (cached && typeof cached === 'object') {
          (cached as Record<string, unknown>).semanticSimilarity =
            match.similarity;
        }
        this.logger.debug(
          `🔁 Semantic cache HIT [${match.cacheKey}] similarity=${match.similarity.toFixed(3)}`,
        );
        return cached;
      }
    }

    this.logger.debug('Semantic cache MISS; invoking fallback.');
    const result = await fallbackFn();
    if (result === null || result === undefined) {
      this.logger.debug('Semantic cache fallback returned empty result; skipping store.');
      return result;
    }

    const cacheKey = options.cacheKey ?? this.generateSemanticCacheKey(normalizedText);

    try {
      await this.cacheManager.set(cacheKey, result, options.ttl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to persist semantic cache entry [${cacheKey}]: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    }

    try {
      await this.vectorStoreService.addVector(cacheKey, queryVector);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to index semantic vector for [${cacheKey}]: ${message}`);
    }

    return result;
  }

  /**
   * 生成缓存键 - 改进版本，确保键的唯一性和一致性
   */
  generateKey(
    prefix: string,
    ...parts: (string | number | undefined | null)[]
  ): string {
    // 过滤空值并转换为字符串，确保一致性
    const cleanParts = parts
      .filter((part) => part !== undefined && part !== null && part !== '')
      .map((part) => String(part).toLowerCase().trim());

    const key = `${prefix}:${cleanParts.join(':')}`;
    this.logger.debug(`Generated cache key: ${key}`);
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
  getJobQueryKey(query: Record<string, unknown>): string {
    // 确保对象属性顺序一致，避免因属性顺序不同导致JSON字符串不同
    const orderedQuery: Record<string, unknown> = {};
    Object.keys(query)
      .sort()
      .forEach((key) => {
        orderedQuery[key] = query[key];
      });

    const queryStr = JSON.stringify(orderedQuery);
    const hash = crypto.createHash('sha256').update(queryStr).digest('hex');
    return this.generateKey('db', 'jobs', 'findall', hash);
  }

  private generateSemanticCacheKey(text: string): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return `semantic:${hash}`;
  }

  /**
   * 更新总操作数并计算命中率
   */
  private updateTotalOperations(): void {
    this.metrics.totalOperations = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate =
      this.metrics.totalOperations > 0
        ? (this.metrics.hits / this.metrics.totalOperations) * 100
        : 0;
  }

  /**
   * 记录缓存指标
   */
  private logMetrics(): void {
    this.updateTotalOperations();
    if (this.metrics.totalOperations > 0) {
      this.logger.log(
        `📊 Cache Metrics: Hits: ${this.metrics.hits}, Misses: ${this.metrics.misses}, Hit Rate: ${this.metrics.hitRate.toFixed(2)}%, Sets: ${this.metrics.sets}, Errors: ${this.metrics.errors}`,
      );
    }
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
      totalOperations: 0,
    };
    this.logger.log('🔄 Cache metrics reset');
  }

  /**
   * 缓存健康检查 - 增强版
   */
  async healthCheck(): Promise<{
    status: string;
    connected: boolean;
    type: string;
    metrics: CacheMetrics;
    details?: string;
  }> {
    const testKey = 'health-check-' + Date.now();
    let cacheType = 'memory';

    try {
      // 检测缓存类型
      if (this.cacheManager.store) {
        const storeWithClient = this.cacheManager.store as {
          client?: RedisLikeClient;
        };
        if (storeWithClient.client) {
          cacheType = 'redis';
        }
      }

      // 测试缓存连接（带超时）
      await Promise.race([
        Promise.all([
          this.cacheManager.set(testKey, 'ok', 1000),
          this.cacheManager.get(testKey).then((value) => {
            if (value !== 'ok') throw new Error('Value mismatch');
          }),
          this.cacheManager.del(testKey),
        ]),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), 5000);
        }),
      ]);

      return {
        status: 'healthy',
        connected: true,
        type: cacheType,
        metrics: this.getMetrics(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cache health check failed: ${message}`);

      // 尝试清理测试键
      try {
        await this.cacheManager.del(testKey);
      } catch (cleanupError) {
        // Cleanup failure is not critical for health check
        this.logger.debug(
          `Test key cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
        );
      }

      return {
        status: 'unhealthy',
        connected: false,
        type: cacheType,
        metrics: this.getMetrics(),
        details: message,
      };
    }
  }
}
