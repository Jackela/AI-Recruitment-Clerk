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
exports.UsageCacheService = void 0;
const common_1 = require("@nestjs/common");
const redis_client_1 = require("./redis.client");
/**
 * 使用限制缓存服务 - 管理IP使用限制和配额
 */
let UsageCacheService = class UsageCacheService {
    constructor(redis) {
        this.redis = redis;
        this.USAGE_PREFIX = 'usage:';
        this.DAILY_PREFIX = 'daily:';
        this.BONUS_PREFIX = 'bonus:';
        this.DEFAULT_TTL = 24 * 60 * 60; // 24小时
    }
    /**
     * 获取IP今日使用次数
     */
    async getDailyUsage(ip) {
        const key = this.getDailyUsageKey(ip);
        const usage = await this.redis.get(key);
        return usage ? parseInt(usage, 10) : 0;
    }
    /**
     * 递增IP使用次数
     */
    async incrementDailyUsage(ip) {
        const key = this.getDailyUsageKey(ip);
        const usage = await this.redis.incr(key);
        // 如果是第一次使用，设置过期时间为当日末尾
        if (usage === 1) {
            const ttlToMidnight = this.getSecondsUntilMidnight();
            await this.redis.expire(key, ttlToMidnight);
        }
        return usage;
    }
    /**
     * 重置IP日使用次数
     */
    async resetDailyUsage(ip) {
        const key = this.getDailyUsageKey(ip);
        await this.redis.del(key);
    }
    /**
     * 获取IP奖励配额
     */
    async getBonusQuota(ip, bonusType) {
        const key = this.getBonusKey(ip, bonusType);
        const bonus = await this.redis.get(key);
        return bonus ? parseInt(bonus, 10) : 0;
    }
    /**
     * 增加奖励配额
     */
    async addBonusQuota(ip, bonusType, amount) {
        const key = this.getBonusKey(ip, bonusType);
        const pipeline = this.redis.getClient().pipeline();
        // 使用pipeline保证原子性
        pipeline.incrby(key, amount);
        // 设置过期时间为当日末尾
        const ttlToMidnight = this.getSecondsUntilMidnight();
        pipeline.expire(key, ttlToMidnight);
        const results = await pipeline.exec();
        return results?.[0]?.[1] || 0;
    }
    /**
     * 获取IP总配额（基础 + 奖励）
     */
    async getTotalQuota(ip, baseQuota = 5) {
        const pipeline = this.redis.getClient().pipeline();
        pipeline.get(this.getBonusKey(ip, 'questionnaire'));
        pipeline.get(this.getBonusKey(ip, 'payment'));
        const results = await pipeline.exec();
        const questionnaireBonus = results?.[0]?.[1] ? parseInt(results[0][1], 10) : 0;
        const paymentBonus = results?.[1]?.[1] ? parseInt(results[1][1], 10) : 0;
        return {
            base: baseQuota,
            questionnaire: questionnaireBonus,
            payment: paymentBonus,
            total: baseQuota + questionnaireBonus + paymentBonus
        };
    }
    /**
     * 获取IP使用状态
     */
    async getUsageStatus(ip, baseQuota = 5) {
        const pipeline = this.redis.getClient().pipeline();
        pipeline.get(this.getDailyUsageKey(ip));
        pipeline.get(this.getBonusKey(ip, 'questionnaire'));
        pipeline.get(this.getBonusKey(ip, 'payment'));
        pipeline.ttl(this.getDailyUsageKey(ip));
        const results = await pipeline.exec();
        const used = results?.[0]?.[1] ? parseInt(results[0][1], 10) : 0;
        const questionnaireBonus = results?.[1]?.[1] ? parseInt(results[1][1], 10) : 0;
        const paymentBonus = results?.[2]?.[1] ? parseInt(results[2][1], 10) : 0;
        const ttl = results?.[3]?.[1] || -1;
        const quota = {
            base: baseQuota,
            questionnaire: questionnaireBonus,
            payment: paymentBonus,
            total: baseQuota + questionnaireBonus + paymentBonus
        };
        const remaining = Math.max(0, quota.total - used);
        const resetTime = ttl > 0 ? new Date(Date.now() + ttl * 1000) : this.getNextMidnight();
        return {
            used,
            quota,
            remaining,
            canUse: remaining > 0,
            resetTime
        };
    }
    /**
     * 检查IP是否可以使用
     */
    async canUse(ip, baseQuota = 5) {
        const status = await this.getUsageStatus(ip, baseQuota);
        return status.canUse;
    }
    /**
     * 清理过期的使用记录
     */
    async cleanExpiredUsage() {
        const patterns = [
            `${this.USAGE_PREFIX}${this.DAILY_PREFIX}*`,
            `${this.USAGE_PREFIX}${this.BONUS_PREFIX}*`
        ];
        let cleanedCount = 0;
        for (const pattern of patterns) {
            const keys = await this.redis.keys(pattern);
            for (const key of keys) {
                const ttl = await this.redis.ttl(key);
                if (ttl === -2) { // 已过期
                    await this.redis.del(key);
                    cleanedCount++;
                }
            }
        }
        return cleanedCount;
    }
    /**
     * 获取系统使用统计
     */
    async getSystemUsageStats() {
        const pattern = `${this.USAGE_PREFIX}${this.DAILY_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length === 0) {
            return {
                totalActiveIPs: 0,
                totalUsageToday: 0,
                averageUsagePerIP: 0
            };
        }
        const values = await this.redis.mget(keys);
        const totalUsage = values.reduce((sum, value) => {
            return sum + (value ? parseInt(value, 10) : 0);
        }, 0);
        return {
            totalActiveIPs: keys.length,
            totalUsageToday: totalUsage,
            averageUsagePerIP: Math.round((totalUsage / keys.length) * 100) / 100
        };
    }
    getDailyUsageKey(ip) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return `${this.USAGE_PREFIX}${this.DAILY_PREFIX}${today}:${ip}`;
    }
    getBonusKey(ip, bonusType) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return `${this.USAGE_PREFIX}${this.BONUS_PREFIX}${bonusType}:${today}:${ip}`;
    }
    getSecondsUntilMidnight() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0); // 下一个午夜
        return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
    }
    getNextMidnight() {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        return midnight;
    }
};
exports.UsageCacheService = UsageCacheService;
exports.UsageCacheService = UsageCacheService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_client_1.RedisClient])
], UsageCacheService);
