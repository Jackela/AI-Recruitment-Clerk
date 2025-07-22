<<<<<<< Updated upstream
/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.NATS,
    options: {
      servers: process.env.NATS_URL || 'nats://localhost:4222',
    },
  });

  await app.listen();
}

bootstrap();
=======
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  
  logger.log(`Resume Parser Service is running on: http://localhost:${port}`);
}

bootstrap();
>>>>>>> Stashed changes
