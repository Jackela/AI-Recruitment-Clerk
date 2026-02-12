/**
 * AI Recruitment Clerk - Gateway Bootstrap
 */
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ProductionSecurityValidator } from './common/security/production-security-validator';
import { bootstrapNestJsGateway, createDtoValidationPipe } from '@ai-recruitment-clerk/infrastructure-shared';
import { validateEnv } from '@ai-recruitment-clerk/configuration';
import compression from 'compression';
import type { Request, Response } from 'express';

async function bootstrap(): Promise<void> {
  // Fail-fast env validation using shared configuration validator
  Logger.log('🔍 [FAIL-FAST] Validating environment variables...');
  const env = validateEnv('appGateway');

  const nodeEnv = env.getString('NODE_ENV', false) ?? 'development';
  const port = env.getNumber('PORT');
  const allowedOrigins = env.getArray('ALLOWED_ORIGINS');
  const isInsecureLocalAllowed = env.getBoolean('ALLOW_INSECURE_LOCAL', false);
  const enableCompression = env.getBoolean('ENABLE_COMPRESSION', false);
  const enableSwagger = env.getBoolean('ENABLE_SWAGGER', false) ?? nodeEnv !== 'production';

  Logger.log(`✅ [FAIL-FAST] Environment validated (NODE_ENV=${nodeEnv})`);

  // Bootstrap the application using shared helper
  const app = await bootstrapNestJsGateway(AppModule, {
    serviceName: 'AI Recruitment Clerk Gateway',
    port,
    globalPrefix: 'api',
    cors: {
      origin:
        nodeEnv === 'production'
          ? allowedOrigins.length > 0
            ? allowedOrigins
            : ['https://ai-recruitment-clerk-production.up.railway.app']
          : ['http://localhost:4200', 'http://localhost:4202'],
    },
  });

  // Security validation
  const securityValidator = app.get(ProductionSecurityValidator);
  const securityResult = securityValidator.validateSecurityConfiguration();
  if (nodeEnv === 'production' && !securityResult.isValid) {
    if (isInsecureLocalAllowed) {
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

  // Global validation pipe - using shared pipe from infrastructure-shared
  app.useGlobalPipes(
    createDtoValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Express tuning (request timeout and compression)
  const server = app.getHttpAdapter().getInstance();
  server.use((req: Request, res: Response, next: () => void) => {
    req.setTimeout(30000, () => {
      res.status(408).json({
        error: 'Request timeout',
        message: 'Request took too long to process',
      });
    });
    req.connection.setTimeout(60000);
    next();
  });
  if (enableCompression) {
    server.use(
      compression({
        level: 6,
        threshold: 1024,
        filter: (req: Request, res: Response) => {
          if (req.headers['x-no-compression']) return false;
          return compression.filter(req, res);
        },
      }),
    );
  }

  // Swagger documentation - only enable in non-production or when explicitly enabled
  // SECURITY: Swagger should be disabled in production to avoid exposing API structure
  if (enableSwagger) {
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

    Logger.log(
      `📚 API Documentation available at: http://localhost:${port ?? 3000}/api/docs`,
    );
  } else if (nodeEnv === 'production') {
    Logger.log('🔒 Swagger documentation is disabled in production');
  }
}

bootstrap().catch((err) => {
  Logger.error('❌ Failed to start AI Recruitment Clerk Gateway', err);
  process.exit(1);
});
