import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NatsClient {
  private readonly logger = new Logger(NatsClient.name);

  async emit(subject: string, data: any): Promise<void> {
    // TODO: Implement NATS event emission
    throw new Error('NatsClient.emit not implemented');
  }
}
