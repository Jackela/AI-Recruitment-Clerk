import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Resume Parser Service starting...');
    // TODO: Initialize GridFS connections, NATS subscriptions, etc.
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Resume Parser Service shutting down...');
    // TODO: Clean up connections
  }
}
