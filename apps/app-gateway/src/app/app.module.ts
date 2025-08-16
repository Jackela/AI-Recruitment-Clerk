import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from '../jobs/jobs.module';
import { AuthModule } from '../auth/auth.module';
import { GuestModule } from '../guest/guest.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NatsClient } from '../nats/nats.client';
import { AppCacheModule } from '../cache/cache.module';
import { DomainsModule } from '../domains/domains.module';
import { CommonModule, IntegrationModule } from '../common/common.module';
import { SystemController } from '../system/system.controller';
import { PrivacyComplianceModule } from '../privacy/privacy-compliance.module';
import { SecurityModule } from '../security/security.module';
import { CsrfProtectionMiddleware } from '../middleware/csrf-protection.middleware';
import { SecurityHeadersMiddleware } from '../middleware/security-headers.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { EnhancedRateLimitMiddleware } from '../middleware/enhanced-rate-limit.middleware';
import { ProductionSecurityValidator } from '../common/security/production-security-validator';

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
            ttl: 60000,  // 1 minute
            limit: 20,   // 20 requests per minute
          },
          {
            name: 'medium', 
            ttl: 600000, // 10 minutes
            limit: 100,  // 100 requests per 10 minutes
          },
          {
            name: 'long',
            ttl: 3600000, // 1 hour
            limit: 500,   // 500 requests per hour
          }
        ]
      })
    }),
    AppCacheModule,
    ...(process.env.SKIP_MONGO_CONNECTION !== 'true' ? [
      MongooseModule.forRootAsync({
        useFactory: () => {
          // 调试环境变量
          console.log('🔍 MongoDB连接调试信息:');
          console.log('- NODE_ENV:', process.env.NODE_ENV);
          console.log('- MONGO_URL存在:', !!process.env.MONGO_URL);
          if (process.env.MONGO_URL) {
            console.log('- MONGO_URL (masked):', process.env.MONGO_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
          }
          
          const mongoUri = process.env.MONGO_URL;
          
          if (!mongoUri) {
            throw new Error('MONGO_URL environment variable is required for database connection');
          }
        console.log('- 最终使用的URI (masked):', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
        
        return {
          uri: mongoUri,
          // 连接池优化配置
          maxPoolSize: 20,        // 最大连接数
          minPoolSize: 5,         // 最小连接数
          maxIdleTimeMS: 30000,   // 连接空闲30秒后关闭
          serverSelectionTimeoutMS: 5000, // 服务器选择超时5秒
          socketTimeoutMS: 30000, // Socket超时30秒
          connectTimeoutMS: 10000, // 连接超时10秒
          
          // 健康检查配置  
          heartbeatFrequencyMS: 10000, // 心跳检查间隔10秒
          
          // 写入关注和读取偏好
          writeConcern: {
            w: 1,                 // 等待主节点确认
            j: true,              // 等待写入日志
            wtimeoutMS: 5000      // 写入超时5秒
          },
          readPreference: 'primary', // 从主节点读取，确保数据一致性
          
          // 重试配置
          retryWrites: true,      // 启用写入重试
          retryReads: true        // 启用读取重试
        };
      },
    })
    ] : []),
    AuthModule,
    GuestModule,
    JobsModule,
    DomainsModule,
    CommonModule,
    IntegrationModule,
    PrivacyComplianceModule,
    SecurityModule
  ],
  controllers: [AppController, SystemController],
  providers: [
    AppService,
    NatsClient,
    ProductionSecurityValidator,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityHeadersMiddleware)
      .forRoutes('*');
    
    // Temporarily disable CSRF for development/debugging
    // consumer
    //   .apply(CsrfProtectionMiddleware)
    //   .forRoutes('*');
      
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');
      
    consumer
      .apply(EnhancedRateLimitMiddleware)
      .forRoutes('*');
  }
}
