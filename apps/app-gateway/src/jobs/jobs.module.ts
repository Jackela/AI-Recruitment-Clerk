import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobRepository } from '../repositories/job.repository';
import { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import { InMemoryStorageService } from './storage/in-memory-storage.service';
import { Job, JobSchema } from '../schemas/job.schema';
import { AppCacheModule } from '../cache/cache.module';

/**
 * Configures the jobs module.
 */
@Module({
  imports: [
    AppCacheModule,
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
  ],
  controllers: [JobsController],
  providers: [JobsService, JobRepository, AppGatewayNatsService, InMemoryStorageService],
  exports: [JobRepository, AppGatewayNatsService, JobsService],
})
export class JobsModule {}
