import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScoringEventsController } from './scoring-events.controller';

@Module({
  imports: [],
  controllers: [AppController, ScoringEventsController],
  providers: [AppService],
})
export class AppModule {}
