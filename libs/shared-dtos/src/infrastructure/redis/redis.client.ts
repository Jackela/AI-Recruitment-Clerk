import { Redis } from 'ioredis';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

/**
 * Redis客户端封装 - 支持连接管理和缓存策略
 */
@Injectable()
export class RedisClient implements OnModuleDestroy {
  private redis: Redis;
  private isConnected = false;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
    });

    this.setupEventHandlers();
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }

  /**
   * 获取Redis实例
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * 检查连接状态
   */
  isRedisConnected(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }

  /**
   * 手动连接Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.redis.connect();
    }
  }

  /**
   * 设置键值对
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.ensureConnection();
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
    await this.ensureConnection();
    return this.redis.get(key);
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    await this.ensureConnection();
    return this.redis.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    await this.ensureConnection();
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    await this.ensureConnection();
    const result = await this.redis.expire(key, seconds);
    return result === 1;
  }

  /**
   * 获取TTL
   */
  async ttl(key: string): Promise<number> {
    await this.ensureConnection();
    return this.redis.ttl(key);
  }

  /**
   * 原子递增
   */
  async incr(key: string): Promise<number> {
    await this.ensureConnection();
    return this.redis.incr(key);
  }

  /**
   * 原子递减
   */
  async decr(key: string): Promise<number> {
    await this.ensureConnection();
    return this.redis.decr(key);
  }

  /**
   * 批量设置
   */
  async mset(keyValues: Record<string, string>): Promise<void> {
    await this.ensureConnection();
    const args = Object.entries(keyValues).flat();
    await this.redis.mset(...args);
  }

  /**
   * 批量获取
   */
  async mget(keys: string[]): Promise<Array<string | null>> {
    await this.ensureConnection();
    return this.redis.mget(...keys);
  }

  /**
   * Hash操作 - 设置字段
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    await this.ensureConnection();
    return this.redis.hset(key, field, value);
  }

  /**
   * Hash操作 - 获取字段
   */
  async hget(key: string, field: string): Promise<string | null> {
    await this.ensureConnection();
    return this.redis.hget(key, field);
  }

  /**
   * Hash操作 - 获取所有字段
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    await this.ensureConnection();
    return this.redis.hgetall(key);
  }

  /**
   * Hash操作 - 删除字段
   */
  async hdel(key: string, field: string): Promise<number> {
    await this.ensureConnection();
    return this.redis.hdel(key, field);
  }

  /**
   * 获取匹配的键
   */
  async keys(pattern: string): Promise<string[]> {
    await this.ensureConnection();
    return this.redis.keys(pattern);
  }

  /**
   * 执行Lua脚本
   */
  async eval(script: string, keys: string[], args: string[]): Promise<any> {
    await this.ensureConnection();
    return this.redis.eval(script, keys.length, ...keys, ...args);
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis connection established');
    });

    this.redis.on('ready', () => {
      console.log('Redis client ready');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('Redis client error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
      this.isConnected = false;
    });
  }
}
