import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ResumeEventsController } from './resume-events.controller';
import { ParsingService } from '../parsing/parsing.service';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { PdfTextExtractorService } from '../parsing/pdf-text-extractor.service';
import { NatsClientModule } from '@app/shared-nats-client';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import { ResumeRepository } from '../repositories/resume.repository';
import {
  StandardizedGlobalExceptionFilter,
  ExceptionFilterConfigHelper,
  ErrorInterceptorFactory,
} from '@ai-recruitment-clerk/infrastructure-shared';

/**
 * Configures the app module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.production'],
    }),
    NatsClientModule.forRoot({
      serviceName: 'resume-parser-svc',
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URL ||
        process.env.MONGO_URL ||
        (() => {
          throw new Error('MONGODB_URL or MONGO_URL environment variable is required');
        })(),
      {
        connectionName: 'resume-parser',
      },
    ),
    MongooseModule.forFeature(
      [{ name: Resume.name, schema: ResumeSchema }],
      'resume-parser',
    ),
  ],
  controllers: [AppController, ResumeEventsController],
  providers: [
    AppService,
    ParsingService,
    VisionLlmService,
    GridFsService,
    FieldMapperService,
    PdfTextExtractorService,
    ResumeParserNatsService,
    ResumeRepository,
    // Enhanced Error Handling System
    {
      provide: APP_FILTER,
      useFactory: () =>
        new StandardizedGlobalExceptionFilter({
          serviceName: 'resume-parser-svc',
          ...ExceptionFilterConfigHelper.forProcessingService(),
        }),
    },
    // Error Handling Interceptors
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        ErrorInterceptorFactory.createCorrelationInterceptor(
          'resume-parser-svc',
        ),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        ErrorInterceptorFactory.createLoggingInterceptor('resume-parser-svc'),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        ErrorInterceptorFactory.createPerformanceInterceptor(
          'resume-parser-svc',
          {
            timeout: 30000, // 30 seconds - hard limit for resume parsing
          },
        ),
    },
  ],
  exports: [
    ParsingService,
    VisionLlmService,
    GridFsService,
    FieldMapperService,
    PdfTextExtractorService,
    ResumeParserNatsService,
    ResumeRepository,
  ],
})
export class AppModule {}
