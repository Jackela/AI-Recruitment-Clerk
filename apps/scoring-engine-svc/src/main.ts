import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // Create pure NATS microservice (secure by design)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: process.env.NATS_URL || 'nats://localhost:4222',
      },
    },
  );

  await app.listen();
}

bootstrap();
