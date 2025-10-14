/**
 * 通用服务基类模式 - 减少重复代码
 * Common Service Base Pattern - Reduce Code Duplication
 */

import { Logger } from '@nestjs/common';

/**
 * Defines the shape of the service config.
 */
export interface ServiceConfig {
  serviceName: string;
  enableMetrics?: boolean;
  enableCaching?: boolean;
  retryConfig?: RetryConfig;
}

/**
 * Defines the shape of the retry config.
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff?: boolean;
}

/**
 * Provides base functionality.
 */
export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly config: ServiceConfig;

  /**
   * Initializes a new instance of the Base Service.
   * @param config - The config.
   */
  constructor(config: ServiceConfig) {
    this.config = { enableMetrics: true, enableCaching: false, ...config };
    this.logger = new Logger(this.config.serviceName);
  }

  /**
   * 统一错误处理模式
   */
  protected handleError(error: Error, context?: string): void {
    const errorContext = context || 'Unknown Operation';
    this.logger.error(`[${errorContext}] ${error.message}`, error.stack);

    if (this.config.enableMetrics) {
      this.recordMetric('error', errorContext);
    }
  }

  /**
   * 统一成功日志模式
   */
  protected logSuccess(operation: string, _data?: any): void {
    this.logger.log(`[${operation}] Operation completed successfully`);

    if (this.config.enableMetrics) {
      this.recordMetric('success', operation);
    }
  }

  /**
   * 重试机制模式
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    customConfig?: RetryConfig,
  ): Promise<T> {
    const retryConfig = customConfig ||
      this.config.retryConfig || {
        maxRetries: 3,
        retryDelay: 1000,
      };

    let lastError: Error;
    let delay = retryConfig.retryDelay;

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          this.logger.log(`[${context}] Success on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `[${context}] Attempt ${attempt} failed: ${error.message}`,
        );

        if (attempt < retryConfig.maxRetries) {
          await this.sleep(delay);
          if (retryConfig.exponentialBackoff) {
            delay *= 2;
          }
        }
      }
    }

    this.handleError(lastError!, `${context} - All retries exhausted`);
    throw lastError!;
  }

  /**
   * 性能监控模式
   */
  protected async withTiming<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.logger.debug(`[${operationName}] Completed in ${duration}ms`);

      if (this.config.enableMetrics) {
        this.recordMetric('timing', operationName, { duration });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${operationName}] Failed after ${duration}ms`);
      throw error;
    }
  }

  /**
   * 缓存模式（可扩展）
   */
  protected async withCache<T>(
    key: string,
    operation: () => Promise<T>,
    ttl = 300000, // 5 minutes default
  ): Promise<T> {
    if (!this.config.enableCaching) {
      return operation();
    }

    // 这里可以集成Redis或其他缓存方案
    // For now, implement in-memory cache as example
    const cached = this.getFromCache(key);
    if (cached) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return cached;
    }

    const result = await operation();
    this.setCache(key, result, ttl);
    this.logger.debug(`Cache set for key: ${key}`);

    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private recordMetric(type: string, operation: string, data?: any): void {
    // 实现指标记录逻辑
    // Implementation for metrics recording
    console.log(`Metric: ${type} - ${operation}`, data);
  }

  private getFromCache(_key: string): any {
    // 实现缓存获取逻辑
    return null;
  }

  private setCache(_key: string, _value: any, _ttl: number): void {
    // 实现缓存设置逻辑
  }
}

/**
 * 数据访问层基类
 */
export abstract class BaseRepository<T> extends BaseService {
  /**
   * Initializes a new instance of the Base Repository.
   * @param serviceName - The service name.
   */
  constructor(serviceName: string) {
    super({ serviceName: `${serviceName}Repository` });
  }

  protected abstract createEntity(data: Partial<T>): Promise<T>;
  protected abstract findById(id: string): Promise<T | null>;
  protected abstract updateEntity(id: string, data: Partial<T>): Promise<T>;
  protected abstract deleteEntity(id: string): Promise<boolean>;

  /**
   * Creates the entity.
   * @param data - The data.
   * @returns A promise that resolves to T.
   */
  async create(data: Partial<T>): Promise<T> {
    return this.withTiming(() => this.createEntity(data), 'create');
  }

  /**
   * Performs the find one operation.
   * @param id - The id.
   * @returns A promise that resolves to T | null.
   */
  async findOne(id: string): Promise<T | null> {
    return this.withCache(`entity:${id}`, () => this.findById(id));
  }

  /**
   * Updates the entity.
   * @param id - The id.
   * @param data - The data.
   * @returns A promise that resolves to T.
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    return this.withTiming(() => this.updateEntity(id, data), 'update');
  }

  /**
   * Removes the entity.
   * @param id - The id.
   * @returns A promise that resolves to boolean value.
   */
  async delete(id: string): Promise<boolean> {
    return this.withTiming(() => this.deleteEntity(id), 'delete');
  }
}
