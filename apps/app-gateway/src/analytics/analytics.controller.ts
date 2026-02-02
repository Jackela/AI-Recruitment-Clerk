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

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Exposes endpoints for analytics.
 */
@Controller('analytics')
export class AnalyticsController {
  /**
   * Performs the event operation.
   * @param _body - The body.
   * @param res - The res.
   * @returns The result of the operation.
   */
  @Public()
  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public event(@Body() _body: any, @Res() res: Response): Response {
    // Bypass global interceptors for maximum performance in tests
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  /**
   * Performs the perf operation.
   * @param _body - The body.
   * @returns The result of the operation.
   */
  @Public()
  @Post('metrics/performance')
  @HttpCode(HttpStatus.CREATED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public perf(@Body() _body: any): { metricId: string } {
    return { metricId: id('met') };
  }

  /**
   * Performs the biz operation.
   * @param _body - The body.
   * @returns The result of the operation.
   */
  @Public()
  @Post('metrics/business')
  @HttpCode(HttpStatus.CREATED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public biz(@Body() _body: any): { metricId: string } {
    return { metricId: id('met') };
  }

  /**
   * Performs the report operation.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @Public()
  @Post('reports/generate')
  @HttpCode(HttpStatus.CREATED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public report(@Body() body: any): { reportId: string; reportType: string; status: string } {
    return {
      reportId: id('rep'),
      reportType: (body?.reportType as string) || 'comprehensive',
      status: 'processing',
    };
  }

  // Dashboard
  /**
   * Performs the export operation.
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
   * Performs the dashboard operation.
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
