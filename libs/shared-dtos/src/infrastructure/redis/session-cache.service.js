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
exports.SessionCacheService = void 0;
const common_1 = require("@nestjs/common");
const redis_client_1 = require("./redis.client");
const user_management_dto_1 = require("../../domains/user-management.dto");
/**
 * 会话缓存服务 - 专门管理UserSession的缓存
 */
let SessionCacheService = class SessionCacheService {
    constructor(redis) {
        this.redis = redis;
        this.SESSION_PREFIX = 'session:';
        this.IP_SESSION_PREFIX = 'ip_session:';
        this.DEFAULT_TTL = 24 * 60 * 60; // 24小时
    }
    /**
     * 缓存会话数据
     */
    async cacheSession(session) {
        const sessionData = this.serializeSession(session);
        const sessionKey = this.getSessionKey(session.getId().getValue());
        const ipKey = this.getIPSessionKey(session.getIP().getValue());
        // 同时缓存会话数据和IP映射
        await Promise.all([
            this.redis.set(sessionKey, JSON.stringify(sessionData), this.DEFAULT_TTL),
            this.redis.set(ipKey, session.getId().getValue(), this.DEFAULT_TTL)
        ]);
    }
    /**
     * 根据会话 ID 获取会话
     */
    async getSessionById(sessionId) {
        const sessionKey = this.getSessionKey(sessionId);
        const sessionDataStr = await this.redis.get(sessionKey);
        if (!sessionDataStr) {
            return null;
        }
        try {
            const sessionData = JSON.parse(sessionDataStr);
            return user_management_dto_1.UserSession.restore(sessionData);
        }
        catch (error) {
            console.error('Failed to deserialize session:', error);
            return null;
        }
    }
    /**
     * 根据IP获取会话
     */
    async getSessionByIP(ip) {
        const ipKey = this.getIPSessionKey(ip);
        const sessionId = await this.redis.get(ipKey);
        if (!sessionId) {
            return null;
        }
        return this.getSessionById(sessionId);
    }
    /**
     * 删除会话缓存
     */
    async removeSession(sessionId, ip) {
        const sessionKey = this.getSessionKey(sessionId);
        const ipKey = this.getIPSessionKey(ip);
        await Promise.all([
            this.redis.del(sessionKey),
            this.redis.del(ipKey)
        ]);
    }
    /**
     * 检查会话是否存在
     */
    async sessionExists(sessionId) {
        const sessionKey = this.getSessionKey(sessionId);
        return this.redis.exists(sessionKey);
    }
    /**
     * 获取IP的会话统计
     */
    async getIPSessionStats(ip) {
        const ipKey = this.getIPSessionKey(ip);
        const sessionId = await this.redis.get(ipKey);
        if (!sessionId) {
            return { hasActiveSession: false };
        }
        const ttl = await this.redis.ttl(ipKey);
        return {
            hasActiveSession: true,
            sessionId,
            remainingTTL: ttl > 0 ? ttl : undefined
        };
    }
    /**
     * 清理过期会话
     */
    async cleanExpiredSessions() {
        const pattern = `${this.SESSION_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        let cleanedCount = 0;
        for (const key of keys) {
            const ttl = await this.redis.ttl(key);
            if (ttl === -1 || ttl === -2) {
                // TTL = -1 表示没设置过期，-2 表示已过期
                await this.redis.del(key);
                cleanedCount++;
            }
        }
        return cleanedCount;
    }
    /**
     * 获取所有活跃会话数量
     */
    async getActiveSessionCount() {
        const pattern = `${this.SESSION_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        return keys.length;
    }
    /**
     * 延长会话有效期
     */
    async extendSessionTTL(sessionId, ip, ttl = this.DEFAULT_TTL) {
        const sessionKey = this.getSessionKey(sessionId);
        const ipKey = this.getIPSessionKey(ip);
        await Promise.all([
            this.redis.expire(sessionKey, ttl),
            this.redis.expire(ipKey, ttl)
        ]);
    }
    getSessionKey(sessionId) {
        return `${this.SESSION_PREFIX}${sessionId}`;
    }
    getIPSessionKey(ip) {
        return `${this.IP_SESSION_PREFIX}${ip}`;
    }
    serializeSession(session) {
        const usage = session.getDailyUsage();
        return {
            id: session.getId().getValue(),
            ip: session.getIP().getValue(),
            status: session.getStatus(),
            createdAt: new Date(), // 简化处理，实际应该保存创建时间
            lastActiveAt: new Date(),
            quota: {
                daily: usage.total,
                used: usage.used,
                questionnaireBonuses: 0,
                paymentBonuses: 0
            }
        };
    }
};
exports.SessionCacheService = SessionCacheService;
exports.SessionCacheService = SessionCacheService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_client_1.RedisClient])
], SessionCacheService);
