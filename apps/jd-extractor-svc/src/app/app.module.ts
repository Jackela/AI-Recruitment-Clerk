import { Module } from '@nestjs/common';
<<<<<<< Updated upstream
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JdEventsController } from './jd-events.controller';

@Module({
  imports: [],
  controllers: [AppController, JdEventsController],
  providers: [AppService],
})
export class AppModule {}
=======
import { AppService } from './app.service';
import { ExtractionService } from '../extraction/extraction.service';
import { LlmService } from '../llm/llm.service';
import { NatsClient } from '../nats/nats.client';

@Module({
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
>>>>>>> Stashed changes
