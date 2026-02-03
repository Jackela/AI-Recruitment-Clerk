import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import type { MicroserviceOptions} from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

const logger = new Logger('ScoringEngineSvc');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: process.env.NATS_URL || 'nats://localhost:4222',
        // NATS JetStream configuration for reliable message delivery
        jetstream: true,
        name: 'scoring-engine-svc',
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000,
        // Message acknowledgment and retry configuration
        queue: 'scoring-engine-workers',
      },
    },
  );

  await app.listen();
  logger.log('🚀 Scoring Engine Service is listening with NATS JetStream enabled');
}

bootstrap().catch((err) => {
  logger.error('Failed to start Scoring Engine Service', err);
  process.exit(1);
});
