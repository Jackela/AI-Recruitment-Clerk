import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
// Use in-memory Mongo for tests
import { DatabaseModule } from '../database/database.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from '../jobs/jobs.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { AuthModule } from '../auth/auth.module';
import { GuestModule } from '../guest/guest.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NatsClientModule } from '@ai-recruitment-clerk/shared-nats-client';
import { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import { AppCacheModule } from '../cache/cache.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { DomainsModule } from '../domains/domains.module';
import { CommonModule, IntegrationModule } from '../common/common.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { SystemController } from '../system/system.controller';
import { PrivacyComplianceModule } from '../privacy/privacy-compliance.module';
import { SecurityModule } from '../security/security.module';
import { ScoringProxyController } from '../scoring/scoring-proxy.controller';
// Test controllers removed in favor of real controllers with standardized responses
import { ResumesController } from '../resumes/resumes.controller';
import { QuestionnairesController } from '../questionnaires/questionnaires.controller';
import { AnalyticsController } from '../analytics/analytics.controller';
import { IncentivesController } from '../incentives/incentives.controller';
import { UsageLimitsController } from '../usage/usage-limits.controller';
import { IncentivesService } from '../incentives/incentives.service';
import { UsageLimitsService } from '../usage/usage-limits.service';
import { QuestionnairesService } from '../questionnaires/questionnaires.service';
import { SecurityHeadersMiddleware } from '../middleware/security-headers.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { EnhancedRateLimitMiddleware } from '../middleware/enhanced-rate-limit.middleware';
import { ProductionSecurityValidator } from '../common/security/production-security-validator';
import { TestRateLimitBypassFilter } from '../common/filters/test-ratelimit-bypass.filter';
import { ResponseTransformInterceptor } from '../common/interceptors/response-transform.interceptor';
// Standardized Error Handling Infrastructure
import { ErrorHandlingModule } from '@ai-recruitment-clerk/shared-dtos';
import { ReleaseController } from '../ops/release.controller';
import { GrayController } from '../ops/gray.controller';
import { RollbackService } from '../ops/rollback.service';
import { FlagsController } from '../ops/flags.controller';
import { DualRunMiddleware } from '../middleware/dual-run.middleware';
import { AuditMiddleware } from '../middleware/audit.middleware';
import { AuditController } from '../ops/audit.controller';
import { MetricsService } from '../ops/metrics.service';
import { ObservabilityController } from '../ops/observability.controller';
import { ImpactController } from '../ops/impact.controller';
import { getConfig } from '@ai-recruitment-clerk/configuration';

const runtimeConfig = getConfig({
  forceReload: true,
});
const isServeCheck = process.env.GATEWAY_SERVE_CHECK === 'true';
const isTestEnv = runtimeConfig.env.isTest && !isServeCheck;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.production'],
      cache: true,
      load: [() => ({ sharedConfig: runtimeConfig })],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          { name: 'short', ttl: 60000, limit: 20 },
          { name: 'medium', ttl: 600000, limit: 100 },
          { name: 'long', ttl: 3600000, limit: 500 },
        ],
      }),
    }),
    AppCacheModule,
    EmbeddingModule,
    ErrorHandlingModule.forService('app-gateway'),
    NatsClientModule.forRoot({ serviceName: 'app-gateway' }),
    ...(isTestEnv ? [] : [DatabaseModule]),
    ...(isTestEnv
      ? []
      : [
          AuthModule,
          GuestModule,
          JobsModule,
          AnalysisModule,
          DomainsModule,
          CommonModule,
          IntegrationModule,
          WebSocketModule,
          PrivacyComplianceModule,
          SecurityModule,
        ]),
  ],
  controllers: [
    ...(isTestEnv
      ? [AppController, ScoringProxyController]
      : [
          AppController,
          SystemController,
          ScoringProxyController,
          ResumesController,
          QuestionnairesController,
          AnalyticsController,
          IncentivesController,
          UsageLimitsController,
          ReleaseController,
          GrayController,
          FlagsController,
          ObservabilityController,
          ImpactController,
          AuditController,
        ]),
  ],
  providers: [
    AppService,
    AppGatewayNatsService,
    QuestionnairesService,
    IncentivesService,
    UsageLimitsService,
    RollbackService,
    MetricsService,
    ...(isTestEnv ? [] : [ProductionSecurityValidator]),
    ...(isTestEnv
      ? []
      : [
          { provide: APP_GUARD, useClass: JwtAuthGuard },
        ]),
    ...(isTestEnv
      ? [
          { provide: APP_FILTER, useClass: TestRateLimitBypassFilter },
          { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
        ]
      : []),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
    consumer.apply(AuditMiddleware).forRoutes('/ops/*');
    if (!isTestEnv) {
      consumer.apply(RateLimitMiddleware).forRoutes('/api/guest/*');
      consumer.apply(EnhancedRateLimitMiddleware).forRoutes('/api/auth/*', '/api/guest/*');
      consumer.apply(DualRunMiddleware).forRoutes('/scoring/*');
    }
  }
}
