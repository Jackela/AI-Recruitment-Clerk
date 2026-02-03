import { Injectable } from '@nestjs/common';
import type { RedisClient } from './redis.client';
import type { SessionData } from '../../domains/user-management.dto';
import { UserSession } from '../../domains/user-management.dto';

/**
 * 会话缓存服务 - 专门管理UserSession的缓存
 */
@Injectable()
export class SessionCacheService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly IP_SESSION_PREFIX = 'ip_session:';
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24小时

  /**
   * Initializes a new instance of the Session Cache Service.
   * @param redis - The redis.
   */
  constructor(private readonly redis: RedisClient) {}

  /**
   * 缓存会话数据
   */
  public async cacheSession(session: UserSession): Promise<void> {
    const sessionData = this.serializeSession(session);
    const sessionKey = this.getSessionKey(session.getId().getValue());
    const ipKey = this.getIPSessionKey(session.getIP().getValue());

    // 同时缓存会话数据和IP映射
    await Promise.all([
      this.redis.set(sessionKey, JSON.stringify(sessionData), this.DEFAULT_TTL),
      this.redis.set(ipKey, session.getId().getValue(), this.DEFAULT_TTL),
    ]);
  }

  /**
   * 根据会话 ID 获取会话
   */
  public async getSessionById(sessionId: string): Promise<UserSession | null> {
    const sessionKey = this.getSessionKey(sessionId);
    const sessionDataStr = await this.redis.get(sessionKey);

    if (!sessionDataStr) {
      return null;
    }

    try {
      const sessionData = JSON.parse(sessionDataStr) as SessionData;
      return UserSession.restore(sessionData);
    } catch (error) {
      console.error('Failed to deserialize session:', error);
      return null;
    }
  }

  /**
   * 根据IP获取会话
   */
  public async getSessionByIP(ip: string): Promise<UserSession | null> {
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
  public async removeSession(sessionId: string, ip: string): Promise<void> {
    const sessionKey = this.getSessionKey(sessionId);
    const ipKey = this.getIPSessionKey(ip);

    await Promise.all([this.redis.del(sessionKey), this.redis.del(ipKey)]);
  }

  /**
   * 检查会话是否存在
   */
  public async sessionExists(sessionId: string): Promise<boolean> {
    const sessionKey = this.getSessionKey(sessionId);
    return this.redis.exists(sessionKey);
  }

  /**
   * 获取IP的会话统计
   */
  public async getIPSessionStats(ip: string): Promise<{
    hasActiveSession: boolean;
    sessionId?: string;
    remainingTTL?: number;
  }> {
    const ipKey = this.getIPSessionKey(ip);
    const sessionId = await this.redis.get(ipKey);

    if (!sessionId) {
      return { hasActiveSession: false };
    }

    const ttl = await this.redis.ttl(ipKey);

    return {
      hasActiveSession: true,
      sessionId,
      remainingTTL: ttl > 0 ? ttl : undefined,
    };
  }

  /**
   * 清理过期会话
   */
  public async cleanExpiredSessions(): Promise<number> {
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
  public async getActiveSessionCount(): Promise<number> {
    const pattern = `${this.SESSION_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    return keys.length;
  }

  /**
   * 延长会话有效期
   */
  public async extendSessionTTL(
    sessionId: string,
    ip: string,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    const sessionKey = this.getSessionKey(sessionId);
    const ipKey = this.getIPSessionKey(ip);

    await Promise.all([
      this.redis.expire(sessionKey, ttl),
      this.redis.expire(ipKey, ttl),
    ]);
  }

  private getSessionKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`;
  }

  private getIPSessionKey(ip: string): string {
    return `${this.IP_SESSION_PREFIX}${ip}`;
  }

  private serializeSession(session: UserSession): SessionData {
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
        paymentBonuses: 0,
      },
    };
  }
}
