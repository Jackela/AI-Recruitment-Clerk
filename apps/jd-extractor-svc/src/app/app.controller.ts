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
    return { message: 'Hello API' };
  }
}
