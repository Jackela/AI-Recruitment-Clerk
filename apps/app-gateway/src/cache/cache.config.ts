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
    const redisUrl = configService.get('REDIS_URL', 'redis://redis:6379');
    const useRedis = configService.get('USE_REDIS_CACHE', 'true') === 'true';
    
    if (useRedis) {
      console.log(`初始化Redis缓存配置 - 连接到: ${redisUrl}`);
      
      try {
        // 动态导入Redis store
        const { redisStore } = await import('cache-manager-redis-yet');
        
        return {
          store: redisStore,
          socket: {
            host: redisUrl.includes('://') ? redisUrl.split('://')[1].split(':')[0] : 'redis',
            port: redisUrl.includes(':') ? parseInt(redisUrl.split(':').pop() || '6379') : 6379,
            connectTimeout: 5000,     // 减少连接超时时间
            commandTimeout: 3000,     // 命令执行超时
            lazyConnect: false,       // 立即连接，减少首次请求延迟
            retryDelayOnFailover: 100,
            enableReadyCheck: true,
            maxRetriesPerRequest: 3,
            retryDelayOnClusterDown: 300,
            enableOfflineQueue: false, // 禁用离线队列，立即失败
            family: 4, // IPv4
            keepAlive: 30000, // 30秒保持连接活跃
            db: 0, // 使用数据库0
          },
          ttl: configService.get('CACHE_TTL', 300) * 1000, // 5分钟，转换为毫秒
          max: configService.get('CACHE_MAX_ITEMS', 1000),
          isGlobal: true,
          // Redis特定配置
          keyPrefix: 'ai-recruitment:', // 键前缀，避免冲突
          serialize: JSON.stringify,    // 序列化函数
          deserialize: JSON.parse,      // 反序列化函数
        };
      } catch (error) {
        console.warn('Redis缓存初始化失败，降级到内存缓存:', error.message);
        // 降级到内存缓存
        return {
          ttl: configService.get('CACHE_TTL', 300) * 1000,
          max: configService.get('CACHE_MAX_ITEMS', 1000),
          isGlobal: true,
        };
      }
    } else {
      console.log('初始化内存缓存配置 - Redis缓存已禁用');
      return {
        ttl: configService.get('CACHE_TTL', 300) * 1000,
        max: configService.get('CACHE_MAX_ITEMS', 1000),
        isGlobal: true,
      };
    }
  },
  inject: [ConfigService],
};