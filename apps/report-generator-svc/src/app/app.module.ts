import { Module } from '@nestjs/common';
import { ReportGeneratorService } from '../report-generator/report-generator.service';
import { LlmService } from '../report-generator/llm.service';
import { GridFsService } from '../report-generator/gridfs.service';
import { ReportRepository } from '../report-generator/report.repository';
import { ReportEventsController } from './report-events.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController, ReportEventsController],
  providers: [AppService, ReportGeneratorService, LlmService, GridFsService, ReportRepository],
  exports: [ReportGeneratorService],
})
export class AppModule {}
