/**
 * AI Recruitment Clerk - Gateway Bootstrap
 */
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ProductionSecurityValidator } from './common/security/production-security-validator';

async function bootstrap(): Promise<void> {
  // Fail-fast env validation
  Logger.log('🔍 [FAIL-FAST] Validating critical environment variables...');
  const requiredVars = ['MONGO_URL'];
  const missingVars = requiredVars.filter((v) => !process.env[v]);
  if (process.env.NODE_ENV !== 'test' && missingVars.length > 0) {
    Logger.warn(
      '⚠️ [FAIL-FAST] Some env vars missing at bootstrap (will rely on ConfigModule .env):',
    );
    for (const v of missingVars)
      Logger.warn(`   • ${v} is not set at process.env yet`);
    Logger.warn(
      '   If .env exists at repo root, Nest ConfigModule will load it shortly.',
    );
  }
  Logger.log('✅ [FAIL-FAST] All critical environment variables validated');

  // Startup logging
  Logger.log('🚀 [bootstrap] Starting AI Recruitment Clerk Gateway...');
  Logger.log(`- Node environment: ${process.env.NODE_ENV || 'not set'}`);
  Logger.log(`- Port: ${process.env.PORT || 3000}`);
  Logger.log(`- API Prefix: ${process.env.API_PREFIX || 'api'}`);
  Logger.log(
    `- MongoDB: ${process.env.MONGO_URL ? '✅ Configured' : '❌ Not set'}`,
  );
  Logger.log(
    `- Redis: ${process.env.REDIS_URL ? '✅ Configured' : '⚠️ Optional'}`,
  );

  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
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
  if (process.env.NODE_ENV === 'production' && !securityResult.isValid) {
    if (process.env.ALLOW_INSECURE_LOCAL === 'true') {
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
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || [
            'https://ai-recruitment-clerk-production.up.railway.app',
          ]
        : ['http://localhost:4200', 'http://localhost:4202'],
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
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 3600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // Express tuning
  const server = app.getHttpAdapter().getInstance();
  server.set('trust proxy', 1);
  server.disable('x-powered-by');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.use((req: any, res: any, next: () => void) => {
    req.setTimeout(30000, () => {
      res.status(408).json({
        error: 'Request timeout',
        message: 'Request took too long to process',
      });
    });
    req.connection.setTimeout(60000);
    next();
  });
  if (process.env.ENABLE_COMPRESSION === 'true') {
    const compression = require('compression');
    server.use(
      compression({
        level: 6,
        threshold: 1024,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: (req: any, res: any) => {
          if (req.headers['x-no-compression']) return false;
          return compression.filter(req, res);
        },
      }),
    );
  }

  // Swagger
  const config = new DocumentBuilder()
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
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `📚 API Documentation available at: http://localhost:${port}/${globalPrefix}/docs`,
  );
}

bootstrap();
