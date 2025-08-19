# NATS服务配置指南

## 🎯 NATS服务选项

### 选项1: Upstash NATS（推荐）
```bash
# 1. 注册Upstash账号
# 2. 创建NATS实例
# 3. 获取连接URL

# Railway环境变量设置
railway variables set NATS_URL=nats://your-upstash-nats-url:4222
```

### 选项2: 独立Railway部署
```yaml
# railway-nats.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "deploy": {
    "restartPolicyType": "on_failure"
  },
  "environments": {
    "production": {
      "variables": {
        "NATS_PORT": "4222"
      }
    }
  }
}
```

### 选项3: CloudAMQP NATS
```bash
# 使用CloudAMQP的NATS服务
NATS_URL=nats://username:password@host:4222
```

### 选项4: 降级模式（临时）
```typescript
// 配置NATS可选模式
export class NatsOptionalClient {
  private isAvailable = false;

  async connect() {
    try {
      // 尝试连接NATS
      await this.natsClient.connect();
      this.isAvailable = true;
    } catch {
      console.warn('NATS服务不可用，使用内存模式');
      this.isAvailable = false;
    }
  }

  async publish(subject: string, data: any) {
    if (this.isAvailable) {
      return this.natsClient.publish(subject, data);
    }
    // 降级到本地处理
    return this.handleLocally(subject, data);
  }
}
```

## 🔧 配置实施

### 更新环境变量模板
```bash
# .env.production
NATS_URL=nats://your-nats-service:4222
NATS_OPTIONAL=true  # 允许NATS可选
```

### 修改NATS客户端代码
```typescript
// apps/app-gateway/src/nats/nats.client.ts
export class NatsClient {
  private optional = process.env.NATS_OPTIONAL === 'true';

  async connect() {
    if (!process.env.NATS_URL) {
      if (this.optional) {
        this.logger.warn('NATS_URL未配置，跳过NATS连接');
        return;
      }
      throw new Error('NATS_URL required');
    }
    // 正常连接逻辑
  }
}
```

## 📋 配置检查清单

- [ ] 选择NATS服务提供商
- [ ] 获取连接URL
- [ ] 配置Railway环境变量
- [ ] 测试连接
- [ ] 配置降级模式（可选）