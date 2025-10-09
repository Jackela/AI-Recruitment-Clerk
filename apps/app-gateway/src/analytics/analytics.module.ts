import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';

/**
 * Configures the analytics module.
 */
@Module({
  controllers: [AnalyticsController],
  providers: [],
  exports: [],
})
export class AnalyticsModule {}
