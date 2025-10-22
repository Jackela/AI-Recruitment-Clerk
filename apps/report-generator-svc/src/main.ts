import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

const logger = new Logger('ReportGeneratorSvc');

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: process.env.NATS_URL || 'nats://localhost:4222',
        // NATS JetStream configuration for reliable message delivery
        jetstream: true,
        name: 'report-generator-svc',
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000,
        // Message acknowledgment and retry configuration
        queue: 'report-generator-workers',
      },
    },
  );

  await app.listen();
  logger.log('🚀 Report Generator Service is listening with NATS JetStream enabled');
}

bootstrap().catch((err) => {
  logger.error('Failed to start Report Generator Service', err);
  process.exit(1);
});
