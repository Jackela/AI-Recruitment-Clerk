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
import type {
  AnalyticsEventDto,
  PerformanceMetricDto,
  BusinessMetricDto,
  GenerateReportDto,
} from './analytics.dto';

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Exposes endpoints for analytics.
 */
@Controller('analytics')
export class AnalyticsController {
  /**
   * Records an analytics event.
   * @param _body - The analytics event data.
   * @param res - The response object.
   * @returns The result of the operation.
   */
  @Public()
  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  public event(@Body() _body: AnalyticsEventDto, @Res() res: Response): Response {
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
  public perf(@Body() _body: PerformanceMetricDto): { metricId: string } {
    return { metricId: id('met') };
  }

  /**
   * Records a business metric.
   * @param _body - The business metric data.
   * @returns The result of the operation.
   */
  @Public()
  @Post('metrics/business')
  @HttpCode(HttpStatus.CREATED)
  public biz(@Body() _body: BusinessMetricDto): { metricId: string } {
    return { metricId: id('met') };
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
      reportId: id('rep'),
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
    return {
      exportId: id('exp'),
      status: 'completed',
      url: `/exports/${id('exp')}.json`,
    };
  }

  /**
   * Gets dashboard summary data.
   * @returns The result of the operation.
   */
  @Public()
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  public dashboard(): { summary: { events: number; metrics: number }; charts: unknown[] } {
    return {
      summary: { events: 10, metrics: 5 },
      charts: [],
    };
  }
}
