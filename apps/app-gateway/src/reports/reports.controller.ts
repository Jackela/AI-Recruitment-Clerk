import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import type { ReportsService } from './reports.service';
import type { GenerateReportRequest } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Public()
  @Get('reports')
  public async listReports(
    @Query('jobId') jobId?: string,
    @Query('analysisId') analysisId?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.listReports({ jobId, analysisId, status });
  }

  @Public()
  @Get('reports/:reportId')
  public async getReport(@Param('reportId') reportId: string) {
    return this.reportsService.getReportById(reportId);
  }

  @Post('reports/generate')
  public async generateReport(@Body() request: GenerateReportRequest) {
    return this.reportsService.generateReport(request);
  }

  @Public()
  @Get('reports/:reportId/download')
  public async downloadReport(
    @Param('reportId') reportId: string,
    @Query('format') format: 'pdf' | 'excel' = 'pdf',
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsService.downloadReport(reportId, format);
    response.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });
    return new StreamableFile(file.buffer);
  }

  @Public()
  @Get('reports/:reportId/:format')
  @Header('Cache-Control', 'no-store')
  public async downloadReportAlias(
    @Param('reportId') reportId: string,
    @Param('format') format: 'pdf' | 'excel',
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    return this.downloadReport(reportId, format, response);
  }
}
