# 🚀 Railway 部署指南

## 📋 **部署前准备**

### ✅ **验证本地修复**
```bash
# 1. 运行验证脚本
node scripts/validate-fixes.js

# 2. 测试构建
npm run build:check

# 3. 测试Docker构建（可选）
docker-compose -f docker-compose.debug.yml build app-gateway
```

### 🔧 **环境变量配置**

在 Railway 项目中设置以下环境变量：

#### 🔐 **必需变量**
```bash
# JWT 认证密钥（使用强密钥）
JWT_SECRET=your_secure_jwt_secret_here

# Google Gemini API（用于AI功能）
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB 连接（Railway MongoDB 插件）
MONGO_URL=mongodb://username:password@host:port/database
```

#### 🗄️ **数据库设置**
Railway 提供 MongoDB 插件：
1. 在项目中添加 MongoDB 插件
2. Railway 会自动设置 `MONGO_URL` 环境变量
3. 无需额外配置

#### 📡 **消息队列设置**
Railway 提供 NATS 支持：
1. 添加 NATS 服务或使用外部服务
2. 设置 `NATS_URL` 环境变量
3. 格式：`nats://host:4222`

#### ⚙️ **可选配置**
```bash
# 缓存配置（生产环境建议启用Redis）
USE_REDIS_CACHE=true
DISABLE_REDIS=false

# 性能优化
ENABLE_COMPRESSION=true
NODE_ENV=production
```

## 🚀 **部署步骤**

### 1️⃣ **连接 GitHub**
1. 在 Railway 控制台创建新项目
2. 连接你的 GitHub 仓库
3. 选择 `main` 分支

### 2️⃣ **配置构建**
Railway 会自动检测并使用：
- `package.json` 中的构建脚本
- `nixpacks.toml` 配置（如果存在）
- `railway.json` 部署配置

### 3️⃣ **环境变量设置**
在 Railway 项目设置中添加：
```bash
NODE_ENV=production
JWT_SECRET=<你的密钥>
GEMINI_API_KEY=<你的API密钥>
MONGO_URL=<MongoDB连接串>
NATS_URL=<NATS连接串>
```

### 4️⃣ **触发部署**
1. 推送代码到 `main` 分支
2. Railway 自动触发构建和部署
3. 查看构建日志确认成功

## 🔍 **验证部署**

### 🌐 **健康检查**
```bash
# 检查API健康状态
curl https://your-app.railway.app/api/health

# 检查缓存指标
curl https://your-app.railway.app/api/cache/metrics

# 访问API文档
https://your-app.railway.app/api/docs
```

### 📊 **预期响应**
```json
{
  "status": "ok",
  "timestamp": "2025-08-14T...",
  "service": "app-gateway",
  "database": {
    "status": "healthy",
    "jobCount": 0
  },
  "messaging": {
    "status": "connected",
    "provider": "NATS JetStream"
  },
  "features": {
    "authentication": "enabled",
    "authorization": "enabled",
    "cache": "enabled"
  }
}
```

## 🛠️ **故障排除**

### 🚨 **常见问题**

#### ❌ **构建失败**
```bash
# 检查 package.json 脚本
npm run build  # 本地测试

# 检查 shared-dtos
cd libs/shared-dtos && npm run build
```

#### ❌ **数据库连接失败**
- 确认 `MONGO_URL` 格式正确
- 检查 MongoDB 服务状态
- 验证网络连接

#### ❌ **JWT 错误**
- 确认 `JWT_SECRET` 已设置且足够安全
- 检查环境变量拼写

#### ❌ **API 调用失败**
- 验证 `GEMINI_API_KEY` 有效性
- 检查 API 配额和限制

### 📝 **日志调试**
```bash
# Railway CLI 查看日志
railway logs

# 过滤错误日志
railway logs --filter error
```

## 📈 **性能优化**

### 🔥 **生产环境优化**
1. **启用压缩**: `ENABLE_COMPRESSION=true`
2. **配置缓存**: 使用 Redis 插件
3. **监控日志**: 设置日志级别为 `error,warn,log`
4. **健康检查**: 配置自动重启策略

### 🎯 **监控指标**
- 响应时间 < 500ms
- 内存使用 < 512MB
- CPU 使用率 < 80%
- 数据库连接池 < 10

## 🔧 **高级配置**

### 🌍 **多环境支持**
```json
// railway.json
{
  "environments": {
    "staging": {
      "variables": {
        "NODE_ENV": "staging",
        "JWT_SECRET": "${{ STAGING_JWT_SECRET }}"
      }
    },
    "production": {
      "variables": {
        "NODE_ENV": "production",
        "JWT_SECRET": "${{ PRODUCTION_JWT_SECRET }}"
      }
    }
  }
}
```

### 🔄 **自动部署**
设置 GitHub Webhook 实现：
- 推送到 `main` → 生产部署
- 推送到 `develop` → 测试环境部署

## 📚 **后续步骤**

1. ✅ **设置监控**: 集成 Sentry 或 Datadog
2. ✅ **备份策略**: 配置数据库自动备份
3. ✅ **SSL 证书**: Railway 自动提供 HTTPS
4. ✅ **域名配置**: 设置自定义域名
5. ✅ **扩容规划**: 根据使用情况调整资源

---

**部署成功后，您的 AI 招聘助理将在 Railway 上稳定运行！** 🎉

需要帮助？查看 Railway 文档或联系技术支持。