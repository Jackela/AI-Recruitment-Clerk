# Railway Environment Variables Setup Guide

## Database Variables (从服务中引用)

### MongoDB Configuration
1. 创建变量引用: `MONGODB_URL`
   - **选择**: `MONGO_URL` from MongoDB service
   - **用途**: 完整的MongoDB连接字符串

### Redis Configuration  
1. 创建变量引用: `REDIS_URL`
   - **选择**: `REDIS_PRIVATE_URL` or `REDIS_URL` from Redis service
   - **用途**: Redis连接字符串

## Manual Environment Variables (手动添加)

### Required Security Variables
```bash
# JWT Configuration (必需)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
JWT_EXPIRES_IN=1h

# Google Gemini API (必需)
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### Application Configuration  
```bash
# Environment
NODE_ENV=production

# Server (自动设置)
PORT=${{ RAILWAY_STATIC_PORT }}

# Cache & Performance
USE_REDIS_CACHE=true
ENABLE_COMPRESSION=true

# NATS (暂时使用默认)
NATS_URL=nats://localhost:4222
```

## Setup Steps

1. **Database Service Variables** (服务引用):
   - MONGODB_URL → 选择 `MONGO_URL` 
   - REDIS_URL → 选择 `REDIS_PRIVATE_URL` 

2. **Manual Variables** (手动添加):
   - JWT_SECRET
   - GEMINI_API_KEY
   - NODE_ENV=production
   - USE_REDIS_CACHE=true
   - ENABLE_COMPRESSION=true

3. **Auto-configured** (已配置):
   - PORT (Railway自动设置)

## Security Notes

- **JWT_SECRET**: 至少32字符，使用随机生成
- **GEMINI_API_KEY**: 从Google AI Studio获取
- **数据库连接**: 通过Railway服务自动配置

## Verification

部署后访问: `https://your-app.railway.app/api/health`