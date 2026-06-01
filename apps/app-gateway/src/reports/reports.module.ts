import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  GeneratedReport,
  GeneratedReportSchema,
  ReportTemplate,
  ReportTemplateSchema,
} from './schemas/report.schema';
import { ReportRepository } from './repositories/report.repository';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { GuestModule } from '../guest/guest.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReportTemplate.name, schema: ReportTemplateSchema },
      { name: GeneratedReport.name, schema: GeneratedReportSchema },
    ]),
    forwardRef(() => GuestModule),
  ],
  controllers: [ReportsController],
  providers: [ReportRepository, ReportsService],
  exports: [ReportRepository, ReportsService],
})
export class ReportsModule {}
