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

// Extracted AnalyticsIntegrationService services (SRP refactoring)
import { EventTrackingService } from './services/event-tracking.service';
import { MetricsCollectionService } from './services/metrics-collection.service';
import { SessionAnalyticsService } from './services/session-analytics.service';
import { PrivacyComplianceService } from './services/privacy-compliance.service';
import { ReportGenerationService } from './services/report-generation.service';
import { AnalyticsMetricsService } from './services/analytics-metrics.service';
import { DataExportService } from './services/data-export.service';
import { AnalyticsHealthService } from './services/analytics-health.service';

/**
 * Analytics module - User behavior analysis and data collection.
 * Integrates AnalyticsDomainService with infrastructure layer.
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
    // Core services
    AnalyticsIntegrationService,
    AnalyticsEventRepository,
    AppGatewayNatsService,
    // Extracted AnalyticsIntegrationService services (SRP)
    EventTrackingService,
    MetricsCollectionService,
    SessionAnalyticsService,
    PrivacyComplianceService,
    ReportGenerationService,
    AnalyticsMetricsService,
    DataExportService,
    AnalyticsHealthService,
  ],
  exports: [
    AnalyticsIntegrationService,
    AnalyticsEventRepository,
    // Export extracted services for use by other modules
    EventTrackingService,
    MetricsCollectionService,
    SessionAnalyticsService,
    PrivacyComplianceService,
    ReportGenerationService,
    AnalyticsMetricsService,
    DataExportService,
    AnalyticsHealthService,
  ],
})
export class AnalyticsModule {}
