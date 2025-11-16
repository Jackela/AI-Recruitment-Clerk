import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { getConfig } from '@ai-recruitment-clerk/configuration';

const logger = new Logger('ResumeParserSvc');

async function bootstrap() {
  const appConfig = getConfig({ forceReload: true });

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: appConfig.messaging.nats.url,
        // NATS JetStream configuration for reliable message delivery
        jetstream: true,
        name: 'resume-parser-svc',
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000,
        // Message acknowledgment and retry configuration
        queue: 'resume-parser-workers',
      },
    },
  );

  await app.listen();
  logger.log('🚀 Resume Parser Service is listening with NATS JetStream enabled');
}

bootstrap().catch((err) => {
  logger.error('Failed to start Resume Parser Service', err);
  process.exit(1);
});
