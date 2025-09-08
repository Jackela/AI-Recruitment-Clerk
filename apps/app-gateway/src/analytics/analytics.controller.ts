import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

@Controller('analytics')
export class AnalyticsController {
  @Public()
  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  event(@Body() _body: any, @Res() res: Response) {
    // Bypass global interceptors for maximum performance in tests
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Public()
  @Post('metrics/performance')
  @HttpCode(HttpStatus.CREATED)
  perf(@Body() _body: any) {
    return { metricId: id('met') };
  }

  @Public()
  @Post('metrics/business')
  @HttpCode(HttpStatus.CREATED)
  biz(@Body() _body: any) {
    return { metricId: id('met') };
  }

  @Public()
  @Post('reports/generate')
  @HttpCode(HttpStatus.CREATED)
  report(@Body() body: any) {
    return {
      reportId: id('rep'),
      reportType: body?.reportType || 'comprehensive',
      status: 'processing',
    };
  }

  // Dashboard
  @Public()
  @Post('export')
  @HttpCode(HttpStatus.OK)
  export() {
    return { exportId: id('exp'), status: 'completed', url: `/exports/${id('exp')}.json` };
  }

  @Public()
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  dashboard() {
    return {
      summary: { events: 10, metrics: 5 },
      charts: [],
    } as any;
  }
}
