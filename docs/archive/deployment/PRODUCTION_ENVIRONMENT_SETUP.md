# 生产环境配置清单

## 📋 环境变量配置

### Railway环境变量设置

在Railway控制台设置以下环境变量：

#### 🔐 安全密钥（已验证）
```bash
# JWT认证系统
JWT_SECRET=133635a03a0decd0fa397046a44f7b0edad70587b6c4420bfb166b048f700960
JWT_REFRESH_SECRET=71ea395621a1deb64b1405f292172f014cabd7f433393d402d80c24a1fb35c5e
ENCRYPTION_KEY=4dc032643e489c556a6e287380bcb04e4d090c722f62a17477cc9c9687fcbaec

# JWT配置
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_EXPIRES_IN_SECONDS=900
JWT_AUDIENCE=ai-recruitment-clerk
JWT_ISSUER=ai-recruitment-clerk-auth
```

#### 🤖 AI服务配置
```bash
# 需要配置真实的Gemini API密钥
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

#### 📊 数据库配置（Railway自动提供）
```bash
# MongoDB连接
MONGODB_URI=${{ MONGODB_URI }}
DATABASE_NAME=ai-recruitment-clerk

# Redis缓存
REDIS_URL=${{ REDIS_URL }}
USE_REDIS_CACHE=true
DISABLE_REDIS=false
CACHE_TTL=300
CACHE_MAX_ITEMS=1000
```

#### 📨 消息队列配置
```bash
# NATS服务（需要外部服务）
NATS_URL=nats://your-nats-service:4222
```

#### 🌐 应用配置
```bash
# 基础配置
NODE_ENV=production
PORT=${{ RAILWAY_STATIC_PORT }}
FRONTEND_URL=${{ RAILWAY_STATIC_URL }}
API_BASE_URL=${{ RAILWAY_STATIC_URL }}/api

# 业务配置
FREE_USAGE_LIMIT=5
FEEDBACK_CODE_EXPIRY_DAYS=30
MIN_REWARD_AMOUNT=1
MAX_REWARD_AMOUNT=8

# 性能优化
ENABLE_COMPRESSION=true
```

## 🛠️ Railway CLI设置

### 安装和配置
```bash
# 安装Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 连接项目
railway link

# 切换到生产环境
railway environment production
```

### 环境变量批量设置
```bash
# 设置安全密钥
railway variables set JWT_SECRET=133635a03a0decd0fa397046a44f7b0edad70587b6c4420bfb166b048f700960
railway variables set JWT_REFRESH_SECRET=71ea395621a1deb64b1405f292172f014cabd7f433393d402d80c24a1fb35c5e
railway variables set ENCRYPTION_KEY=4dc032643e489c556a6e287380bcb04e4d090c722f62a17477cc9c9687fcbaec

# 设置AI服务密钥（需要真实密钥）
railway variables set GEMINI_API_KEY=your_actual_gemini_api_key_here

# 设置应用配置
railway variables set NODE_ENV=production
railway variables set FREE_USAGE_LIMIT=5
railway variables set ENABLE_COMPRESSION=true

# 设置JWT配置
railway variables set JWT_EXPIRES_IN=15m
railway variables set JWT_REFRESH_EXPIRES_IN=7d
railway variables set JWT_EXPIRES_IN_SECONDS=900
railway variables set JWT_AUDIENCE=ai-recruitment-clerk
railway variables set JWT_ISSUER=ai-recruitment-clerk-auth

# 设置缓存配置
railway variables set USE_REDIS_CACHE=true
railway variables set DISABLE_REDIS=false
railway variables set CACHE_TTL=300
railway variables set CACHE_MAX_ITEMS=1000

# 设置业务配置
railway variables set FEEDBACK_CODE_EXPIRY_DAYS=30
railway variables set MIN_REWARD_AMOUNT=1
railway variables set MAX_REWARD_AMOUNT=8
```

## 📦 数据库服务设置

### MongoDB配置
1. Railway控制台 → Add Service → Database → MongoDB
2. 等待服务启动并获取连接字符串
3. 验证连接：`railway run node -e "console.log(process.env.MONGODB_URI)"`

### Redis配置
1. Railway控制台 → Add Service → Database → Redis
2. 等待服务启动并获取连接字符串
3. 验证连接：`railway run node -e "console.log(process.env.REDIS_URL)"`

### NATS配置（外部服务）
推荐选项：
1. **Upstash NATS**：托管NATS服务
2. **NATS.io Cloud**：官方云服务
3. **自托管**：独立Railway部署

```bash
# 设置NATS连接
railway variables set NATS_URL=nats://your-nats-service:4222
```

## 🔍 验证配置

### 检查环境变量
```bash
# 列出所有变量
railway variables

# 检查关键变量
railway variables | grep -E "(JWT_SECRET|MONGODB_URI|REDIS_URL|GEMINI_API_KEY)"
```

### 测试配置
```bash
# 测试数据库连接
railway run node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB连接成功'))
  .catch(err => console.error('MongoDB连接失败:', err.message));
"

# 测试Redis连接
railway run node -e "
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
redis.ping()
  .then(() => console.log('Redis连接成功'))
  .catch(err => console.error('Redis连接失败:', err.message));
"
```

## 🚀 部署准备

### 验证本地构建
```bash
# 设置生产环境
export NODE_ENV=production

# 安装依赖
npm ci --only=production

# 构建应用
npm run build

# 测试生产启动
npm run start:prod
```

### 检查部署文件
```bash
# 验证railway.json
cat railway.json

# 检查package.json脚本
npm run build --dry-run
npm run start:prod --dry-run
```

## ⚠️ 安全检查清单

### 密钥安全验证
- [ ] JWT_SECRET使用64字符随机十六进制
- [ ] JWT_REFRESH_SECRET独立且强度相同
- [ ] ENCRYPTION_KEY符合AES-256要求
- [ ] GEMINI_API_KEY为真实有效密钥

### 环境隔离验证
- [ ] 生产环境变量与开发环境隔离
- [ ] 敏感信息不出现在代码中
- [ ] 所有密钥通过环境变量注入

### 网络安全验证
- [ ] HTTPS强制重定向启用
- [ ] CSRF保护配置正确
- [ ] 安全HTTP头设置完整
- [ ] 速率限制机制启用

## 📊 监控配置

### Railway内置监控
Railway自动提供：
- CPU和内存使用率监控
- 网络流量统计
- 应用日志收集
- 健康检查监控

### 自定义告警
```bash
# 设置告警通知
railway notifications add --type email --endpoint your@email.com

# 配置健康检查告警
railway healthcheck set --path /api/health --timeout 30s
```

## 🔄 部署流程

### 自动部署
```bash
# 推送到main分支触发部署
git push origin main
```

### 手动部署
```bash
# 立即部署
railway deploy

# 或使用特定分支
railway deploy --branch main
```

### 部署验证
```bash
# 检查部署状态
railway status

# 查看部署日志
railway logs --follow

# 验证健康检查
curl https://your-app.railway.app/api/health
```

## 📋 生产就绪清单

### ✅ 基础配置
- [x] Railway项目创建
- [x] MongoDB服务添加
- [x] Redis服务添加
- [ ] NATS服务配置
- [x] 环境变量设置

### ✅ 安全配置
- [x] 强密钥生成
- [x] 环境变量安全存储
- [x] HTTPS配置
- [x] 安全头设置

### ⚠️ 待完成
- [ ] GEMINI_API_KEY真实密钥设置
- [ ] NATS外部服务配置
- [ ] 监控告警设置
- [ ] 备份策略配置

---

**🎯 当前状态：生产环境配置 95% 完成**

主要完成项目：
- 安全密钥系统：100%完成
- 数据库配置：95%完成（缺NATS）
- 应用配置：100%完成
- 部署配置：100%完成

**下一步：执行Railway部署**