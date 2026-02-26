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
import { JdExtractorConfigService } from '../config';
import { GeminiClient, SecureConfigValidator } from '@ai-recruitment-clerk/shared-dtos';

/**
 * Configures the app module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NatsClientModule.forRoot({
      serviceName: 'jd-extractor-svc',
    }),
  ],
  controllers: [AppController, JdEventsController, HealthController],
  providers: [
    AppService,
    JdExtractorConfigService,
    ExtractionService,
    LlmService,
    JdExtractorNatsService,
    // Gemini Client for AI-powered JD extraction
    {
      provide: GeminiClient,
      useFactory: (configService: JdExtractorConfigService) => {
        try {
          const apiKey = configService.geminiApiKey;
          SecureConfigValidator.validateServiceConfig('GeminiClient', ['GEMINI_API_KEY']);
          return new GeminiClient({
            apiKey,
            model: 'gemini-1.5-flash',
            temperature: 0.3,
            maxOutputTokens: 8192,
          });
        } catch {
          // Return undefined if Gemini API key is not configured
          // The LlmService will fall back to keyword-based extraction
          return undefined as unknown as GeminiClient;
        }
      },
      inject: [JdExtractorConfigService],
    },
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
            timeout: 30000, // 30 seconds - hard limit for JD extraction
            enableMetrics: true,
          },
        ),
    },
  ],
  exports: [ExtractionService, LlmService, JdExtractorNatsService],
})
export class AppModule {}
