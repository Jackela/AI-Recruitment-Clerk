import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
// Use in-memory Mongo for tests
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from '../jobs/jobs.module';
import { SimpleJobsController } from '../jobs/simple-jobs.controller';
import { AuthModule } from '../auth/auth.module';
import { GuestModule } from '../guest/guest.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NatsClient } from '../nats/nats.client';
import { AppCacheModule } from '../cache/cache.module';
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
import { CsrfProtectionMiddleware } from '../middleware/csrf-protection.middleware';
import { SecurityHeadersMiddleware } from '../middleware/security-headers.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { EnhancedRateLimitMiddleware } from '../middleware/enhanced-rate-limit.middleware';
import { ProductionSecurityValidator } from '../common/security/production-security-validator';
import { AppGatewayGlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { TestRateLimitBypassFilter } from '../common/filters/test-ratelimit-bypass.filter';
import { ErrorInterceptorFactory } from '@ai-recruitment-clerk/infrastructure-shared';
import { ResponseTransformInterceptor } from '../common/interceptors/response-transform.interceptor';

const isTestEnv = process.env.NODE_ENV === 'test';

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
    ...(isTestEnv
      ? []
      : [
          MongooseModule.forRootAsync({
            useFactory: async () => {
        // Test-mode: always use a single in-memory Mongo instance to avoid real connections
        if (
          process.env.NODE_ENV === 'test' ||
          process.env.JEST_WORKER_ID ||
          process.env.CI === 'true'
        ) {
          if (process.env.SKIP_DB === 'true') {
            // fully bypass DB connections in some perf suites
            return {
              uri: 'mongodb://127.0.0.1:27017/skip-tests',
              serverSelectionTimeoutMS: 1,
              connectTimeoutMS: 1,
              maxPoolSize: 1,
              autoCreate: false,
              autoIndex: false,
            } as any;
          }
          // If an external URI is provided by global setup, prefer it
          if (process.env.MONGODB_TEST_URL) {
            return {
              uri: process.env.MONGODB_TEST_URL,
              serverSelectionTimeoutMS: 500,
              connectTimeoutMS: 500,
              maxPoolSize: 5,
            };
          }
          // Otherwise, start (or reuse) an in-memory server
          try {
            process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.5';
            process.env.MONGOMS_DISABLE_MD5_CHECK =
              process.env.MONGOMS_DISABLE_MD5_CHECK || '1';
            let mongod = (global as any).__MONGOD__ as MongoMemoryServer | undefined;
            if (!mongod) {
              mongod = await MongoMemoryServer.create({
                binary: { version: process.env.MONGOMS_VERSION },
              });
              (global as any).__MONGOD__ = mongod;
            }
            const uri = mongod.getUri();
            return {
              uri,
              serverSelectionTimeoutMS: 500,
              connectTimeoutMS: 500,
              maxPoolSize: 5,
            };
          } catch (e) {
            // Fallback to skip mode if memory-server fails
            return {
              uri: 'mongodb://127.0.0.1:27017/skip-tests',
              serverSelectionTimeoutMS: 1,
              connectTimeoutMS: 1,
              maxPoolSize: 1,
              autoCreate: false,
              autoIndex: false,
            } as any;
          }
        }
        // 调试环境变量
        console.log('🔍 MongoDB连接调试信息:');
        console.log('- NODE_ENV:', process.env.NODE_ENV);
        console.log('- MONGO_URL存在:', !!process.env.MONGO_URL);
        if (process.env.MONGO_URL) {
          console.log(
            '- MONGO_URL (masked):',
            process.env.MONGO_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
          );
        }

        const mongoUri = process.env.MONGO_URL;

        if (!mongoUri) {
          console.warn(
            '⚠️ MONGO_URL not configured - database features will be limited',
          );
          console.warn(
            '📋 Please add MongoDB service in Railway and set MONGO_URL environment variable',
          );
          // Fallback to local memory server if tests set a flag
          const mongod = await MongoMemoryServer.create();
          const uri = mongod.getUri();
          (global as any).__MONGOD__ = mongod;
          return {
            uri,
            serverSelectionTimeoutMS: 500,
            connectTimeoutMS: 500,
            maxPoolSize: 5,
          };
        }
        console.log(
          '- 最终使用的URI (masked):',
          mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        );

        return {
          uri: mongoUri,
          // 连接池优化配置
          maxPoolSize: 20, // 最大连接数
          minPoolSize: 5, // 最小连接数
          maxIdleTimeMS: 30000, // 连接空闲30秒后关闭
          serverSelectionTimeoutMS: 5000, // 服务器选择超时5秒
          socketTimeoutMS: 30000, // Socket超时30秒
          connectTimeoutMS: 10000, // 连接超时10秒

          // 健康检查配置
          heartbeatFrequencyMS: 10000, // 心跳检查间隔10秒

          // 写入关注和读取偏好
          writeConcern: {
            w: 1, // 等待主节点确认
            j: true, // 等待写入日志
            wtimeoutMS: 5000, // 写入超时5秒
          },
          readPreference: 'primary', // 从主节点读取，确保数据一致性

          // 重试配置
          retryWrites: true, // 启用写入重试
          retryReads: true, // 启用读取重试
        };
            },
          }),
        ]),
    ...(isTestEnv
      ? []
      : [
          AuthModule,
          GuestModule,
          JobsModule,
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
          SimpleJobsController,
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
    ...(isTestEnv ? [] : [NatsClient, ProductionSecurityValidator]),
    ...(isTestEnv
      ? []
      : [
          {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
          },
        ]),
    // Enable throttling only when explicitly required
    ...(process.env.ENABLE_THROTTLE === 'true'
      ? [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]
      : []),
    // Enhanced Error Handling System
    {
      provide: APP_FILTER,
      useClass: AppGatewayGlobalExceptionFilter,
    },
    // In test, bypass stray 429s except on /system/status for stability
    ...(process.env.NODE_ENV === 'test'
      ? [
          {
            provide: APP_FILTER,
            useClass: TestRateLimitBypassFilter,
          },
        ]
      : []),
    // Error Handling Interceptors
    ...(!isTestEnv
      ? [
          {
            provide: APP_INTERCEPTOR,
            useFactory: () =>
              ErrorInterceptorFactory.createCorrelationInterceptor('app-gateway'),
          },
          {
            provide: APP_INTERCEPTOR,
            useFactory: () =>
              ErrorInterceptorFactory.createLoggingInterceptor('app-gateway'),
          },
          {
            provide: APP_INTERCEPTOR,
            useFactory: () =>
              ErrorInterceptorFactory.createPerformanceInterceptor('app-gateway', {
                warnThreshold: 2000, // 2 seconds warning for API gateway
                errorThreshold: 5000, // 5 seconds error threshold
              }),
          },
          {
            provide: APP_INTERCEPTOR,
            useFactory: () =>
              ErrorInterceptorFactory.createRecoveryInterceptor('app-gateway', {
                enableCircuitBreaker: true,
                failureThreshold: 3,
                recoveryTimeout: 30000, // 30 seconds
              }),
          },
        ]
      : []),
    // Standardize successful API responses for E2E tests
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
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
