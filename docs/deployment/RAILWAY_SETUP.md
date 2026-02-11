# Railway 生产环境部署配置指南

## 🚀 必需的Railway服务配置

### 1. 数据库服务添加

在Railway项目中添加以下插件：

#### MongoDB 数据库
```bash
# Railway控制台操作
1. 进入Railway项目
2. 点击 "New" → "Database" → "Add MongoDB"
3. 等待MongoDB服务创建完成
4. 记录生成的环境变量: MONGO_URL
```

#### Redis 缓存
```bash
# Railway控制台操作  
1. 点击 "New" → "Database" → "Add Redis"
2. 等待Redis服务创建完成
3. 记录生成的环境变量: REDIS_URL, REDISHOST, REDISPORT
```

### 2. 必需的环境变量配置

在Railway项目的Environment Variables中设置：

```bash
# 应用配置
NODE_ENV=production
PORT=3000
API_PREFIX=api

# 数据库连接 (Railway自动生成)
MONGO_URL=mongodb://...  # MongoDB服务自动提供
REDIS_URL=redis://...    # Redis服务自动提供

# 应用功能开关
SKIP_MONGO_CONNECTION=false
USE_REDIS_CACHE=true
ENABLE_COMPRESSION=true

# 安全配置
ALLOWED_ORIGINS=https://ai-recruitment-clerk-production.up.railway.app

# 性能优化
NODE_OPTIONS=--max-old-space-size=1024
```

### 3. Railway服务依赖配置

确保服务启动顺序：
1. MongoDB 数据库
2. Redis 缓存  
3. AI招聘助手应用

### 4. 验证部署

部署完成后访问：
- 主页: https://ai-recruitment-clerk-production.up.railway.app
- 健康检查: https://ai-recruitment-clerk-production.up.railway.app/api/health
- API文档: https://ai-recruitment-clerk-production.up.railway.app/api/docs

## 🔧 故障排除

### 常见问题解决

1. **MongoDB连接失败**
   - 检查MONGO_URL环境变量是否正确设置
   - 确认MongoDB服务状态正常

2. **Redis连接失败**  
   - 检查REDIS_URL环境变量
   - 验证Redis服务状态

3. **应用启动失败**
   - 查看Railway日志
   - 确认dist/apps/app-gateway/main.js文件存在

## 📊 监控与维护

- 监控MongoDB和Redis服务状态
- 定期检查应用日志
- 关注内存和CPU使用率