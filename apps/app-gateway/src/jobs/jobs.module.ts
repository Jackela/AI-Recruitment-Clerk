import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobRepository } from '../repositories/job.repository';
import { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import { Job, JobSchema } from '../schemas/job.schema';
import { AppCacheModule } from '../cache/cache.module';
import { WebSocketModule } from '../websocket/websocket.module';

/**
 * Configures the jobs module.
 */
@Module({
  imports: [
    AppCacheModule,
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    WebSocketModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JobRepository, AppGatewayNatsService],
  exports: [JobRepository, AppGatewayNatsService, JobsService],
})
export class JobsModule {}
