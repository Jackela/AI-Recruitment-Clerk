"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
const ioredis_1 = require("ioredis");
const common_1 = require("@nestjs/common");
/**
 * Redis客户端封装 - 支持连接管理和缓存策略
 */
let RedisClient = class RedisClient {
    constructor() {
        this.isConnected = false;
        this.redis = new ioredis_1.Redis({
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
    getClient() {
        return this.redis;
    }
    /**
     * 检查连接状态
     */
    isRedisConnected() {
        return this.isConnected && this.redis.status === 'ready';
    }
    /**
     * 手动连接Redis
     */
    async connect() {
        if (!this.isConnected) {
            await this.redis.connect();
        }
    }
    /**
     * 设置键值对
     */
    async set(key, value, ttl) {
        await this.ensureConnection();
        if (ttl) {
            await this.redis.setex(key, ttl, value);
        }
        else {
            await this.redis.set(key, value);
        }
    }
    /**
     * 获取值
     */
    async get(key) {
        await this.ensureConnection();
        return this.redis.get(key);
    }
    /**
     * 删除键
     */
    async del(key) {
        await this.ensureConnection();
        return this.redis.del(key);
    }
    /**
     * 检查键是否存在
     */
    async exists(key) {
        await this.ensureConnection();
        const result = await this.redis.exists(key);
        return result === 1;
    }
    /**
     * 设置过期时间
     */
    async expire(key, seconds) {
        await this.ensureConnection();
        const result = await this.redis.expire(key, seconds);
        return result === 1;
    }
    /**
     * 获取TTL
     */
    async ttl(key) {
        await this.ensureConnection();
        return this.redis.ttl(key);
    }
    /**
     * 原子递增
     */
    async incr(key) {
        await this.ensureConnection();
        return this.redis.incr(key);
    }
    /**
     * 原子递减
     */
    async decr(key) {
        await this.ensureConnection();
        return this.redis.decr(key);
    }
    /**
     * 批量设置
     */
    async mset(keyValues) {
        await this.ensureConnection();
        const args = Object.entries(keyValues).flat();
        await this.redis.mset(...args);
    }
    /**
     * 批量获取
     */
    async mget(keys) {
        await this.ensureConnection();
        return this.redis.mget(...keys);
    }
    /**
     * Hash操作 - 设置字段
     */
    async hset(key, field, value) {
        await this.ensureConnection();
        return this.redis.hset(key, field, value);
    }
    /**
     * Hash操作 - 获取字段
     */
    async hget(key, field) {
        await this.ensureConnection();
        return this.redis.hget(key, field);
    }
    /**
     * Hash操作 - 获取所有字段
     */
    async hgetall(key) {
        await this.ensureConnection();
        return this.redis.hgetall(key);
    }
    /**
     * Hash操作 - 删除字段
     */
    async hdel(key, field) {
        await this.ensureConnection();
        return this.redis.hdel(key, field);
    }
    /**
     * 获取匹配的键
     */
    async keys(pattern) {
        await this.ensureConnection();
        return this.redis.keys(pattern);
    }
    /**
     * 执行Lua脚本
     */
    async eval(script, keys, args) {
        await this.ensureConnection();
        return this.redis.eval(script, keys.length, ...keys, ...args);
    }
    async ensureConnection() {
        if (!this.isConnected) {
            await this.connect();
        }
    }
    setupEventHandlers() {
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
};
exports.RedisClient = RedisClient;
exports.RedisClient = RedisClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RedisClient);
