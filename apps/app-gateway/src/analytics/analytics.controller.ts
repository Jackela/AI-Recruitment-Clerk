import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { AnalyticsService } from './analytics.service';
import type {
  AnalyticsEventDto,
  PerformanceMetricDto,
  BusinessMetricDto,
  GenerateReportDto,
} from './analytics.dto';

interface ClientLogDto {
  level: string;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

/**
 * Exposes endpoints for analytics.
 */
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService = new AnalyticsService()) {
    // Default service keeps isolated controller specs lightweight.
  }

  /**
   * Records an analytics event.
   * @param body - The analytics event data.
   * @param res - The response object.
   * @returns The result of the operation.
   */
  @Public()
  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  public event(@Body() body: AnalyticsEventDto, @Res() res: Response): Response {
    this.analyticsService.recordEvent(body);
    // Bypass global interceptors for maximum performance in tests
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  /**
   * Records a performance metric.
   * @param _body - The performance metric data.
   * @returns The result of the operation.
   */
  @Public()
  @Post('metrics/performance')
  @HttpCode(HttpStatus.CREATED)
  public perf(@Body() body: PerformanceMetricDto): { metricId: string } {
    return { metricId: this.analyticsService.recordPerformanceMetric(body) };
  }

  /**
   * Records a business metric.
   * @param _body - The business metric data.
   * @returns The result of the operation.
   */
  @Public()
  @Post('metrics/business')
  @HttpCode(HttpStatus.CREATED)
  public biz(@Body() body: BusinessMetricDto): { metricId: string } {
    return { metricId: this.analyticsService.recordBusinessMetric(body) };
  }

  @Public()
  @Post('logs/client')
  @HttpCode(HttpStatus.NO_CONTENT)
  public clientLog(
    @Body() body: ClientLogDto,
    @Res() res: Response,
  ): Response {
    this.analyticsService.recordClientLog(body);
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  /**
   * Generates an analytics report.
   * @param body - The report generation request.
   * @returns The result of the operation.
   */
  @Public()
  @Post('reports/generate')
  @HttpCode(HttpStatus.CREATED)
  public report(@Body() body: GenerateReportDto): {
    reportId: string;
    reportType: string;
    status: string;
  } {
    return {
      reportId: this.analyticsService.createReportId(),
      reportType: body.reportType,
      status: 'processing',
    };
  }

  /**
   * Exports analytics data.
   * @returns The result of the operation.
   */
  @Public()
  @Post('export')
  @HttpCode(HttpStatus.OK)
  public export(): { exportId: string; status: string; url: string } {
    const exportId = this.analyticsService.createExportId();

    return {
      exportId,
      status: 'completed',
      url: `/exports/${exportId}.json`,
    };
  }

  /**
   * Gets dashboard summary data.
   * @returns The result of the operation.
   */
  @Public()
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  public dashboard(): {
    summary: { events: number; metrics: number; clientLogs: number };
    charts: unknown[];
  } {
    return this.analyticsService.getDashboard();
  }

  @Public()
  @Get('analysis-statistics')
  @HttpCode(HttpStatus.OK)
  public analysisStatistics(): {
    todayAnalyses: number;
    totalAnalyses: number;
    averageScore: number;
    successRate: number;
    monthlyAnalyses: number;
  } {
    return this.analyticsService.getAnalysisStatistics();
  }
}
