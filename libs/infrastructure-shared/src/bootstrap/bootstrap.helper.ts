/**
 * Shared Bootstrap Helper for NestJS Applications
 *
 * Provides consistent bootstrapping and error handling across all services.
 * Follows fail-fast architecture - errors are surfaced immediately.
 */

import { Logger, type LogLevel, type INestMicroservice, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';

/**
 * Configuration options for NestJS microservice bootstrap
 */
export interface MicroserviceBootstrapOptions {
  /**
   * Service name used for logging and NATS connection
   */
  serviceName: string;

  /**
   * NATS server URL (defaults to nats://localhost:4222)
   */
  natsUrl?: string;

  /**
   * NATS queue name for worker group
   */
  queueName: string;

  /**
   * Maximum reconnection attempts (default: 10)
   */
  maxReconnectAttempts?: number;

  /**
   * Time to wait before reconnecting in ms (default: 2000)
   */
  reconnectTimeWait?: number;

  /**
   * Enable NATS JetStream for reliable message delivery (default: true)
   */
  enableJetStream?: boolean;

  /**
   * Log levels for the service (default: ['error', 'warn', 'log'])
   */
  logLevels?: LogLevel[];

  /**
   * Custom logger instance (optional)
   */
  logger?: Logger;
}

/**
 * Configuration options for NestJS HTTP gateway bootstrap
 */
export interface GatewayBootstrapOptions {
  /**
   * Service name used for logging
   */
  serviceName: string;

  /**
   * Port to listen on (defaults to process.env.PORT || 3000)
   */
  port?: number;

  /**
   * Global prefix for API routes (default: 'api')
   */
  globalPrefix?: string;

  /**
   * Log levels for the service (default: ['error', 'warn', 'log', 'debug', 'verbose'] in dev, ['error', 'warn', 'log'] in prod)
   */
  logLevels?: LogLevel[];

  /**
   * CORS origin configuration
   */
  cors?: {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
    optionsSuccessStatus?: number;
    maxAge?: number;
  };

  /**
   * Enable CORS compression (default: false)
   */
  enableCompression?: boolean;

  /**
   * Compression level (default: 6)
   */
  compressionLevel?: number;

  /**
   * Request timeout in ms (default: 30000)
   */
  requestTimeout?: number;
}

/**
 * Bootstraps a NestJS microservice with NATS transport
 *
 * @param module - The NestJS module root
 * @param options - Bootstrap configuration options
 * @returns Promise that resolves when the microservice is listening
 *
 * @example
 * ```ts
 * import { bootstrapNestJsMicroservice } from '@ai-recruitment-clerk/infrastructure-shared';
 * import { AppModule } from './app/app.module';
 *
 * await bootstrapNestJsMicroservice(AppModule, {
 *   serviceName: 'my-service',
 *   queueName: 'my-service-workers',
 * });
 * ```
 */
export async function bootstrapNestJsMicroservice<T = unknown>(
  module: new (...args: unknown[]) => T,
  options: MicroserviceBootstrapOptions,
): Promise<INestMicroservice> {
  const {
    serviceName,
    natsUrl = process.env.NATS_URL || 'nats://localhost:4222',
    queueName,
    maxReconnectAttempts = 10,
    reconnectTimeWait = 2000,
    enableJetStream = true,
    logLevels = ['error', 'warn', 'log'],
    logger: customLogger,
  } = options;

  const logger = customLogger || new Logger(serviceName);

  logger.log(`🚀 [bootstrap] Starting ${serviceName}...`);
  logger.log(`- NATS URL: ${natsUrl}`);
  logger.log(`- JetStream: ${enableJetStream ? 'enabled' : 'disabled'}`);
  logger.log(`- Queue: ${queueName}`);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(module, {
    transport: Transport.NATS,
    options: {
      servers: [natsUrl],
      jetstream: enableJetStream,
      name: serviceName,
      maxReconnectAttempts,
      reconnectTimeWait,
      queue: queueName,
    },
  });

  await app.listen();
  logger.log(`✅ ${serviceName} is listening with NATS JetStream enabled`);

  return app;
}

/**
 * Bootstraps a NestJS HTTP gateway application
 *
 * @param module - The NestJS module root
 * @param options - Bootstrap configuration options
 * @returns Promise that resolves to the NestJS application
 *
 * @example
 * ```ts
 * import { bootstrapNestJsGateway } from '@ai-recruitment-clerk/infrastructure-shared';
 * import { AppModule } from './app/app.module';
 *
 * const app = await bootstrapNestJsGateway(AppModule, {
 *   serviceName: 'API Gateway',
 *   port: 3000,
 * });
 * ```
 */
export async function bootstrapNestJsGateway<T = unknown>(
  module: new (...args: unknown[]) => T,
  options: GatewayBootstrapOptions,
): Promise<INestApplication> {
  // Dynamic import for NestFactory from @nestjs/core for HTTP apps
  const { NestFactory: CoreNestFactory } = await import('@nestjs/core');

  const {
    serviceName,
    port: explicitPort,
    globalPrefix = 'api',
    logLevels,
    cors: corsOptions,
    enableCompression = false,
    compressionLevel = 6,
    requestTimeout = 30000,
  } = options;

  const port = explicitPort || Number.parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  const logger = new Logger(serviceName);

  logger.log(`🚀 [bootstrap] Starting ${serviceName}...`);
  logger.log(`- Node environment: ${process.env.NODE_ENV || 'not set'}`);
  logger.log(`- Port: ${port}`);
  logger.log(`- API Prefix: ${globalPrefix}`);

  const app = await CoreNestFactory.create(module, {
    logger:
      logLevels ||
      (isProduction
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose']),
    bodyParser: true,
    cors: false, // We handle CORS manually below for better control
  });

  app.setGlobalPrefix(globalPrefix);

  // CORS configuration
  const defaultOrigins = isProduction
    ? process.env.ALLOWED_ORIGINS?.split(',') || [
        'https://ai-recruitment-clerk-production.up.railway.app',
      ]
    : ['http://localhost:4200', 'http://localhost:4202'];

  app.enableCors({
    origin: corsOptions?.origin || defaultOrigins,
    methods: corsOptions?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders:
      corsOptions?.allowedHeaders ||
      [
        'Content-Type',
        'Authorization',
        'X-Device-ID',
        'Accept',
        'Origin',
        'X-Requested-With',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
      ],
    credentials: corsOptions?.credentials ?? true,
    optionsSuccessStatus: corsOptions?.optionsSuccessStatus || 200,
    maxAge: corsOptions?.maxAge || 3600,
  });

  // Express tuning
  const server = app.getHttpAdapter().getInstance() as {
    set?: (key: string, value: unknown) => void;
    disable?: (key: string) => void;
    use?: (...args: unknown[]) => void;
  };

  // Safety check for server methods
  if (typeof server.set === 'function') {
    server.set('trust proxy', 1);
  }
  if (typeof server.disable === 'function') {
    server.disable('x-powered-by');
  }

  // Note: Request timeout middleware is application-specific
  // and should be added by the application if needed

  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);

  return app;
}

/**
 * Wraps bootstrap call with error handling and process exit
 *
 * @param bootstrapFn - The bootstrap function to call
 * @param serviceName - Service name for error logging
 *
 * @example
 * ```ts
 * import { bootstrapWithErrorHandling } from '@ai-recruitment-clerk/infrastructure-shared';
 * import { bootstrapNestJsMicroservice } from '@ai-recruitment-clerk/infrastructure-shared';
 * import { AppModule } from './app/app.module';
 *
 * bootstrapWithErrorHandling(
 *   () => bootstrapNestJsMicroservice(AppModule, { serviceName: 'my-service', queueName: 'workers' }),
 *   'MyService',
 * );
 * ```
 */
export async function bootstrapWithErrorHandling(
  bootstrapFn: () => Promise<unknown>,
  serviceName: string,
): Promise<void> {
  const logger = new Logger(serviceName);

  try {
    await bootstrapFn();
  } catch (error) {
    logger.error(`❌ Failed to start ${serviceName}`, error);
    process.exit(1);
  }
}
