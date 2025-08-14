import { Redis } from 'ioredis';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

/**
 * Redis客户端封装 - 支持连接管理和缓存策略
 */
@Injectable()
export class RedisClient implements OnModuleDestroy {
  private redis: Redis | null = null;
  private isConnected = false;
  private useInMemoryStore = false;
  private memoryStore = new Map<string, { value: string; expireAt?: number }>();

  constructor() {
    // 配置开关：仅当明确启用并且存在连接信息时才连接Redis
    const disableRedis = process.env.DISABLE_REDIS === 'true';
    const useRedis = process.env.USE_REDIS_CACHE === 'true';
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

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
          if (u.hostname.endsWith('.railway.internal') && !u.searchParams.has('family')) {
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
        host: redisHost!,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
      });
    }

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
    if (!this.redis) {
      throw new Error('Redis client is not available in in-memory mode');
    }
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
  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const expireAt = ttl ? Date.now() + ttl * 1000 : undefined;
      this.memoryStore.set(key, { value, expireAt });
      return;
    }
    if (ttl) {
      await this.redis!.setex(key, ttl, value);
    } else {
      await this.redis!.set(key, value);
    }
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
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
    return this.redis!.get(key);
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const existed = this.memoryStore.delete(key);
      return existed ? 1 : 0;
    }
    return this.redis!.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const val = await this.get(key);
      return val !== null;
    }
    const result = await this.redis!.exists(key);
    return result === 1;
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const entry = this.memoryStore.get(key);
      if (!entry) return false;
      entry.expireAt = Date.now() + seconds * 1000;
      this.memoryStore.set(key, entry);
      return true;
    }
    const result = await this.redis!.expire(key, seconds);
    return result === 1;
  }

  /**
   * 获取TTL
   */
  async ttl(key: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const entry = this.memoryStore.get(key);
      if (!entry || !entry.expireAt) return -1;
      const remainingMs = entry.expireAt - Date.now();
      return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : -2;
    }
    return this.redis!.ttl(key);
  }

  /**
   * 原子递增
   */
  async incr(key: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const current = parseInt((await this.get(key)) || '0', 10);
      const next = current + 1;
      await this.set(key, String(next));
      return next;
    }
    return this.redis!.incr(key);
  }

  /**
   * 原子递减
   */
  async decr(key: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const current = parseInt((await this.get(key)) || '0', 10);
      const next = current - 1;
      await this.set(key, String(next));
      return next;
    }
    return this.redis!.decr(key);
  }

  /**
   * 批量设置
   */
  async mset(keyValues: Record<string, string>): Promise<void> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      for (const [k, v] of Object.entries(keyValues)) {
        await this.set(k, v);
      }
      return;
    }
    const args = Object.entries(keyValues).flat();
    await this.redis!.mset(...args);
  }

  /**
   * 批量获取
   */
  async mget(keys: string[]): Promise<Array<string | null>> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const results: Array<string | null> = [];
      for (const k of keys) {
        results.push(await this.get(k));
      }
      return results;
    }
    return this.redis!.mget(...keys);
  }

  /**
   * Hash操作 - 设置字段
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const existing = (await this.get(key)) || '{}';
      const obj = JSON.parse(existing);
      const isNew = obj[field] === undefined ? 1 : 0;
      obj[field] = value;
      await this.set(key, JSON.stringify(obj));
      return isNew;
    }
    return this.redis!.hset(key, field, value);
  }

  /**
   * Hash操作 - 获取字段
   */
  async hget(key: string, field: string): Promise<string | null> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const existing = (await this.get(key)) || '{}';
      const obj = JSON.parse(existing);
      return obj[field] ?? null;
    }
    return this.redis!.hget(key, field);
  }

  /**
   * Hash操作 - 获取所有字段
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const existing = (await this.get(key)) || '{}';
      return JSON.parse(existing);
    }
    return this.redis!.hgetall(key);
  }

  /**
   * Hash操作 - 删除字段
   */
  async hdel(key: string, field: string): Promise<number> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const existing = (await this.get(key)) || '{}';
      const obj = JSON.parse(existing);
      const existed = Object.prototype.hasOwnProperty.call(obj, field) ? 1 : 0;
      delete obj[field];
      await this.set(key, JSON.stringify(obj));
      return existed;
    }
    return this.redis!.hdel(key, field);
  }

  /**
   * 获取匹配的键
   */
  async keys(pattern: string): Promise<string[]> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
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
    return this.redis!.keys(pattern);
  }

  /**
   * 执行Lua脚本
   */
  async eval(script: string, keys: string[], args: string[]): Promise<any> {
    await this.ensureConnection();
    if (this.useInMemoryStore) {
      // Not implemented for in-memory mode
      return null;
    }
    return this.redis!.eval(script, keys.length, ...keys, ...args);
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
