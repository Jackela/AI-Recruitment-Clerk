import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsIntegrationService } from './analytics-integration.service';
import { AnalyticsEventRepository } from './analytics-event.repository';
import {
  AnalyticsEvent,
  AnalyticsEventSchema,
} from '../../schemas/analytics-event.schema';
import { AppGatewayNatsService } from '../../nats/app-gateway-nats.service';
import { AppCacheModule } from '../../cache/cache.module';

/**
 * Analytics模块 - 用户行为分析和数据收集
 * 集成AnalyticsDomainService与基础设施层
 */
@Module({
  imports: [
    AppCacheModule,
    MongooseModule.forFeature([
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsIntegrationService,
    AnalyticsEventRepository,
    AppGatewayNatsService,
  ],
  exports: [AnalyticsIntegrationService, AnalyticsEventRepository],
})
export class AnalyticsModule {}
