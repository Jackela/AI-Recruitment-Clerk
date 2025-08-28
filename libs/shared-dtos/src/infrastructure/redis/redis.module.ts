import { Module, Global } from '@nestjs/common';
import { RedisClient } from './redis.client';
import { SessionCacheService } from './session-cache.service';
import { UsageCacheService } from './usage-cache.service';

/**
 * Redis模块 - 全局可用的缓存服务
 */
@Global()
@Module({
  providers: [
    RedisClient,
    SessionCacheService,
    UsageCacheService,
  ],
  exports: [
    RedisClient,
    SessionCacheService,
    UsageCacheService,
  ],
})
export class RedisModule {}
