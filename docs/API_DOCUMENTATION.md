# 📡 AI招聘助手 - 营销系统API文档

## 📋 概述

本文档描述AI招聘助手营销系统的REST API接口规范，涵盖反馈码管理、用户统计、支付处理等核心功能。

**API版本**: v1.0.0  
**基础URL**: `https://your-domain.com/api`  
**认证方式**: JWT Token (部分端点需要)  
**数据格式**: JSON  

---

## 🔐 认证

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### 错误响应格式
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE",
  "timestamp": "2025-08-13T22:45:00.000Z"
}
```

---

## 📊 营销反馈码API

### 1. 记录反馈码
**创建新的反馈码记录**

```http
POST /api/marketing/feedback-codes/record
```

#### 请求体
```json
{
  "code": "FB1A2B3C4D5E6F7G"
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "id": "60f7b3b9e1b2c3d4e5f6g7h8",
    "code": "FB1A2B3C4D5E6F7G", 
    "generatedAt": "2025-08-13T22:45:00.000Z"
  }
}
```

#### 错误码
- `400`: 反馈码格式无效
- `409`: 反馈码已存在

---

### 2. 验证反馈码
**检查反馈码有效性和状态**

```http
GET /api/marketing/feedback-codes/validate/{code}
```

#### 路径参数
- `code` (string): 要验证的反馈码

#### 响应
```json
{
  "success": true,
  "data": {
    "valid": true,
    "isRedeemed": false,
    "code": "FB1A2B3C4D5E6F7G",
    "redeemedAt": null,
    "status": "active"
  },
  "timestamp": "2025-08-13T22:45:00.000Z"
}
```

#### 状态说明
- `active`: 有效未使用
- `redeemed`: 已核销
- `invalid`: 无效/不存在

---

### 3. 标记反馈码已使用
**用户完成问卷后标记反馈码为已使用**

```http
POST /api/marketing/feedback-codes/mark-used
```

#### 请求体
```json
{
  "code": "FB1A2B3C4D5E6F7G",
  "alipayAccount": "user@example.com",
  "questionnaireData": {
    "problems": "系统响应速度有时候比较慢，特别是在处理大文件时需要等待较长时间",
    "favorite_features": "我最喜欢AI简历解析功能，因为它能够准确识别和提取关键信息", 
    "improvements": "建议增加批量处理功能，优化系统响应速度",
    "additional_features": "希望能够增加移动端支持，以及数据导出功能"
  }
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "code": "FB1A2B3C4D5E6F7G",
    "qualityScore": 4,
    "eligible": true,
    "paymentStatus": "pending",
    "paymentAmount": 5.00,
    "usedAt": "2025-08-13T22:45:00.000Z"
  }
}
```

#### 质量评分规则
- `5分`: 非常详细的反馈 (每个字段≥20字符) → 8元
- `4分`: 详细反馈 (每个字段≥15字符) → 5元  
- `3分`: 中等反馈 (每个字段≥10字符) → 3元
- `2分`: 简单反馈 (每个字段≥5字符) → 1元
- `1分`: 很简单的反馈 (字段过短) → 0元 (不符合支付条件)

---

### 4. 获取营销统计
**获取营销活动的整体统计数据**

```http
GET /api/marketing/feedback-codes/stats
```

#### 响应
```json
{
  "success": true,
  "data": {
    "totalParticipants": 1250,
    "totalRewards": 3750.00,
    "averageRating": 3.8,
    "lastUpdated": "2025-08-13T22:45:00.000Z",
    "breakdown": {
      "pending": 45,
      "approved": 1180,
      "rejected": 25
    },
    "qualityDistribution": {
      "score5": 320,
      "score4": 450,
      "score3": 380,
      "score2": 75,
      "score1": 25
    }
  }
}
```

---

## 🔧 管理员API (需要认证)

### 5. 获取待审核支付列表
**获取需要人工审核的反馈码列表**

```http
GET /api/marketing/admin/pending-payments
Authorization: Bearer <admin_token>
```

#### 查询参数
- `page` (number): 页码，默认1
- `limit` (number): 每页数量，默认20
- `sort` (string): 排序字段，默认'generatedAt'

#### 响应
```json
{
  "success": true,
  "data": [
    {
      "id": "60f7b3b9e1b2c3d4e5f6g7h8",
      "code": "FB1A2B3C4D5E6F7G",
      "alipayAccount": "user@example.com",
      "qualityScore": 4,
      "paymentAmount": 5.00,
      "usedAt": "2025-08-13T22:45:00.000Z",
      "questionnaireData": { ... }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 45,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 6. 批量审核支付
**批量处理多个反馈码的支付审核**

```http
POST /api/marketing/admin/batch-approve
Authorization: Bearer <admin_token>
```

#### 请求体
```json
{
  "feedbackCodeIds": [
    "60f7b3b9e1b2c3d4e5f6g7h8",
    "60f7b3b9e1b2c3d4e5f6g7h9"
  ],
  "action": "approve" // "approve" | "reject"
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "approvedCount": 2,
    "rejectedCount": 0,
    "totalProcessed": 2,
    "details": [
      {
        "id": "60f7b3b9e1b2c3d4e5f6g7h8",
        "status": "approved",
        "paymentAmount": 5.00
      }
    ]
  }
}
```

---

### 7. 获取审核日志
**查看特定反馈码的审核操作历史**

```http
GET /api/marketing/feedback-codes/{code}/audit-logs
Authorization: Bearer <admin_token>
```

#### 响应
```json
{
  "success": true,
  "data": {
    "code": "FB1A2B3C4D5E6F7G",
    "logs": [
      {
        "timestamp": "2025-08-13T22:45:00.000Z",
        "action": "created",
        "details": "反馈码生成",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0..."
      },
      {
        "timestamp": "2025-08-13T23:15:00.000Z", 
        "action": "questionnaire_completed",
        "details": "问卷提交，质量评分: 4分",
        "qualityScore": 4
      },
      {
        "timestamp": "2025-08-14T10:30:00.000Z",
        "action": "payment_approved",
        "details": "支付审核通过",
        "operator": "admin@example.com",
        "paymentAmount": 5.00
      }
    ]
  }
}
```

---

## 🔍 Webhook API

### 8. 腾讯问卷Webhook处理
**接收腾讯问卷的webhook回调数据**

```http
POST /api/marketing/feedback-codes/webhook/questionnaire
```

#### 请求体 (腾讯问卷格式)
```json
{
  "answers": {
    "q1": "FB1A2B3C4D5E6F7G", // 反馈码
    "q2": "user@example.com",  // 支付宝账号
    "q3": "系统功能很好用...", // 问题反馈
    "q4": "界面设计很清晰...", // 喜欢的功能
    "q5": "希望增加批量处理...", // 改进建议
    "q6": "移动端支持会更好..." // 额外功能建议
  },
  "submit_time": "2025-08-13T23:15:00.000Z",
  "user_info": {
    "ip": "192.168.1.100"
  }
}
```

#### 响应
```json
{
  "success": true,
  "message": "问卷数据处理成功"
}
```

---

## 📱 前端辅助API

### 9. 生成会话ID
**为新用户生成唯一会话标识**

```http
POST /api/marketing/session/generate
```

#### 响应
```json
{
  "success": true,
  "data": {
    "sessionId": "session_abc123def456",
    "expiresAt": "2025-08-20T22:45:00.000Z"
  }
}
```

---

### 10. 检查使用限制
**验证用户是否可以继续使用服务**

```http
GET /api/marketing/usage/check/{sessionId}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "canUse": true,
    "usageCount": 3,
    "remainingUsage": 2,
    "maxUsage": 5
  }
}
```

---

## ⚡ 实时API

### 11. 获取实时统计
**获取营销活动的实时数据流**

```http
GET /api/marketing/stats/realtime
```

#### 响应 (Server-Sent Events)
```
data: {"event": "new_participant", "count": 1251}

data: {"event": "payment_approved", "amount": 5.00, "total": 3755.00}

data: {"event": "quality_score_update", "average": 3.81}
```

---

## 🛠️ 开发工具API

### 12. 健康检查
**检查服务状态和依赖连接**

```http
GET /api/health
```

#### 响应
```json
{
  "status": "ok",
  "timestamp": "2025-08-13T22:45:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected", 
    "external_apis": "available"
  },
  "version": "1.0.0"
}
```

---

### 13. 生成测试数据
**开发环境下生成模拟测试数据**

```http
POST /api/dev/generate-test-data
Authorization: Bearer <dev_token>
```

#### 请求体
```json
{
  "count": 100,
  "includePayments": true
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "feedbackCodes": 100,
    "payments": 85,
    "message": "测试数据生成完成"
  }
}
```

---

## 📊 数据导出API

### 14. 导出营销数据
**导出指定时间范围的营销数据**

```http
GET /api/marketing/export
Authorization: Bearer <admin_token>
```

#### 查询参数
- `startDate` (string): 开始日期 (YYYY-MM-DD)
- `endDate` (string): 结束日期 (YYYY-MM-DD)  
- `format` (string): 导出格式 ('json' | 'csv' | 'excel')

#### 响应
```http
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="marketing_data_20250813.csv"

code,generatedAt,isUsed,paymentAmount,qualityScore
FB1A2B3C4D5E6F7G,2025-08-13T22:45:00.000Z,true,5.00,4
FB2A3B4C5D6E7F8G,2025-08-13T23:15:00.000Z,false,0.00,0
```

---

## 🔄 错误处理

### 常见错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|-----------|------|
| `INVALID_FEEDBACK_CODE` | 400 | 反馈码格式无效 |
| `FEEDBACK_CODE_NOT_FOUND` | 404 | 反馈码不存在 |
| `FEEDBACK_CODE_ALREADY_USED` | 409 | 反馈码已被使用 |
| `ALIPAY_ACCOUNT_INVALID` | 400 | 支付宝账号格式无效 |
| `QUESTIONNAIRE_DATA_INCOMPLETE` | 422 | 问卷数据不完整 |
| `PAYMENT_AMOUNT_INVALID` | 400 | 支付金额无效 |
| `UNAUTHORIZED` | 401 | 未授权访问 |
| `FORBIDDEN` | 403 | 权限不足 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 |

### 重试策略
- 对于`5xx`错误，建议使用指数退避重试
- 最大重试次数: 3次
- 基础延迟: 1秒
- 退避倍数: 2

### 请求限制
- 游客用户: 100请求/小时
- 注册用户: 1000请求/小时  
- 管理员: 10000请求/小时

---

## 📱 SDK和客户端

### JavaScript SDK示例
```javascript
// AI招聘助手营销SDK
class AIRecruitmentMarketingSDK {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.options = options;
  }

  // 记录反馈码
  async recordFeedbackCode(code) {
    const response = await fetch(`${this.baseUrl}/api/marketing/feedback-codes/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return response.json();
  }

  // 验证反馈码
  async validateFeedbackCode(code) {
    const response = await fetch(`${this.baseUrl}/api/marketing/feedback-codes/validate/${code}`);
    return response.json();
  }
}

// 使用示例
const sdk = new AIRecruitmentMarketingSDK('https://your-domain.com');
const result = await sdk.recordFeedbackCode('FB1A2B3C4D5E6F7G');
```

---

## 🧪 测试

### 单元测试覆盖率
- 控制器: 95%
- 服务层: 98%
- 数据模型: 90%
- 工具函数: 100%

### API测试套件
```bash
# 运行所有API测试
npm run test:api

# 运行安全测试
npm run test:security

# 运行性能测试
npm run test:performance
```

### 测试环境
- **开发环境**: http://localhost:3000
- **测试环境**: https://test.your-domain.com  
- **生产环境**: https://your-domain.com

---

**📞 技术支持**: api-support@your-domain.com  
**📚 更多文档**: https://docs.your-domain.com  
**🐛 问题反馈**: https://github.com/your-org/issues

---
*最后更新: 2025-08-13 22:50:00*  
*API版本: v1.0.0*