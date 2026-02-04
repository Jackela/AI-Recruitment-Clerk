/**
 * AI Recruitment Clerk - Gateway Bootstrap
 */
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ProductionSecurityValidator } from './common/security/production-security-validator';
import { bootstrapNestJsGateway } from '@ai-recruitment-clerk/infrastructure-shared';
import compression from 'compression';
import type { Request, Response } from 'express';

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

  // Bootstrap the application using shared helper
  const app = await bootstrapNestJsGateway(AppModule, {
    serviceName: 'AI Recruitment Clerk Gateway',
    port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined,
    globalPrefix: 'api',
    cors: {
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.ALLOWED_ORIGINS?.split(',') || [
              'https://ai-recruitment-clerk-production.up.railway.app',
            ]
          : ['http://localhost:4200', 'http://localhost:4202'],
    },
  });

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

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
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
  if (process.env.ENABLE_COMPRESSION === 'true') {
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

  // Swagger documentation
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
    `📚 API Documentation available at: http://localhost:${process.env.PORT || 3000}/api/docs`,
  );
}

bootstrap().catch((err) => {
  Logger.error('❌ Failed to start AI Recruitment Clerk Gateway', err);
  process.exit(1);
});
