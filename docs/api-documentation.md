# AI 招聘助理 - API 文档

## 概述

AI 招聘助理是一个基于微服务架构的智能招聘平台，提供简历解析、职位描述提取、智能匹配评分和报告生成功能。

## 架构概览

### 微服务组件

1. **app-gateway** (端口: 3000) - API网关和主要业务逻辑
2. **resume-parser-svc** (端口: 3001) - 简历解析服务
3. **jd-extractor-svc** (端口: 3002) - 职位描述提取服务
4. **scoring-engine-svc** (端口: 3003) - 智能评分引擎
5. **report-generator-svc** (端口: 3004) - 报告生成服务

### 技术栈

- **后端**: NestJS, TypeScript, MongoDB, Redis, NATS JetStream
- **前端**: Angular 20.1, RxJS, NgRx
- **消息队列**: NATS JetStream
- **数据库**: MongoDB (主数据库), Redis (缓存)
- **部署**: Railway, Docker

## 核心API端点

### 1. 访客 (Guest) 模块

#### 1.1 简历分析工作流

**POST /api/guest/resume/analyze**

开始简历分析工作流程。

```typescript
// 请求体
interface AnalyzeResumeRequest {
  deviceId: string;        // 设备标识符
  file: File;             // 简历文件 (PDF/DOC/DOCX)
  jobDescription?: string; // 可选的职位描述
}

// 响应
interface AnalyzeResumeResponse {
  sessionId: string;       // 分析会话ID
  message: string;         // 状态消息
  estimatedTime: number;   // 预估处理时间(秒)
}
```

**GET /api/guest/resume/status/:sessionId**

查询分析进度。

```typescript
interface AnalysisStatus {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;        // 0-100的进度百分比
  currentStep: string;     // 当前处理步骤
  result?: AnalysisResult; // 完成后的结果
  error?: string;          // 错误信息
}
```

**GET /api/guest/resume/result/:sessionId**

获取完整分析结果。

```typescript
interface AnalysisResult {
  sessionId: string;
  score: number;           // 总体匹配分数 (0-100)
  extractedData: {
    personalInfo: PersonalInfo;
    experience: WorkExperience[];
    education: Education[];
    skills: Skill[];
    summary: string;
  };
  matching: {
    overallScore: number;
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    recommendations: string[];
  };
  reportUrl?: string;      // 生成报告的下载链接
}
```

#### 1.2 反馈机制

**POST /api/guest/feedback/generate-code**

生成反馈兑换码。

```typescript
interface FeedbackCodeRequest {
  sessionId: string;
  deviceId: string;
}

interface FeedbackCodeResponse {
  code: string;           // 6位数字兑换码
  expiresAt: Date;        // 过期时间
  instructions: string;   // 使用说明
}
```

**POST /api/guest/feedback/redeem**

兑换反馈码获取结果。

```typescript
interface RedeemCodeRequest {
  code: string;
  deviceId: string;
}

interface RedeemCodeResponse {
  success: boolean;
  result?: AnalysisResult;
  message: string;
}
```

### 2. 仪表板 (Dashboard) 模块

#### 2.1 统计数据

**GET /api/dashboard/stats**

获取仪表板统计数据。

```typescript
interface DashboardStats {
  totalJobs: number;
  totalResumes: number;
  totalReports: number;
  activeMatches: number;
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    uptime: string;
    responseTime: number;
  };
  recentActivity: ActivityItem[];
  serviceMetrics: {
    analysisInProgress: number;
    completedToday: number;
    averageProcessingTime: string;
    successRate: number;
  };
}
```

#### 2.2 系统健康状态

**GET /api/health**

系统健康检查。

```typescript
interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  timestamp: string;
  services: {
    gateway: ServiceStatus;
    resumeParser: ServiceStatus;
    scoringEngine: ServiceStatus;
    reportGenerator: ServiceStatus;
    database: ServiceStatus;
    messageQueue: ServiceStatus;
  };
  processingMetrics: {
    queueDepth: number;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  };
}

interface ServiceStatus {
  status: string;
  responseTime: number;
}
```

#### 2.3 活动日志

**GET /api/dashboard/activity**

获取最近活动记录。

```typescript
interface ActivityItem {
  id: string;
  type: 'job-created' | 'resume-uploaded' | 'report-generated' | 'match-found' | 'analysis-completed';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'processing' | 'completed' | 'failed';
  metadata?: {
    jobId?: string;
    resumeId?: string;
    reportId?: string;
    score?: number;
  };
}
```

### 3. 微服务内部API

#### 3.1 简历解析服务 (resume-parser-svc)

**POST /parse**

解析简历文件。

```typescript
interface ParseRequest {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

interface ParseResponse {
  success: boolean;
  data: {
    personalInfo: PersonalInfo;
    experience: WorkExperience[];
    education: Education[];
    skills: Skill[];
    rawText: string;
  };
  processingTime: number;
}
```

#### 3.2 职位描述提取服务 (jd-extractor-svc)

**POST /extract**

提取职位描述关键信息。

```typescript
interface ExtractRequest {
  jobDescription: string;
  extractionType: 'skills' | 'requirements' | 'responsibilities' | 'all';
}

interface ExtractResponse {
  success: boolean;
  data: {
    requiredSkills: string[];
    preferredSkills: string[];
    experience: string[];
    education: string[];
    responsibilities: string[];
  };
}
```

#### 3.3 评分引擎服务 (scoring-engine-svc)

**POST /score**

计算匹配分数。

```typescript
interface ScoreRequest {
  resumeData: ExtractedResumeData;
  jobRequirements: JobRequirements;
}

interface ScoreResponse {
  success: boolean;
  data: {
    overallScore: number;
    breakdown: {
      skillsScore: number;
      experienceScore: number;
      educationScore: number;
    };
    details: ScoringDetails;
  };
}
```

#### 3.4 报告生成服务 (report-generator-svc)

**POST /generate**

生成分析报告。

```typescript
interface GenerateReportRequest {
  sessionId: string;
  analysisData: AnalysisResult;
  format: 'pdf' | 'html' | 'json';
}

interface GenerateReportResponse {
  success: boolean;
  reportUrl: string;
  downloadToken: string;
  expiresAt: Date;
}
```

## 数据模型

### 核心实体

#### GuestSession (访客会话)

```typescript
interface GuestSession {
  _id: ObjectId;
  deviceId: string;
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  
  // 输入数据
  originalFileName: string;
  fileMetadata: FileMetadata;
  jobDescription?: string;
  
  // 处理结果
  extractedData?: ExtractedResumeData;
  analysisResult?: AnalysisResult;
  feedbackCode?: string;
  codeGeneratedAt?: Date;
  codeRedeemedAt?: Date;
  
  // 处理状态
  currentStep: string;
  progress: number;
  errorMessage?: string;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
}
```

#### ProcessingMetrics (处理指标)

```typescript
interface ProcessingMetrics {
  _id: ObjectId;
  date: Date;
  service: string;
  
  // 性能指标
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  averageProcessingTime: number;
  
  // 资源使用
  peakMemoryUsage: number;
  averageCpuUsage: number;
  queueDepth: number;
  
  // 业务指标
  averageScore: number;
  uniqueDevices: number;
  repeatUsers: number;
}
```

## 消息队列事件

### NATS JetStream 主题

1. **resume.parse.request** - 简历解析请求
2. **resume.parse.completed** - 简历解析完成
3. **analysis.score.request** - 评分请求
4. **analysis.score.completed** - 评分完成
5. **report.generate.request** - 报告生成请求
6. **report.generate.completed** - 报告生成完成
7. **system.health.check** - 系统健康检查
8. **metrics.collect** - 指标收集

### 事件格式

```typescript
interface MessageEvent {
  id: string;
  timestamp: Date;
  type: string;
  source: string;
  data: any;
  correlationId?: string;
  retryCount?: number;
}
```

## 错误处理

### 标准错误格式

```typescript
interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}
```

### 常见错误码

- **400** - 请求参数错误
- **401** - 未授权访问
- **403** - 权限不足
- **404** - 资源不存在
- **429** - 请求频率限制
- **500** - 服务器内部错误
- **502** - 上游服务错误
- **503** - 服务不可用

## 安全性

### 访客模式安全

1. **设备指纹**: 基于浏览器特征生成唯一设备ID
2. **会话限制**: 每个设备限制并发分析数量
3. **文件验证**: 严格的文件类型和大小限制
4. **数据加密**: 敏感数据使用AES-256-GCM加密
5. **临时存储**: 访客数据定期清理

### API安全

1. **速率限制**: 基于IP和设备的请求频率限制
2. **输入验证**: 严格的参数验证和清理
3. **CORS配置**: 限制跨域访问
4. **健康检查**: 实时监控系统状态

## 性能优化

### 缓存策略

1. **Redis缓存**: 热点数据和计算结果缓存
2. **CDN**: 静态资源分发
3. **数据库索引**: 优化查询性能
4. **连接池**: 数据库连接复用

### 负载均衡

1. **微服务负载均衡**: 基于健康状态的路由
2. **消息队列**: 异步处理负载分散
3. **数据库分片**: 水平扩展数据存储

## 监控和日志

### 监控指标

1. **响应时间**: API端点响应时间
2. **错误率**: 服务错误率统计
3. **吞吐量**: 每秒处理请求数
4. **资源使用**: CPU、内存、磁盘使用率
5. **队列深度**: 消息队列积压情况

### 日志格式

```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  message: string;
  context?: any;
  correlationId?: string;
  userId?: string;
  deviceId?: string;
}
```

## 部署配置

### 环境变量

```bash
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ai-recruitment
REDIS_URL=redis://localhost:6379

# 消息队列
NATS_URL=nats://localhost:4222

# 服务端口
APP_GATEWAY_PORT=3000
RESUME_PARSER_PORT=3001
JD_EXTRACTOR_PORT=3002
SCORING_ENGINE_PORT=3003
REPORT_GENERATOR_PORT=3004

# AI服务配置
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# 安全配置
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_MASTER_KEY=your_32_byte_encryption_key_here

# 文件存储
UPLOAD_MAX_SIZE=10MB
TEMP_DIR=/tmp/ai-recruitment
REPORT_STORAGE_DIR=/var/reports

# 监控配置
LOG_LEVEL=info
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30s
```

## API使用示例

### 完整的访客分析工作流

```typescript
// 1. 启动分析
const analyzeResponse = await fetch('/api/guest/resume/analyze', {
  method: 'POST',
  body: formData // 包含 deviceId 和文件
});
const { sessionId } = await analyzeResponse.json();

// 2. 轮询状态
const pollStatus = async () => {
  const statusResponse = await fetch(`/api/guest/resume/status/${sessionId}`);
  const status = await statusResponse.json();
  
  if (status.status === 'completed') {
    // 3. 获取结果
    const resultResponse = await fetch(`/api/guest/resume/result/${sessionId}`);
    const result = await resultResponse.json();
    return result;
  } else if (status.status === 'failed') {
    throw new Error(status.error);
  }
  
  // 继续轮询
  setTimeout(pollStatus, 2000);
};

const result = await pollStatus();
```

### WebSocket实时更新 (计划中)

```typescript
// 建立WebSocket连接
const ws = new WebSocket(`ws://localhost:3000/ws/guest/${sessionId}`);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  switch (update.type) {
    case 'progress':
      updateProgressBar(update.progress);
      break;
    case 'step_change':
      updateCurrentStep(update.step);
      break;
    case 'completed':
      showResults(update.result);
      break;
    case 'error':
      showError(update.error);
      break;
  }
};
```

---

*该文档会根据系统发展持续更新。最后更新: 2025-08-17*