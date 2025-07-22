import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('JD Extractor Service starting...');
    // TODO: Initialize NATS connections and event subscriptions
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('JD Extractor Service shutting down...');
    // TODO: Clean up connections
  }
}
