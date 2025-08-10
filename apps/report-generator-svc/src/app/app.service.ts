import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getData(): { message: string } {
    return { message: 'Report Generator Service API' };
  }

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Report Generator Service starting...');
    // TODO: Initialize any required connections
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Report Generator Service shutting down...');
    // TODO: Clean up connections
  }
}