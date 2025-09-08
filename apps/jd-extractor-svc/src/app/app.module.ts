import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { JdEventsController } from './jd-events.controller';
import { ExtractionService } from '../extraction/extraction.service';
import { LlmService } from '../extraction/llm.service';
import { NatsClientModule } from '@app/shared-nats-client';
import { JdExtractorNatsService } from '../services/jd-extractor-nats.service';
import {
  StandardizedGlobalExceptionFilter,
  ExceptionFilterConfigHelper,
  ErrorInterceptorFactory,
} from '@ai-recruitment-clerk/infrastructure-shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NatsClientModule.forRoot({
      serviceName: 'jd-extractor-svc',
    }),
  ],
  controllers: [AppController, JdEventsController],
  providers: [
    AppService,
    ExtractionService,
    LlmService,
    JdExtractorNatsService,
    // Enhanced Error Handling System
    {
      provide: APP_FILTER,
      useFactory: () =>
        new StandardizedGlobalExceptionFilter({
          serviceName: 'jd-extractor-svc',
          ...ExceptionFilterConfigHelper.forProcessingService(),
        }),
    },
    // Error Handling Interceptors
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
            warnThreshold: 5000, // 5 seconds - JD extraction can take time
            errorThreshold: 30000, // 30 seconds - hard limit for JD extraction
          },
        ),
    },
  ],
  exports: [ExtractionService, LlmService, JdExtractorNatsService],
})
export class AppModule {}
