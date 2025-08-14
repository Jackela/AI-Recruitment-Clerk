/**
 * Redis分布式缓存配置
 * AI Recruitment Clerk - 性能优化缓存层
 */

import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const cacheConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => {
    const redisUrl = configService.get('REDIS_URL');
    const useRedis = configService.get('USE_REDIS_CACHE', 'true') === 'true';
    const disableRedis = configService.get('DISABLE_REDIS', 'false') === 'true';
    
    // 如果没有Redis URL、Redis被禁用、或在开发环境中，直接使用内存缓存
    if (!redisUrl || !useRedis || disableRedis || process.env.NODE_ENV === 'development') {
      console.log('🧠 初始化内存缓存配置 - Redis缓存已禁用或未配置');
      return {
        ttl: configService.get('CACHE_TTL', 300) * 1000,
        max: configService.get('CACHE_MAX_ITEMS', 1000),
        isGlobal: true,
      };
    }
    
    try {
      console.log(`初始化Redis缓存配置 - 连接到: ${redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      
      // 动态导入Redis store
      const { redisStore } = await import('cache-manager-redis-yet');
      
      return {
        store: redisStore,
        // 直接使用完整的Redis URL，让cache-manager-redis-yet处理解析
        url: redisUrl,
        ttl: configService.get('CACHE_TTL', 300) * 1000,
        max: configService.get('CACHE_MAX_ITEMS', 1000),
        isGlobal: true,
        keyPrefix: 'ai-recruitment:',
        serialize: JSON.stringify,
        deserialize: JSON.parse,
      };
    } catch (error) {
      console.warn('Redis缓存初始化失败，降级到内存缓存:', error.message);
      return {
        ttl: configService.get('CACHE_TTL', 300) * 1000,
        max: configService.get('CACHE_MAX_ITEMS', 1000),
        isGlobal: true,
      };
    }
  },
  inject: [ConfigService],
};