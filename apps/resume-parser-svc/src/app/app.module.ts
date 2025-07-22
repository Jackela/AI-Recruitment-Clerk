import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResumeEventsController } from './resume-events.controller';

@Module({
  imports: [],
  controllers: [AppController, ResumeEventsController],
  providers: [AppService],
})
export class AppModule {}
