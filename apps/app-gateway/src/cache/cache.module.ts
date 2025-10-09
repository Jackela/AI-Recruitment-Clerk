/**
 * 缓存模块
 * AI Recruitment Clerk - Redis缓存集成 + 预热系统
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheService } from './cache.service';
import { CacheWarmupService } from './cache-warmup.service';
import { RedisConnectionService } from './redis-connection.service';
import { cacheConfig } from './cache.config';
import { Job, JobSchema } from '../schemas/job.schema';
import { JobRepository } from '../repositories/job.repository';

/**
 * Configures the app cache module.
 */
@Module({
  imports: [
    CacheModule.registerAsync(cacheConfig),
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
  ],
  providers: [
    CacheService,
    CacheWarmupService,
    RedisConnectionService,
    JobRepository,
  ],
  exports: [
    CacheService,
    CacheWarmupService,
    RedisConnectionService,
    CacheModule,
  ],
})
export class AppCacheModule {}
