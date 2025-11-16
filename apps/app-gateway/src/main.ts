/**
 * AI Recruitment Clerk - Gateway Bootstrap
 */
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ProductionSecurityValidator } from './common/security/production-security-validator';
import { getConfig } from '@ai-recruitment-clerk/configuration';

async function bootstrap() {
  const config = getConfig({
    forceReload: true,
  });

  Logger.log('🔍 [FAIL-FAST] Validating critical configuration...');
  if (!config.database.url && !config.env.isTest) {
    Logger.error('❌ Database URL missing from configuration. Aborting bootstrap.');
    process.exit(1);
  }
  Logger.log('✅ [FAIL-FAST] Configuration validated');

  Logger.log('🚀 [bootstrap] Starting AI Recruitment Clerk Gateway...');
  Logger.log(`- Node environment: ${config.env.mode}`);
  Logger.log(`- Port: ${config.server.port}`);
  Logger.log(`- API Prefix: ${config.server.apiPrefix}`);
  Logger.log(`- MongoDB: ${config.database.url ? '✅ Configured' : '❌ Not set'}`);
  Logger.log(
    `- Redis: ${
      config.cache.redis.url || config.cache.redis.host ? '✅ Configured' : '⚠️ Optional'
    }`,
  );

  const app = await NestFactory.create(AppModule, {
    logger: config.env.isProduction
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
    bodyParser: true,
    cors: false,
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Security validation
  const securityValidator = app.get(ProductionSecurityValidator);
  const securityResult = securityValidator.validateSecurityConfiguration();
  if (config.env.isProduction && !securityResult.isValid) {
    if (config.security.allowInsecureLocal) {
      Logger.warn('⚠️ Bypassing security validation for local run');
      securityResult.issues.forEach((i) => Logger.warn(`   • ${i}`));
      Logger.warn(`Security score: ${securityResult.score}/100`);
    } else {
      Logger.error('🚨 SECURITY VALIDATION FAILED - Application cannot start');
      Logger.error('Security issues found:', securityResult.issues);
      Logger.error(`Security score: ${securityResult.score}/100`);
      process.exit(1);
    }
  } else if (securityResult.issues.length > 0) {
    Logger.warn('⚠️ Security validation completed with warnings');
    securityResult.issues.forEach((i) => Logger.warn(`   • ${i}`));
    Logger.warn(`Security score: ${securityResult.score}/100`);
  } else {
    Logger.log(
      `✅ Security validation passed - Score: ${securityResult.score}/100`,
    );
  }

  // CORS
  const allowedOrigins =
    config.env.isProduction && config.cors.origins.length > 0
      ? config.cors.origins
      : ['http://localhost:4200', 'http://localhost:4202'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Device-ID',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    credentials: config.cors.allowCredentials,
    optionsSuccessStatus: 200,
    maxAge: 3600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      disableErrorMessages: config.env.isProduction,
    }),
  );

  // Express tuning
  const server = app.getHttpAdapter().getInstance();
  server.set('trust proxy', 1);
  server.disable('x-powered-by');
  server.use(
    (
      req: { setTimeout: (ms: number, cb: () => void) => void; connection: { setTimeout: (ms: number) => void } },
      res: { status: (code: number) => { json: (body: Record<string, string>) => void } },
      next: () => void,
    ) => {
      req.setTimeout(30000, () => {
        res.status(408).json({
          error: 'Request timeout',
          message: 'Request took too long to process',
        });
      });
      req.connection.setTimeout(60000);
      next();
    },
  );
  if (config.features.enableCompression) {
    const compression = require('compression');
    server.use(
      compression({
        level: 6,
        threshold: 1024,
        filter: (
          req: { headers: Record<string, string | string[] | undefined> },
          res: { setHeader: (name: string, value: string) => void },
        ) => {
          if (req.headers['x-no-compression']) return false;
          return compression.filter(req, res);
        },
      }),
    );
  }

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Recruitment Clerk API')
    .setDescription('智能招聘管理系统 - 完整的API文档')
    .setVersion('1.0.0')
    .addTag('jobs', '职位管理')
    .addTag('auth', '认证授权')
    .addTag('resume', '简历管理')
    .addTag('scoring', '评分引擎')
    .addTag('reports', '报告生成')
    .addBearerAuth()
    .addServer('http://localhost:3000', '开发环境')
    .addServer('http://app-gateway:3000', 'Docker环境')
    .addServer(
      'https://ai-recruitment-clerk-production.up.railway.app',
      'Railway生产环境',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = config.server.port;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `📚 API Documentation available at: http://localhost:${port}/${globalPrefix}/docs`,
  );
}

bootstrap();
