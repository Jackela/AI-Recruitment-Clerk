/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ProductionSecurityValidator } from './common/security/production-security-validator';

async function bootstrap() {
  // Enhanced startup logging
  Logger.log('🚀 [bootstrap] Starting AI Recruitment Clerk Gateway...');
  Logger.log(`- Node environment: ${process.env.NODE_ENV || 'not set'}`);
  Logger.log(`- Port: ${process.env.PORT || 3000}`);
  Logger.log(`- API Prefix: ${process.env.API_PREFIX || 'api'}`);

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
  
  // 🔒 Security Validation at Startup
  const securityValidator = app.get(ProductionSecurityValidator);
  const securityResult = securityValidator.validateSecurityConfiguration();
  
  if (process.env.NODE_ENV === 'production' && !securityResult.isValid) {
    Logger.error('🚨 SECURITY VALIDATION FAILED - Application cannot start');
    Logger.error('Security issues found:', securityResult.issues);
    Logger.error(`Security score: ${securityResult.score}/100`);
    process.exit(1);
  } else if (securityResult.issues.length > 0) {
    Logger.warn('⚠️ Security validation completed with warnings');
    securityResult.issues.forEach(issue => Logger.warn(`   • ${issue}`));
    Logger.warn(`Security score: ${securityResult.score}/100`);
  } else {
    Logger.log(`✅ Security validation passed - Score: ${securityResult.score}/100`);
  }
  
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
  // 根路径提供可立即交互的最小化上传页（无依赖前端构建）
  server.get('/', (_req: any, res: any) => {
    const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Recruitment Clerk</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;max-width:860px;margin:40px auto;padding:0 16px;color:#111}
    header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
    .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0}
    .muted{color:#6b7280}
    button{background:#111;color:#fff;border:none;padding:10px 16px;border-radius:8px;cursor:pointer}
    input,textarea{width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    pre{background:#0b1020;color:#c7d2fe;border-radius:8px;padding:12px;overflow:auto}
    .ok{color:#16a34a}
    .warn{color:#ef4444}
  </style>
  <script>
    function uuid(){return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16))}
    const deviceId = localStorage.getItem('device_id') || (localStorage.setItem('device_id', uuid()), localStorage.getItem('device_id'))
    
    // 页面加载后显示设备ID
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('dev').textContent = deviceId;
    });
    async function uploadResume(ev){
      ev.preventDefault();
      const form = ev.target.closest('form');
      const file = form.resume.files[0];
      if(!file){ alert('请选择简历文件(.pdf/.doc/.docx)'); return }
      const fd = new FormData();
      fd.append('resume', file);
      fd.append('candidateName', form.candidateName.value || '');
      fd.append('candidateEmail', form.candidateEmail.value || '');
      fd.append('notes', form.notes.value || '');
      const out = document.getElementById('out');
      out.textContent = '上传中...';
      const resp = await fetch('/api/guest/resume/analyze', { method:'POST', headers:{'X-Device-ID': deviceId}, body: fd });
      const json = await resp.json();
      out.textContent = JSON.stringify(json, null, 2);
      if(json?.data?.analysisId){ document.getElementById('analysisId').textContent = json.data.analysisId }
    }
    async function getDemo(){
      const out = document.getElementById('out');
      out.textContent = '获取示例分析...';
      const resp = await fetch('/api/guest/resume/demo-analysis', { headers:{'X-Device-ID': deviceId} });
      const json = await resp.json();
      out.textContent = JSON.stringify(json, null, 2);
    }
    async function poll(){
      const id = document.getElementById('analysisId').textContent.trim();
      if(!id){ alert('请先上传简历获取 analysisId'); return }
      const out = document.getElementById('out');
      out.textContent = '查询中...';
      const resp = await fetch('/api/guest/resume/analysis/' + encodeURIComponent(id), { headers:{'X-Device-ID': deviceId} });
      const json = await resp.json();
      out.textContent = JSON.stringify(json, null, 2);
    }
  </script>
  <meta name="robots" content="noindex" />
  </head>
<body>
  <header>
    <h2>AI Recruitment Clerk</h2>
    <small class="muted">设备ID: <code id="dev"></code></small>
  </header>
  <section class="card">
    <h3>上传简历（游客可用）</h3>
    <form onsubmit="uploadResume(event)">
      <div class="row">
        <div><label>候选人姓名<input name="candidateName" placeholder="可选" /></label></div>
        <div><label>候选人邮箱<input name="candidateEmail" placeholder="可选" /></label></div>
      </div>
      <label>备注<textarea name="notes" rows="2" placeholder="可选"></textarea></label>
      <div style="margin:8px 0">
        <input type="file" name="resume" accept=".pdf,.doc,.docx" />
      </div>
      <button type="submit">上传并分析</button>
      <button type="button" style="margin-left:8px;background:#374151" onclick="getDemo()">查看示例分析</button>
    </form>
  </section>
  <section class="card">
    <div>analysisId: <code id="analysisId"></code> <button onclick="poll()">查询进度/结果</button></div>
    <pre id="out" class="muted">Ready.</pre>
  </section>
  <section class="card">
    <div>API 文档：<a href="/api/docs">/api/docs</a></div>
    <div class="muted">健康检查：<a href="/api/health">/api/health</a></div>
  </section>
</body>
</html>`;
    res.type('html').status(200).send(html);
  });
  
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
