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
import { VectorStoreService } from './vector-store.service';
import { EmbeddingModule } from '../embedding/embedding.module';

/**
 * Configures the app cache module.
 */
@Module({
  imports: [
    CacheModule.registerAsync(cacheConfig),
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    EmbeddingModule,
  ],
  providers: [
    CacheService,
    CacheWarmupService,
    RedisConnectionService,
    VectorStoreService,
    JobRepository,
  ],
  exports: [
    CacheService,
    CacheWarmupService,
    RedisConnectionService,
    VectorStoreService,
    CacheModule,
  ],
})
export class AppCacheModule {}
