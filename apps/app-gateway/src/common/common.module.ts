import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Filters
import { GlobalExceptionFilter } from './filters/global-exception.filter';

// Interceptors
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { ServiceIntegrationInterceptor } from './interceptors/service-integration.interceptor';

// Pipes
import { CustomValidationPipe } from './pipes/validation.pipe';

// Services
import { HealthCheckService } from './services/health-check.service';
import { CrossServiceValidator } from './validators/cross-service.validator';

@Global()
@Module({
  imports: [
    // Cache configuration
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 1000, // Maximum number of items in cache
      isGlobal: true,
    }),

    // Schedule configuration for health checks and cleanup
    ScheduleModule.forRoot(),

    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // Global response transformation interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },

    // Global validation pipe
    {
      provide: APP_PIPE,
      useFactory: () => new CustomValidationPipe(),
    },

    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Common services
    HealthCheckService,
    CrossServiceValidator,
    // ServiceIntegrationInterceptor, // 暂时禁用，有依赖注入问题
  ],
  exports: [
    HealthCheckService,
    CrossServiceValidator,
    // ServiceIntegrationInterceptor, // 暂时禁用，有依赖注入问题
    CacheModule,
  ],
})
export class CommonModule {}

/**
 * Configuration module for integration services
 */
@Module({
  imports: [CommonModule],
  providers: [
    // Service integration configuration
    {
      provide: 'SERVICE_INTEGRATION_CONFIG',
      useValue: {
        defaultTimeout: 30000,
        defaultRetries: 3,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 5,
        circuitBreakerResetTimeout: 60000,
        enableCaching: true,
        defaultCacheTTL: 300,
        enableFallback: true,
        services: {
          'resume-parser-svc': {
            baseUrl:
              process.env.RESUME_PARSER_URL || 'http://resume-parser-svc:3000',
            timeout: 45000,
            retries: 2,
          },
          'jd-extractor-svc': {
            baseUrl:
              process.env.JD_EXTRACTOR_URL || 'http://jd-extractor-svc:3000',
            timeout: 30000,
            retries: 3,
          },
          'scoring-engine-svc': {
            baseUrl:
              process.env.SCORING_ENGINE_URL ||
              'http://scoring-engine-svc:3000',
            timeout: 20000,
            retries: 2,
          },
          'report-generator-svc': {
            baseUrl:
              process.env.REPORT_GENERATOR_URL ||
              'http://report-generator-svc:3000',
            timeout: 60000,
            retries: 1,
          },
        },
      },
    },

    // Cross-service validation configuration
    {
      provide: 'VALIDATION_CONFIG',
      useValue: {
        enableCrossServiceValidation: true,
        parallelValidation: true,
        validationTimeout: 5000,
        failFast: false,
        cacheValidationResults: true,
        validationCacheTTL: 300,
      },
    },

    // Health check configuration
    {
      provide: 'HEALTH_CHECK_CONFIG',
      useValue: {
        enableScheduledChecks: true,
        checkInterval: 30000, // 30 seconds
        serviceTimeout: 5000,
        retries: 2,
        enableAlerts: true,
        alertThresholds: {
          unhealthy: 3, // Alert after 3 consecutive failures
          degraded: 5, // Alert after 5 consecutive degraded states
        },
      },
    },
  ],
  exports: [
    'SERVICE_INTEGRATION_CONFIG',
    'VALIDATION_CONFIG',
    'HEALTH_CHECK_CONFIG',
  ],
})
export class IntegrationModule {}
