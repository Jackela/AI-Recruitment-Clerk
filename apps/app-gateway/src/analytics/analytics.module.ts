import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [],
  exports: [],
})
export class AnalyticsModule {}
