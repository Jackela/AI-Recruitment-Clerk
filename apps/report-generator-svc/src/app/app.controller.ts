import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Exposes endpoints for app.
 */
@Controller()
export class AppController {
  /**
   * Initializes a new instance of the App Controller.
   * @param appService - The app service.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Retrieves data.
   * @returns The result of the operation.
   */
  @Get()
  getData() {
    return this.appService.getData();
  }

  /**
   * Performs the health check operation.
   * @returns The result of the operation.
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'report-generator-svc',
      timestamp: new Date().toISOString(),
    };
  }
}
