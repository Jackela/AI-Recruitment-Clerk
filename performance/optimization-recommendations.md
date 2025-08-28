# 🚀 AI Recruitment Clerk 性能优化建议

## 📊 **性能基线目标**

### **响应时间目标**
- **健康检查**: < 100ms (P95)
- **职位列表**: < 500ms (P95) 
- **职位创建**: < 1s (P95)
- **简历上传**: < 3s (P95)
- **智能评分**: < 5s (P95)
- **报告生成**: < 10s (P95)

### **吞吐量目标**
- **并发用户**: 500+ 
- **每秒请求**: 1000+ QPS
- **错误率**: < 0.1%

### **资源利用率目标**
- **CPU使用率**: < 70% (平均)
- **内存使用率**: < 80%
- **数据库连接**: < 80% 池容量

---

## ⚡ **后端性能优化策略**

### **1. NestJS应用层优化**

#### **缓存策略**
```typescript
// Redis缓存配置
@Injectable()
export class CacheService {
  @Cacheable({ ttl: 300 }) // 5分钟缓存
  async getJobsList(filters: JobFilters): Promise<JobDto[]> {
    return this.jobRepository.findWithFilters(filters);
  }
  
  @CacheEvict({ pattern: 'jobs:*' })
  async createJob(jobData: CreateJobDto): Promise<JobDto> {
    return this.jobRepository.create(jobData);
  }
}
```

#### **数据库查询优化**
```typescript
// MongoDB索引优化
export class JobRepository {
  async createIndexes() {
    await this.jobModel.createIndexes([
      { title: 'text', description: 'text' }, // 全文搜索
      { createdAt: -1 },                      // 时间排序
      { 'requirements.technical': 1 },        // 技能筛选  
      { company: 1, status: 1 },             // 复合查询
      { location: '2dsphere' },               // 地理位置
    ]);
  }
  
  // 分页优化 - 使用游标分页
  async findJobsWithCursor(cursor?: string, limit = 20) {
    const filter = cursor ? { _id: { $gt: cursor } } : {};
    return this.jobModel.find(filter).limit(limit).sort({ _id: 1 });
  }
}
```

#### **请求处理优化**
```typescript
// 批量处理和流式响应
@Controller('jobs')
export class JobsController {
  @Post('bulk')
  async createJobsBulk(@Body() jobs: CreateJobDto[]) {
    // 批量创建，减少数据库往返
    const results = await Promise.allSettled(
      jobs.map(job => this.jobsService.createJob(job))
    );
    return results;
  }
  
  @Get('export/stream')
  async exportJobsStream(@Res() res: Response) {
    // 流式导出大量数据
    res.setHeader('Content-Type', 'application/json');
    const stream = this.jobsService.getJobsStream();
    stream.pipe(res);
  }
}
```

### **2. MongoDB数据库优化**

#### **连接池配置**
```yaml
# docker-compose.yml MongoDB优化
mongodb:
  environment:
    - MONGO_INITDB_ROOT_USERNAME=admin
    - MONGO_INITDB_ROOT_PASSWORD=password123
  command: [
    "--wiredTigerCacheSizeGB", "2",
    "--maxConns", "200",
    "--oplogSize", "1024"
  ]
```

#### **查询性能监控**
```javascript
// MongoDB慢查询监控
db.setProfilingLevel(1, { slowms: 100 });

// 创建复合索引优化常见查询
db.jobs.createIndex(
  { "status": 1, "createdAt": -1, "company": 1 },
  { background: true }
);

// 分片键选择 (如果需要分片)
sh.shardCollection("ai-recruitment.jobs", { "_id": "hashed" });
```

### **3. NATS消息队列优化**

#### **JetStream配置优化**
```yaml
nats:
  command: [
    "--jetstream",
    "--store_dir", "/data",
    "--max_memory", "1G",
    "--max_file_store", "10G"
  ]
```

#### **消息处理优化**
```typescript
// 批量消息处理
@Injectable()
export class JobEventsProcessor {
  private messageBuffer: JobEvent[] = [];
  
  @Interval(1000) // 每秒批量处理
  async processBatchMessages() {
    if (this.messageBuffer.length > 0) {
      const batch = this.messageBuffer.splice(0, 100);
      await this.processBatch(batch);
    }
  }
  
  async processBatch(events: JobEvent[]) {
    // 批量数据库操作
    const bulkOps = events.map(event => ({
      updateOne: {
        filter: { jobId: event.jobId },
        update: { $set: event.data },
        upsert: true
      }
    }));
    
    await this.jobModel.bulkWrite(bulkOps);
  }
}
```

---

## 🏗️ **基础设施优化**

### **1. Docker容器优化**

#### **多阶段构建优化**
```dockerfile
# 优化的Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# 利用Docker层缓存
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init

# 非root用户运行
USER node
WORKDIR /app

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

#### **资源限制**
```yaml
# docker-compose.yml资源限制
services:
  app-gateway:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    ulimits:
      nofile: 65536
```

### **2. 负载均衡配置**

#### **Nginx反向代理**
```nginx
# nginx.conf负载均衡配置
upstream app_backend {
    least_conn;
    server app-gateway-1:3000 weight=3;
    server app-gateway-2:3000 weight=2;
    server app-gateway-3:3000 weight=1 backup;
    
    keepalive 32;
}

server {
    listen 80;
    
    # 连接池优化
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    
    # 缓存配置
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_cache nginx_cache;
        proxy_cache_valid 200 1y;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://app_backend;
        proxy_cache_bypass $http_cache_control;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### **3. CDN和静态资源优化**

#### **前端构建优化**
```json
// angular.json构建优化
{
  "projects": {
    "ai-recruitment-frontend": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "optimization": true,
              "outputHashing": "all",
              "sourceMap": false,
              "namedChunks": false,
              "aot": true,
              "extractLicenses": true,
              "vendorChunk": false,
              "buildOptimizer": true,
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

---

## 📈 **性能监控与告警**

### **1. 应用性能指标**
```typescript
// 自定义性能指标
@Injectable()
export class PerformanceMetrics {
  private readonly promClient = require('prom-client');
  
  private httpDuration = new this.promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5]
  });
  
  recordHttpRequest(method: string, route: string, status: number, duration: number) {
    this.httpDuration.labels(method, route, status.toString()).observe(duration);
  }
}
```

### **2. 数据库性能监控**
```javascript
// MongoDB性能监控
const mongoStats = {
  connections: db.serverStatus().connections,
  operations: db.serverStatus().opcounters,
  memory: db.serverStatus().mem,
  locks: db.serverStatus().locks
};
```

---

## 🔧 **实施建议**

### **优先级排序**
1. **P0 (关键)**: 数据库索引优化、缓存实现
2. **P1 (重要)**: 连接池配置、Docker资源限制  
3. **P2 (改进)**: 负载均衡、CDN集成
4. **P3 (优化)**: 高级缓存策略、微服务拆分

### **性能测试流程**
1. **基线测试**: 记录当前性能指标
2. **优化实施**: 按优先级逐步实施
3. **对比测试**: 验证优化效果
4. **持续监控**: 建立性能监控体系

### **风险控制**
- 在测试环境先验证优化效果
- 实施金丝雀部署策略
- 建立回滚机制
- 监控业务指标变化