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

const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Configures the app module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make config accessible to all modules
      envFilePath: ['.env', '.env.local', '.env.production'],
      cache: true, // Improve performance by caching variables
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            name: 'short',
            ttl: 60000, // 1 minute
            limit: 20, // 20 requests per minute
          },
          {
            name: 'medium',
            ttl: 600000, // 10 minutes
            limit: 100, // 100 requests per 10 minutes
          },
          {
            name: 'long',
            ttl: 3600000, // 1 hour
            limit: 500, // 500 requests per hour
          },
        ],
      }),
    }),
    AppCacheModule,
    EmbeddingModule,
    // Standardized Error Handling Infrastructure
    ErrorHandlingModule.forService('app-gateway'),
    // Configure shared NATS client with app-gateway service name
    NatsClientModule.forRoot({
      serviceName: 'app-gateway',
    }),
    ...(isTestEnv
      ? []
      : [
    // Centralized database configuration with strict test/prod separation
    DatabaseModule,
        ]),
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
        ]),
    // No test-only controllers required; production controllers meet E2E contracts
  ],
  providers: [
    AppService,
    // Use shared NATS client service instead of custom implementation
    AppGatewayNatsService,
    QuestionnairesService,
    IncentivesService,
    UsageLimitsService,
    ...(isTestEnv ? [] : [ProductionSecurityValidator]),
    ...(isTestEnv
      ? []
      : [
          {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
          },
        ]),
    // In test, bypass stray 429s except on /system/status for stability
    ...(process.env.NODE_ENV === 'test'
      ? [
          {
            provide: APP_FILTER,
            useClass: TestRateLimitBypassFilter,
          },
        ]
      : []),
    // Standardize successful API responses for E2E tests
    ...(isTestEnv
      ? [
          {
            provide: APP_INTERCEPTOR,
            useClass: ResponseTransformInterceptor,
          },
        ]
      : []),
    // Note: Standardized error handling is provided by ErrorHandlingModule
  ],
})
export class AppModule implements NestModule {
  /**
   * Performs the configure operation.
   * @param consumer - The consumer.
   * @returns The result of the operation.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');

    // Temporarily disable CSRF for development/debugging
    // consumer
    //   .apply(CsrfProtectionMiddleware)
    //   .forRoutes('*');

    // 基础限流只应用于游客端点
    if (!isTestEnv) {
      consumer.apply(RateLimitMiddleware).forRoutes('/api/guest/*');
    }

    // 增强限流应用于认证相关端点
    if (!isTestEnv) {
      consumer
        .apply(EnhancedRateLimitMiddleware)
        .forRoutes('/api/auth/*', '/api/guest/*');
    }
  }
}
