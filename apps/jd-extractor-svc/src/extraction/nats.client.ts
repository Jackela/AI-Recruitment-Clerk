import { Injectable } from '@nestjs/common';

@Injectable()
export class NatsClient {
  // Real implementation would publish to NATS server
  async publish(subject: string, payload: unknown): Promise<void> {
    /* istanbul ignore next */
    return;
  }
}
