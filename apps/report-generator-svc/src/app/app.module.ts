import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.production']
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
    LlmService, 
    GridFsService, 
    ReportRepository,
    ReportTemplatesService,
    PerformanceMonitorService
  ],
  exports: [ReportGeneratorService, ReportTemplatesService, PerformanceMonitorService],
})
export class AppModule {}
