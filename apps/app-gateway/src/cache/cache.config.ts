/**
 * Redis分布式缓存配置 - 增强容错机制
 * AI Recruitment Clerk - 性能优化缓存层
 */

import type { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

const logger = new Logger('CacheConfig');

/**
 * 检测Redis连接可用性
 */
async function testRedisConnection(redisUrl: string): Promise<boolean> {
  try {
    const { createClient } = await import('redis');
    const client = createClient({ url: redisUrl });

    // 设置错误处理器防止未处理的错误
    client.on('error', (err) => {
      logger.warn('Redis连接测试失败:', err.message);
    });

    await client.connect();
    await client.ping();
    await client.disconnect();

    logger.log('✅ Redis连接测试成功');
    return true;
  } catch (error) {
    logger.warn(`❌ Redis连接测试失败: ${error.message}`);
    return false;
  }
}

export const cacheConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => {
    // Check for Redis configuration - Railway provides REDISHOST/REDISPORT (no underscore)
    const redisUrl = configService.get('REDIS_URL');
    const redisPrivateUrl = configService.get('REDIS_PRIVATE_URL');
    const redisHost =
      configService.get('REDISHOST') || configService.get('REDIS_HOST');
    const redisPort =
      configService.get('REDISPORT') || configService.get('REDIS_PORT');
    const redisPassword = configService.get('REDIS_PASSWORD');
    const useRedis = configService.get('USE_REDIS_CACHE', 'true') === 'true';
    const disableRedis = configService.get('DISABLE_REDIS', 'false') === 'true';
    const isProduction = configService.get('NODE_ENV') === 'production';

    // 调试Redis配置信息
    logger.log('🔍 Redis配置调试信息:');
    logger.log(`- NODE_ENV: ${isProduction ? 'production' : 'development'}`);
    logger.log(`- REDIS_URL存在: ${!!redisUrl}`);
    logger.log(
      `- REDIS_URL内容: ${redisUrl ? redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'not set'}`,
    );
    logger.log(`- REDIS_PRIVATE_URL存在: ${!!redisPrivateUrl}`);
    logger.log(`- REDISHOST: ${redisHost || 'not set'}`);
    logger.log(`- REDISPORT: ${redisPort || 'not set'}`);
    logger.log(`- REDIS_PASSWORD存在: ${!!redisPassword}`);
    logger.log(`- USE_REDIS_CACHE: ${useRedis}`);
    logger.log(`- DISABLE_REDIS: ${disableRedis}`);

    // 基础内存缓存配置 - 安全的类型转换
    const cacheTtl = Math.max(
      0,
      parseInt(configService.get('CACHE_TTL', '300')) || 300,
    );
    const cacheMaxItems = Math.max(
      1,
      parseInt(configService.get('CACHE_MAX_ITEMS', '1000')) || 1000,
    );

    logger.log(`📋 缓存配置: TTL=${cacheTtl}s, Max=${cacheMaxItems}项`);

    const memoryConfig = {
      ttl: cacheTtl * 1000, // 转换为毫秒
      max: cacheMaxItems, // 确保是正整数
      isGlobal: true,
    };

    // 如果Redis被明确禁用
    if (disableRedis || !useRedis) {
      logger.log('🧠 使用内存缓存 - Redis已被禁用');
      return memoryConfig;
    }

    // Build Redis URL from available configuration with fail-fast validation
    // Priority: REDIS_PRIVATE_URL > REDIS_URL > constructed from REDISHOST/REDISPORT
    let finalRedisUrl = redisPrivateUrl || redisUrl;

    if (!finalRedisUrl && redisHost) {
      if (!redisPort) {
        throw new Error(
          'Redis configuration incomplete: REDISHOST found but REDISPORT is missing. Please check environment variables.',
        );
      }
      // 如果有密码，构建带认证的URL
      if (redisPassword) {
        finalRedisUrl = `redis://:${redisPassword}@${redisHost}:${redisPort}`;
      } else {
        finalRedisUrl = `redis://${redisHost}:${redisPort}`;
      }
      logger.log(`🔗 Constructed Redis URL from REDISHOST/REDISPORT`);
    }

    if (finalRedisUrl) {
      logger.log(
        `🎯 最终使用的Redis URL来源: ${redisPrivateUrl ? 'REDIS_PRIVATE_URL' : redisUrl ? 'REDIS_URL' : 'REDISHOST/REDISPORT'}`,
      );
    }

    // 如果没有Redis配置
    if (
      !finalRedisUrl ||
      (finalRedisUrl === 'redis://localhost:6379' && isProduction)
    ) {
      logger.warn('⚠️ 生产环境未配置Redis，使用内存缓存');
      return memoryConfig;
    }

    // 检查Redis URL格式
    if (
      !finalRedisUrl.startsWith('redis://') &&
      !finalRedisUrl.startsWith('rediss://')
    ) {
      logger.error('❌ Redis URL格式无效，使用内存缓存');
      return memoryConfig;
    }

    // 在生产环境中进行连接测试
    if (isProduction) {
      const isRedisAvailable = await testRedisConnection(finalRedisUrl);
      if (!isRedisAvailable) {
        logger.warn('⚠️ Redis连接不可用，降级到内存缓存');
        return memoryConfig;
      }
    }

    try {
      logger.log(
        `🔗 正在初始化Redis缓存 - 目标: ${finalRedisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`,
      );

      // 动态导入Redis store
      const { redisStore } = await import('cache-manager-redis-yet');

      // 如果是Railway内网地址，添加family=0参数
      let connectionUrl = finalRedisUrl;
      if (finalRedisUrl.includes('railway.internal')) {
        logger.log('🔧 检测到Railway内网地址，添加family=0参数');
        connectionUrl =
          finalRedisUrl +
          (finalRedisUrl.includes('?') ? '&' : '?') +
          'family=0';
      }

      const redisConfig = {
        store: redisStore,
        url: connectionUrl,
        ttl: cacheTtl * 1000,
        max: cacheMaxItems,
        isGlobal: true,
        keyPrefix: 'ai-recruitment:',
        serialize: JSON.stringify,
        deserialize: JSON.parse,
        // Redis特定配置
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        // 连接超时配置
        connectTimeout: 10000,
        commandTimeout: 5000,
        // 错误处理
        retryPolicy: {
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
        },
      };

      logger.log('✅ Redis缓存配置初始化成功');
      return redisConfig;
    } catch (error) {
      logger.error(`❌ Redis缓存初始化失败，降级到内存缓存: ${error.message}`);
      return memoryConfig;
    }
  },
  inject: [ConfigService],
};
