import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'report-generator-svc',
      timestamp: new Date().toISOString(),
    };
  }
}
