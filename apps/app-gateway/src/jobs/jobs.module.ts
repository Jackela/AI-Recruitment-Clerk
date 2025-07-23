import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { InMemoryStorageService } from './storage/in-memory-storage.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, InMemoryStorageService],
})
export class JobsModule {}
