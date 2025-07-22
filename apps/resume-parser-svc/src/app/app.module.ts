import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ResumeEventsController } from './resume-events.controller';
import { ParsingService } from '../parsing/parsing.service';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { NatsClient } from '../nats/nats.client';

@Module({
  imports: [],
  controllers: [AppController, ResumeEventsController],
  providers: [
    AppService,
    ParsingService,
    VisionLlmService,
    GridFsService,
    FieldMapperService,
    NatsClient,
  ],
  exports: [
    ParsingService,
    VisionLlmService,
    GridFsService,
    FieldMapperService,
    NatsClient,
  ],
})
export class AppModule {}
