import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { JdEventsController } from './jd-events.controller';
import { ExtractionService } from '../extraction/extraction.service';
import { LlmService } from '../llm/llm.service';
import { NatsClient } from '../nats/nats.client';

@Module({
  imports: [],
  controllers: [AppController, JdEventsController],
  providers: [
    AppService,
    ExtractionService,
    LlmService,
    NatsClient,
  ],
  exports: [
    ExtractionService,
    LlmService,
    NatsClient,
  ],
})
export class AppModule {}
