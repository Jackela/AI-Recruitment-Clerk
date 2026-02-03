import { Controller, Get } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
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
  public getData(): { message: string } {
    return this.appService.getData();
  }
}
