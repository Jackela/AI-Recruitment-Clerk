# 开发者指南

> **AI Recruitment Clerk 开发手册**  
> **适用于**: 新加入开发者、代码审查、技术规范

## 📋 目录
- [开发环境搭建](#开发环境搭建)
- [项目结构理解](#项目结构理解)
- [开发工作流](#开发工作流)
- [测试策略](#测试策略)
- [代码规范](#代码规范)
- [调试指南](#调试指南)
- [部署流程](#部署流程)

## 🛠 开发环境搭建

### 前置要求

| 工具 | 版本要求 | 安装方式 |
|------|----------|----------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 8+ | `npm install -g pnpm` |
| **MongoDB** | 6.x | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **NATS Server** | latest | [nats.io](https://nats.io/download/) |
| **Git** | latest | [git-scm.com](https://git-scm.com/) |

### 环境配置

```bash
# 1. 克隆项目
git clone <repository-url>
cd AI-Recruitment-Clerk

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置数据库和外部服务

# 4. 启动基础设施
# MongoDB (本地)
mongod --dbpath ./data/db

# NATS Server  
nats-server -js

# 5. 构建项目
pnpm exec nx run-many --target=build --all

# 6. 运行测试验证
pnpm exec nx run-many --target=test --all
```

### IDE配置推荐

**VSCode扩展**:
- TypeScript Importer
- NestJS Files
- Angular Language Service
- Jest Runner
- MongoDB for VS Code

**设置建议**:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

## 🏗 项目结构理解

### Monorepo架构

```
AI-Recruitment-Clerk/
├── 🔧 配置文件
│   ├── nx.json                 # Nx工作区配置
│   ├── package.json            # 根依赖管理
│   ├── tsconfig.base.json      # TypeScript基础配置
│   └── jest.config.ts          # Jest测试配置
│
├── 📱 apps/ (应用层)
│   ├── app-gateway/            # API网关服务
│   ├── jd-extractor-svc/       # JD提取微服务
│   ├── resume-parser-svc/      # 简历解析微服务 ⭐
│   └── scoring-engine-svc/     # 评分引擎微服务
│
├── 📦 libs/ (共享库)
│   └── shared-dtos/            # 统一数据模型
│
├── 📋 specs/ (规范文档)
│   ├── PROJECT_MISSION.md      # 项目使命
│   ├── api_spec.openapi.yml    # API规范
│   └── data_models.ts          # 数据模型(已迁移)
│
└── 📚 documents/ (项目文档)
    ├── 商业需求文档 (BRD).md
    ├── 概要设计文档 (HLD).md
    └── 详细设计文档 (LLD).md
```

### 核心概念理解

**事件驱动架构**:
- 所有服务通过NATS事件通信
- 松耦合，高扩展性
- 异步处理，提高性能

**共享库模式**:
- `@ai-recruitment-clerk/shared-dtos`统一数据类型
- 避免重复定义，确保类型安全
- 版本化管理，向后兼容

## ⚡ 开发工作流

### 1. 新功能开发流程

```bash
# Step 1: 创建功能分支
git checkout -b feature/resume-parser-implementation

# Step 2: TDD开发循环
# 2a. 写测试 (Red)
npm test -- --watch resume-parser-svc

# 2b. 实现功能 (Green)  
# 编写业务逻辑使测试通过

# 2c. 重构优化 (Refactor)
# 优化代码结构，保持测试通过

# Step 3: 代码检查
pnpm exec nx lint resume-parser-svc
pnpm exec nx format:write

# Step 4: 完整测试
pnpm exec nx test resume-parser-svc
pnpm exec nx run-many --target=test --all

# Step 5: 提交代码
git add .
git commit -m "feat(resume-parser): implement core parsing logic"

# Step 6: 推送与PR
git push origin feature/resume-parser-implementation
# 创建Pull Request
```

### 2. 微服务开发模式

```bash
# 启动单个服务进行开发
pnpm exec nx serve resume-parser-svc

# 监听文件变化，自动重启
pnpm exec nx serve resume-parser-svc --watch

# 同时启动多个相关服务
pnpm exec nx run-many --target=serve --projects=app-gateway,resume-parser-svc
```

### 3. 调试模式

```bash
# Debug模式启动服务
node --inspect-brk dist/apps/resume-parser-svc/main.js

# VSCode调试配置 (.vscode/launch.json)
{
  "type": "node",
  "request": "attach", 
  "name": "Debug Resume Parser",
  "port": 9229,
  "restart": true
}
```

## 🧪 测试策略

### TDD开发循环

**Resume Parser Service示例**:

```typescript
// 1. Red - 写失败测试
describe('ParsingService', () => {
  it('should process resume and publish event', async () => {
    // Arrange
    const event = { jobId: 'job1', resumeId: 'res1', ... };
    
    // Act & Assert - 期望失败
    await expect(service.handleResumeSubmitted(event))
      .rejects.toThrow('not implemented');
  });
});

// 2. Green - 实现功能
@Injectable()
export class ParsingService {
  async handleResumeSubmitted(event: ResumeSubmittedEvent) {
    // 实现业务逻辑
    const pdfBuffer = await this.gridFs.downloadFile(event.tempGridFsUrl);
    const rawData = await this.visionLlm.parseResumePdf(pdfBuffer);
    const resumeDto = await this.fieldMapper.normalize(rawData);
    
    await this.natsClient.publishAnalysisResumeParsed({
      jobId: event.jobId,
      resumeId: event.resumeId,
      resumeDto,
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    });
  }
}

// 3. Refactor - 优化重构
// 提取方法，优化错误处理，添加日志等
```

### 测试分层策略

```bash
# 单元测试 - 快速反馈
pnpm exec nx test resume-parser-svc

# 集成测试 - 服务协作
pnpm exec nx test resume-parser-svc-e2e

# E2E测试 - 完整流程
pnpm exec nx e2e app-gateway-e2e
```

### Mock策略

```typescript
// 服务级Mock
jest.mock('../vision-llm/vision-llm.service');
jest.mock('../gridfs/gridfs.service');

// 方法级Mock
const mockVisionLlm = {
  parseResumePdf: jest.fn().mockResolvedValue(mockRawData)
};

// Spy监听
const publishSpy = jest.spyOn(mockNatsClient, 'publishAnalysisResumeParsed');
```

## 📏 代码规范

### TypeScript规范

```typescript
// ✅ 好的实践
interface ResumeSubmittedEvent {
  readonly jobId: string;
  readonly resumeId: string;
  readonly originalFilename: string;
  readonly tempGridFsUrl: string;
}

@Injectable()
export class ParsingService {
  constructor(
    private readonly gridFs: GridFsService,
    private readonly visionLlm: VisionLlmService,
    private readonly fieldMapper: FieldMapperService,
    private readonly natsClient: NatsClient,
    private readonly logger = new Logger(ParsingService.name)
  ) {}

  async handleResumeSubmitted(event: ResumeSubmittedEvent): Promise<void> {
    this.logger.log(`Processing resume ${event.resumeId} for job ${event.jobId}`);
    
    try {
      // 业务逻辑
    } catch (error) {
      this.logger.error(`Failed to process resume: ${error.message}`, error.stack);
      throw error;
    }
  }
}

// ❌ 避免的做法
export class BadService {
  public data: any; // 避免any类型
  
  process(input) { // 缺少类型注解
    // 没有错误处理
    return this.someApi.call(input);
  }
}
```

### NestJS最佳实践

```typescript
// 模块定义
@Module({
  imports: [
    // 按字母顺序排列
    ConfigModule,
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema }
    ])
  ],
  controllers: [ResumeEventsController],
  providers: [
    ParsingService,
    VisionLlmService, 
    GridFsService,
    FieldMapperService,
    NatsClient
  ],
  exports: [ParsingService] // 只导出需要的服务
})
export class ResumeParserModule {}

// 控制器设计
@Controller()
export class ResumeEventsController {
  constructor(private readonly parsingService: ParsingService) {}

  @EventPattern('job.resume.submitted')
  async handleResumeSubmitted(
    @Payload() data: ResumeSubmittedEvent,
    @Ctx() context: NatsContext
  ) {
    await this.parsingService.handleResumeSubmitted(data);
  }
}
```

### 错误处理规范

```typescript
// 自定义异常
export class ResumeParsingException extends Error {
  constructor(
    message: string,
    public readonly resumeId: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ResumeParsingException';
  }
}

// 服务中的错误处理
async handleResumeSubmitted(event: ResumeSubmittedEvent): Promise<void> {
  try {
    // 业务逻辑
  } catch (error) {
    if (error instanceof VisionLlmException) {
      // 重试逻辑
      await this.retryWithExponentialBackoff(event, error);
    } else {
      // 发布失败事件
      await this.publishFailureEvent(event, error);
      throw new ResumeParsingException(
        `Failed to process resume ${event.resumeId}`,
        event.resumeId,
        error
      );
    }
  }
}
```

## 🔍 调试指南

### 本地调试

```bash
# 1. 启动依赖服务
docker-compose up mongodb nats

# 2. Debug模式启动应用
pnpm exec nx serve resume-parser-svc --inspect

# 3. 查看日志
tail -f logs/resume-parser-svc.log

# 4. 监控事件流
nats sub "job.resume.*" 
nats sub "analysis.resume.*"
```

### 常见问题排查

**连接问题**:
```bash
# 检查MongoDB连接
mongosh --eval "db.runCommand('ping')"

# 检查NATS连接  
nats-server --signal status
```

**事件流调试**:
```bash
# 监听所有事件
nats sub ">"

# 发布测试事件
nats pub job.resume.submitted '{"jobId":"test","resumeId":"test"}'
```

**性能分析**:
```bash
# 内存使用分析
node --inspect --max-old-space-size=4096 dist/apps/resume-parser-svc/main.js

# 生成火焰图
npm install -g clinic
clinic doctor -- node dist/apps/resume-parser-svc/main.js
```

## 🚀 部署流程

### 本地部署

```bash
# 构建生产版本
pnpm exec nx run-many --target=build --all --prod

# 创建容器镜像
docker build -f apps/resume-parser-svc/Dockerfile -t resume-parser-svc .

# 运行容器
docker run -p 3000:3000 resume-parser-svc
```

### 环境配置

```bash
# 开发环境
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ai-recruitment-dev
NATS_URL=nats://localhost:4222
VISION_LLM_API_KEY=your-api-key

# 生产环境  
NODE_ENV=production
MONGODB_URI=mongodb://prod-cluster:27017/ai-recruitment
NATS_URL=nats://prod-nats-cluster:4222
VISION_LLM_API_KEY=prod-api-key
LOG_LEVEL=info
```

## 🎯 开发最佳实践

### 1. 性能优化

```typescript
// 使用缓存减少API调用
@Injectable()
export class VisionLlmService {
  private readonly cache = new Map<string, any>();

  async parseResumePdf(buffer: Buffer): Promise<any> {
    const hash = createHash('md5').update(buffer).digest('hex');
    
    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }
    
    const result = await this.callVisionApi(buffer);
    this.cache.set(hash, result);
    return result;
  }
}

// 并发处理
async processBatch(events: ResumeSubmittedEvent[]): Promise<void> {
  const promises = events.map(event => 
    this.handleResumeSubmitted(event).catch(error => 
      this.logger.error(`Failed to process ${event.resumeId}`, error)
    )
  );
  
  await Promise.allSettled(promises);
}
```

### 2. 监控与可观测性

```typescript
// 添加指标收集
@Injectable()
export class ParsingService {
  private readonly processingHistogram = new Histogram({
    name: 'resume_processing_duration_seconds',
    help: 'Resume processing duration'
  });

  async handleResumeSubmitted(event: ResumeSubmittedEvent): Promise<void> {
    const timer = this.processingHistogram.startTimer();
    
    try {
      // 业务逻辑
      timer({ status: 'success' });
    } catch (error) {
      timer({ status: 'error' });
      throw error;
    }
  }
}
```

### 3. 安全实践

```typescript
// 输入验证
@IsString()
@IsNotEmpty()
@IsUUID()
jobId: string;

// 敏感信息处理
@Transform(({ value }) => value ? '***masked***' : null)
apiKey: string;

// 文件安全检查
async validateFile(buffer: Buffer): Promise<boolean> {
  const fileType = await FileType.fromBuffer(buffer);
  return fileType?.mime === 'application/pdf';
}
```

## 📚 学习资源

### 项目相关
- [NestJS官方文档](https://docs.nestjs.com/)
- [MongoDB官方指南](https://docs.mongodb.com/)
- [NATS JetStream文档](https://docs.nats.io/nats-concepts/jetstream)
- [Nx工作区指南](https://nx.dev/getting-started/intro)

### 最佳实践
- [Node.js最佳实践](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript深入理解](https://basarat.gitbook.io/typescript/)
- [微服务模式](https://microservices.io/patterns/)

---

**开发支持**: 有问题请查阅项目文档或联系项目维护者  
**代码审查**: 确保遵循本指南的规范和最佳实践