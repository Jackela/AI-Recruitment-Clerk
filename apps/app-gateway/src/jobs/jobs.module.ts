import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobRepository } from '../repositories/job.repository';
import { NatsClient } from '../nats/nats.client';
import { InMemoryStorageService } from './storage/in-memory-storage.service';
import { Job, JobSchema } from '../schemas/job.schema';
import { AppCacheModule } from '../cache/cache.module';

@Module({
  imports: [
    AppCacheModule,
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema }
    ])
  ],
  controllers: [JobsController],
  providers: [JobsService, JobRepository, NatsClient, InMemoryStorageService],
  exports: [JobRepository, NatsClient],
})
export class JobsModule {}
