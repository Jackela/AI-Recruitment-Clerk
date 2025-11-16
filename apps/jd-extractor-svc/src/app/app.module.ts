import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { JdEventsController } from './jd-events.controller';
import { HealthController } from './health.controller';
import { ExtractionService } from '../extraction/extraction.service';
import { LlmService } from '../extraction/llm.service';
import { NatsClientModule } from '@app/shared-nats-client';
import { JdExtractorNatsService } from '../services/jd-extractor-nats.service';
import {
  StandardizedGlobalExceptionFilter,
  ExceptionFilterConfigHelper,
  ErrorInterceptorFactory,
} from '@ai-recruitment-clerk/infrastructure-shared';
import { getConfig } from '@ai-recruitment-clerk/configuration';

const runtimeConfig = getConfig({ forceReload: true });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '.env.local', '.env.production'],
      load: [() => ({ sharedConfig: runtimeConfig })],
    }),
    NatsClientModule.forRoot({
      serviceName: 'jd-extractor-svc',
      connectionOptions: {
        url: runtimeConfig.messaging.nats.url,
        timeout: 5000,
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000,
      },
    }),
  ],
  controllers: [AppController, JdEventsController, HealthController],
  providers: [
    AppService,
    ExtractionService,
    LlmService,
    JdExtractorNatsService,
    {
      provide: APP_FILTER,
      useFactory: () =>
        new StandardizedGlobalExceptionFilter({
          serviceName: 'jd-extractor-svc',
          ...ExceptionFilterConfigHelper.forProcessingService(),
        }),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        ErrorInterceptorFactory.createCorrelationInterceptor(
          'jd-extractor-svc',
        ),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        ErrorInterceptorFactory.createLoggingInterceptor('jd-extractor-svc'),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        ErrorInterceptorFactory.createPerformanceInterceptor(
          'jd-extractor-svc',
          {
            timeout: 30000,
            enableMetrics: true,
          },
        ),
    },
  ],
  exports: [ExtractionService, LlmService, JdExtractorNatsService],
})
export class AppModule {}
