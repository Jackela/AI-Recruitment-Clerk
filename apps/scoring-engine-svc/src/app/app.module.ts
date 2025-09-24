import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScoringEventsController } from './scoring-events.controller';
import { ScoringEngineService } from '../scoring.service';
import { NatsClientModule } from '@app/shared-nats-client';
import { ScoringEngineNatsService } from '../services/scoring-engine-nats.service';
import { EnhancedSkillMatcherService } from '../services/enhanced-skill-matcher.service';
import { ExperienceAnalyzerService } from '../services/experience-analyzer.service';
import { CulturalFitAnalyzerService } from '../services/cultural-fit-analyzer.service';
import { ScoringConfidenceService } from '../services/scoring-confidence.service';
import { GeminiClient } from '@ai-recruitment-clerk/ai-services-shared';
import { NatsClient as LocalNatsClient } from '../nats/nats.client';
import { StandardizedGlobalExceptionFilter, ExceptionFilterConfigHelper, ErrorInterceptorFactory } from '@ai-recruitment-clerk/infrastructure-shared';
import { SecureConfigValidator } from '@app/shared-dtos';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NatsClientModule.forRoot({
      serviceName: 'scoring-engine-svc',
    }),
  ],
  controllers: [AppController, ScoringEventsController],
  providers: [
    AppService,
    ScoringEngineService,
    ScoringEngineNatsService,
    // Map local NatsClient token to the shared NATS service implementation
    {
      provide: LocalNatsClient,
      useExisting: ScoringEngineNatsService,
    },
    EnhancedSkillMatcherService,
    ExperienceAnalyzerService,
    CulturalFitAnalyzerService,
    ScoringConfidenceService,
    {
      provide: GeminiClient,
      useFactory: () => {
        // 🔒 SECURITY: Validate configuration before client creation
        SecureConfigValidator.validateServiceConfig('GeminiClient', [
          'GEMINI_API_KEY',
        ]);

        return new GeminiClient({
          apiKey: SecureConfigValidator.requireEnv('GEMINI_API_KEY'),
          model: 'gemini-1.5-flash',
          temperature: 0.3,
          maxOutputTokens: 8192,
        });
      },
    },
    // Enhanced Error Handling System
    {
      provide: APP_FILTER,
      useFactory: () =>
        new StandardizedGlobalExceptionFilter({
          serviceName: 'scoring-engine-svc',
          ...ExceptionFilterConfigHelper.forProcessingService(),
        }),
    },
    // Error Handling Interceptors
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        ErrorInterceptorFactory.createCorrelationInterceptor(
          'scoring-engine-svc',
        ),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        ErrorInterceptorFactory.createLoggingInterceptor('scoring-engine-svc'),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        ErrorInterceptorFactory.createPerformanceInterceptor(
          'scoring-engine-svc',
          {
            warnThreshold: 5000, // 5 seconds - scoring can take time with AI analysis
            errorThreshold: 30000, // 30 seconds - hard limit for scoring process
          },
        ),
    },
  ],
})
export class AppModule {}
