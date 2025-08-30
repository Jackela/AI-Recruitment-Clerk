import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ReportGeneratorService } from '../report-generator/report-generator.service';
import { LlmService } from '../report-generator/llm.service';
import { GridFsService } from '../report-generator/gridfs.service';
import { ReportRepository } from '../report-generator/report.repository';
import { ReportTemplatesService } from '../report-generator/report-templates.service';
import { PerformanceMonitorService } from '../report-generator/performance-monitor.service';
import { ReportEventsController } from './report-events.controller';
import { ReportsController } from './reports.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Report, ReportSchema } from '../schemas/report.schema';
import { NatsClientModule } from '@app/shared-nats-client';
import { ReportGeneratorNatsService } from '../services/report-generator-nats.service';
import { 
  StandardizedGlobalExceptionFilter,
  ExceptionFilterConfigHelper,
  ErrorInterceptorFactory 
} from '@ai-recruitment-clerk/infrastructure-shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.production']
    }),
    NatsClientModule.forRoot({
      serviceName: 'report-generator-svc',
    }),
    MongooseModule.forRoot(process.env.MONGODB_URL || 'mongodb://admin:password123@localhost:27017/ai-recruitment?authSource=admin', {
      connectionName: 'report-generator'
    }),
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema }
    ], 'report-generator')
  ],
  controllers: [AppController, ReportEventsController, ReportsController],
  providers: [
    AppService, 
    ReportGeneratorService, 
    ReportGeneratorNatsService,
    LlmService, 
    GridFsService, 
    ReportRepository,
    ReportTemplatesService,
    PerformanceMonitorService,
    // Enhanced Error Handling System
    {
      provide: APP_FILTER,
      useFactory: () => new StandardizedGlobalExceptionFilter({
        serviceName: 'report-generator-svc',
        ...ExceptionFilterConfigHelper.forProcessingService()
      }),
    },
    // Error Handling Interceptors
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => ErrorInterceptorFactory.createCorrelationInterceptor('report-generator-svc'),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => ErrorInterceptorFactory.createLoggingInterceptor('report-generator-svc'),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => ErrorInterceptorFactory.createPerformanceInterceptor(
        'report-generator-svc',
        {
          warnThreshold: 10000, // 10 seconds - report generation can take time
          errorThreshold: 60000 // 60 seconds - hard limit for report generation
        }
      ),
    }
  ],
  exports: [ReportGeneratorService, ReportTemplatesService, PerformanceMonitorService],
})
export class AppModule {}
