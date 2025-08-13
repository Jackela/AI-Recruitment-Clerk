// Redis Infrastructure Exports
export { RedisClient } from './redis.client';
export { SessionCacheService } from './session-cache.service';
export { UsageCacheService } from './usage-cache.service';
export { RedisModule } from './redis.module';

// Interfaces for other agents
export interface ICacheService {
  set(key: string, value: string, ttl?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<boolean>;
}

export interface ISessionCache {
  cacheSession(session: any): Promise<void>;
  getSessionById(sessionId: string): Promise<any | null>;
  getSessionByIP(ip: string): Promise<any | null>;
  removeSession(sessionId: string, ip: string): Promise<void>;
}

export interface IUsageCache {
  getDailyUsage(ip: string): Promise<number>;
  incrementDailyUsage(ip: string): Promise<number>;
  canUse(ip: string, baseQuota?: number): Promise<boolean>;
  addBonusQuota(ip: string, bonusType: 'questionnaire' | 'payment', amount: number): Promise<number>;
}
