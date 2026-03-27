import { Redis } from 'ioredis';
import type { OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

/**
 * Redis客户端封装 - 支持连接管理和缓存策略
 */
@Injectable()
export class RedisClient implements OnModuleDestroy {
  private redis: Redis | null = null;
  private isConnected = false;
  private useInMemoryStore = false;
  private memoryStore = new Map<string, { value: string; expireAt?: number }>();

  /**
   * Initializes a new instance of the Redis Client.
   */
  constructor() {
    // 配置开关：仅当明确启用并且存在连接信息时才连接Redis
    const disableRedis = process.env.DISABLE_REDIS === 'true';
    const useRedis = process.env.USE_REDIS_CACHE === 'true';
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDISHOST || process.env.REDIS_HOST;

    if (disableRedis || !useRedis || (!redisUrl && !redisHost)) {
      // 降级为内存存储，避免 ioredis 连接到 127.0.0.1:6379
      this.useInMemoryStore = true;
      this.redis = null;
      this.isConnected = true; // 就绪（内存实现）
      return;
    }

    if (redisUrl) {
      const urlWithFamily = (() => {
        try {
          const u = new URL(redisUrl);
          if (
            u.hostname.endsWith('.railway.internal') &&
            !u.searchParams.has('family')
          ) {
            u.searchParams.set('family', '0');
          }
          return u.toString();
        } catch {
          return redisUrl;
        }
      })();
      this.redis = new Redis(urlWithFamily, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        connectTimeout: 10000,
      });
    } else {
      this.redis = new Redis({
        host: redisHost,
        port: parseInt(
          process.env.REDISPORT ||
            process.env.REDIS_PORT ||
            (() => {
              throw new Error(
                'Redis configuration incomplete: REDISHOST found but REDISPORT/REDIS_PORT is missing',
              );
            })(),
        ),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
      });
    }

    this.setupEventHandlers();
  }

  /**
   * Performs the on module destroy operation.
   * @returns The result of the operation.
   */
  public async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }

  /**
   * 获取Redis实例
   */
  public getClient(): Redis {
    if (!this.redis) {
      throw new Error('Redis client is not available in in-memory mode');
    }
    return this.redis;
  }

  /**
   * 检查连接状态
   */
  public isRedisConnected(): boolean {
    return (
      this.isConnected && this.redis !== null && this.redis.status === 'ready'
    );
  }

  /**
   * 手动连接Redis
   */
  public async connect(): Promise<void> {
    if (this.useInMemoryStore) {
      this.isConnected = true;
      return;
    }
    if (!this.isConnected && this.redis) {
      await this.redis.connect();
    }
  }

  /**
   * 设置键值对
   */
  public async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    await this.ensureConnection();
    const normalizedValue = String(value);
    if (this.useInMemoryStore) {
      const expireAt = ttl ? Date.now() + ttl * 1000 : undefined;
      this.memoryStore.set(key, { value: normalizedValue, expireAt });
      return 'OK';
    }
    if (ttl) {
      await this.redis?.setex(key, ttl, normalizedValue);
      return 'OK';
    }
    await this.redis?.set(key, normalizedValue);
    return 'OK';
  }

  /**
   * 获取值
   */
  public async get(key: string): Promise<string | null> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const entry = this.memoryStore.get(key);
      if (!entry) return null;
      if (entry.expireAt && Date.now() > entry.expireAt) {
        this.memoryStore.delete(key);
        return null;
      }
      return entry.value;
    }
    return this.redis?.get(key) ?? null;
  }

  /**
   * 删除键
   */
  public async del(key: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const existed = this.memoryStore.delete(key);
      return existed ? 1 : 0;
    }
    return this.redis?.del(key) ?? 0;
  }

  /**
   * 检查键是否存在
   */
  public async exists(key: string): Promise<boolean> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const val = await this.get(key);
      return val !== null;
    }
    const result = (await this.redis?.exists(key)) ?? 0;
    return result === 1;
  }

  /**
   * 设置过期时间
   */
  public async expire(key: string, seconds: number): Promise<boolean> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const entry = this.memoryStore.get(key);
      if (!entry) return false;
      entry.expireAt = Date.now() + seconds * 1000;
      this.memoryStore.set(key, entry);
      return true;
    }
    const result = (await this.redis?.expire(key, seconds)) ?? 0;
    return result === 1;
  }

  /**
   * 获取TTL
   */
  public async ttl(key: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const entry = this.memoryStore.get(key);
      if (!entry) return -2;
      if (!entry.expireAt) return -1;
      const remainingMs = entry.expireAt - Date.now();
      return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : -2;
    }
    return this.redis?.ttl(key) ?? -2;
  }

  /**
   * 原子递增
   */
  public async incr(key: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const now = Date.now();
      const entry = this.memoryStore.get(key);
      const isExpired = entry?.expireAt !== undefined && now > entry.expireAt;
      const baseValue =
        entry && !isExpired ? parseInt(entry.value, 10) || 0 : 0;
      const next = baseValue + 1;
      const expireAt = entry && !isExpired ? entry.expireAt : undefined;
      this.memoryStore.set(key, { value: String(next), expireAt });
      return next;
    }
    return this.redis?.incr(key) ?? 0;
  }

  /**
   * 原子递减
   */
  public async decr(key: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const now = Date.now();
      const entry = this.memoryStore.get(key);
      const isExpired = entry?.expireAt !== undefined && now > entry.expireAt;
      const baseValue =
        entry && !isExpired ? parseInt(entry.value, 10) || 0 : 0;
      const next = baseValue - 1;
      const expireAt = entry && !isExpired ? entry.expireAt : undefined;
      this.memoryStore.set(key, { value: String(next), expireAt });
      return next;
    }
    return this.redis?.decr(key) ?? 0;
  }

  /**
   * 批量设置
   */
  public async mset(keyValues: Record<string, string>): Promise<void> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      for (const [k, v] of Object.entries(keyValues)) {
        await this.set(k, v);
      }
      return;
    }
    const args = Object.entries(keyValues).flat();
    await this.redis?.mset(...args);
  }

  /**
   * 批量获取
   */
  public async mget(keys: string[]): Promise<Array<string | null>> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const results: Array<string | null> = [];
      for (const k of keys) {
        results.push(await this.get(k));
      }
      return results;
    }
    return this.redis?.mget(...keys) ?? [];
  }

  /**
   * Hash操作 - 设置字段
   */
  public async hset(key: string, field: string, value: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const now = Date.now();
      const entry = this.memoryStore.get(key);
      const isExpired = entry?.expireAt !== undefined && now > entry.expireAt;
      const expireAt = entry && !isExpired ? entry.expireAt : undefined;
      let obj: Record<string, string> = {};
      if (entry && !isExpired) {
        try {
          obj = JSON.parse(entry.value);
        } catch {
          obj = {};
        }
      }
      const isNew = obj[field] === undefined ? 1 : 0;
      obj[field] = value;
      this.memoryStore.set(key, {
        value: JSON.stringify(obj),
        expireAt,
      });
      return isNew;
    }
    return this.redis?.hset(key, field, value) ?? 0;
  }

  /**
   * Hash操作 - 获取字段
   */
  public async hget(key: string, field: string): Promise<string | null> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const now = Date.now();
      const entry = this.memoryStore.get(key);
      const isExpired = entry?.expireAt !== undefined && now > entry.expireAt;
      if (!entry || isExpired) {
        if (isExpired) this.memoryStore.delete(key);
        return null;
      }
      try {
        const obj = JSON.parse(entry.value);
        return obj[field] ?? null;
      } catch {
        return null;
      }
    }
    return this.redis?.hget(key, field) ?? null;
  }

  /**
   * Hash操作 - 获取所有字段
   */
  public async hgetall(key: string): Promise<Record<string, string>> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const now = Date.now();
      const entry = this.memoryStore.get(key);
      const isExpired = entry?.expireAt !== undefined && now > entry.expireAt;
      if (!entry || isExpired) {
        if (isExpired) this.memoryStore.delete(key);
        return {};
      }
      try {
        return JSON.parse(entry.value);
      } catch {
        return {};
      }
    }
    return this.redis?.hgetall(key) ?? {};
  }

  /**
   * Hash操作 - 删除字段
   */
  public async hdel(key: string, field: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const now = Date.now();
      const entry = this.memoryStore.get(key);
      const isExpired = entry?.expireAt !== undefined && now > entry.expireAt;
      if (!entry || isExpired) {
        if (isExpired) this.memoryStore.delete(key);
        return 0;
      }
      let obj: Record<string, string> = {};
      try {
        obj = JSON.parse(entry.value);
      } catch {
        obj = {};
      }
      const existed = Object.prototype.hasOwnProperty.call(obj, field) ? 1 : 0;
      delete obj[field];
      this.memoryStore.set(key, {
        value: JSON.stringify(obj),
        expireAt: entry.expireAt,
      });
      return existed;
    }
    return this.redis?.hdel(key, field) ?? 0;
  }

  /**
   * 获取匹配的键
   */
  public async keys(pattern: string): Promise<string[]> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const regex = new RegExp(
        '^' +
          pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') +
          '$',
      );
      const now = Date.now();
      const keys: string[] = [];
      for (const [k, v] of this.memoryStore.entries()) {
        if (v.expireAt && now > v.expireAt) {
          this.memoryStore.delete(k);
          continue;
        }
        if (regex.test(k)) keys.push(k);
      }
      return keys;
    }
    return this.redis?.keys(pattern) ?? [];
  }

  /**
   * 执行Lua脚本
   */
  public async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      // Not implemented for in-memory mode
      return null;
    }
    return this.redis?.eval(script, keys.length, ...keys, ...args) ?? null;
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.redis) return;
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
