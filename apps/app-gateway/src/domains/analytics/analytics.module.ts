import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsController } from './metrics.controller';
import { ReportsController } from './reports.controller';
import { AnalyticsIntegrationService } from './analytics-integration.service';
import { AnalyticsEventRepository } from './analytics-event.repository';
import {
  AnalyticsEvent,
  AnalyticsEventSchema,
} from '../../schemas/analytics-event.schema';
import { AppGatewayNatsService } from '../../nats/app-gateway-nats.service';
import { AppCacheModule } from '../../cache/cache.module';

/**
 * Analytics Module - User behavior analytics and data collection
 * Integrates AnalyticsDomainService with infrastructure layer
 */
@Module({
  imports: [
    AppCacheModule,
    MongooseModule.forFeature([
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
    ]),
  ],
  controllers: [MetricsController, ReportsController],
  providers: [
    AnalyticsIntegrationService,
    AnalyticsEventRepository,
    AppGatewayNatsService,
  ],
  exports: [AnalyticsIntegrationService, AnalyticsEventRepository],
})
export class AnalyticsModule {}
