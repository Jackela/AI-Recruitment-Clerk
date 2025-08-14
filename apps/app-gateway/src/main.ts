/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 应用级性能优化配置
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn', 'log'] 
      : ['error', 'warn', 'log', 'debug', 'verbose'],
    
    // 缓冲区和超时设置
    bodyParser: true,
    cors: false, // 我们稍后会自定义CORS配置
  });
  
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  // Enable CORS for frontend integration
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://ai-recruitment-clerk-production.up.railway.app', 'http://localhost:4200'] 
      : ['http://localhost:4200', 'http://localhost:4202'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });
  
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true,
    transform: true,
    disableErrorMessages: process.env.NODE_ENV === 'production', // 生产环境隐藏详细错误
  }));
  
  // 获取底层Express实例进行性能优化
  const server = app.getHttpAdapter().getInstance();
  
  // Express性能优化配置
  server.set('trust proxy', 1); // 信任代理（用于负载均衡）
  server.disable('x-powered-by'); // 隐藏Express标识
  
  // 请求大小和超时限制
  server.use((req: any, res: any, next: any) => {
    // 设置超时时间（30秒）
    req.setTimeout(30000, () => {
      res.status(408).json({ 
        error: 'Request timeout',
        message: 'Request took too long to process' 
      });
    });
    
    // 连接超时
    req.connection.setTimeout(60000);
    
    next();
  });
  
  // 压缩响应（如果需要）
  if (process.env.ENABLE_COMPRESSION === 'true') {
    const compression = require('compression');
    server.use(compression({
      level: 6,           // 压缩级别（1-9，6为平衡）
      threshold: 1024,    // 只压缩大于1KB的响应
      filter: (req: any, res: any) => {
        // 不压缩已经压缩的内容
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));
  }
  
  // Swagger API Documentation
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
    .addServer('https://ai-recruitment-clerk-production.up.railway.app', 'Railway生产环境')
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
