import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JdEventsController } from './jd-events.controller';

@Module({
  imports: [],
  controllers: [AppController, JdEventsController],
  providers: [AppService],
})
export class AppModule {}
