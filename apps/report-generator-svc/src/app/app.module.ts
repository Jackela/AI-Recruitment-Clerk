import { Module } from '@nestjs/common';
import { ReportGeneratorService } from '../report-generator/report-generator.service';
import { LlmService } from '../report-generator/llm.service';
import { GridFsService } from '../report-generator/gridfs.service';
import { ReportRepository } from '../report-generator/report.repository';

@Module({
  providers: [ReportGeneratorService, LlmService, GridFsService, ReportRepository],
  exports: [ReportGeneratorService],
})
export class AppModule {}
