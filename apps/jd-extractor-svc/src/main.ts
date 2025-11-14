import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { getConfig } from '@ai-recruitment-clerk/configuration';

const logger = new Logger('JdExtractorSvc');

async function bootstrap() {
  const config = getConfig({ forceReload: true });

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: config.messaging.nats.url,
        jetstream: true,
        name: 'jd-extractor-svc',
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000,
        queue: 'jd-extractor-workers',
      },
    },
  );

  await app.listen();
  logger.log('🚀 JD Extractor Service is listening with NATS JetStream enabled');
}

bootstrap().catch((err) => {
  logger.error('Failed to start JD Extractor Service', err);
  process.exit(1);
});
