# Gemini API密钥配置指南

## 🔑 获取Gemini API密钥

### 步骤1: Google AI Studio注册
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 使用Google账号登录
3. 创建新的API密钥
4. 复制生成的API密钥

### 步骤2: 验证密钥有效性
```bash
# 测试API密钥（本地验证）
curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"
```

### 步骤3: 环境配置

#### 开发环境
```bash
# 更新.env.development
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

#### Railway生产环境
```bash
# 设置生产环境密钥
railway variables set GEMINI_API_KEY=your_actual_gemini_api_key_here

# 验证设置
railway variables | grep GEMINI_API_KEY
```

## 🧪 密钥验证脚本

创建验证脚本确保密钥工作正常：

```javascript
// scripts/verify-gemini-api.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function verifyGeminiAPI() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'your_actual_gemini_api_key_here') {
    console.error('❌ GEMINI_API_KEY未配置或使用占位符');
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent("测试连接");
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API连接成功');
    console.log('📝 测试响应:', text.substring(0, 100) + '...');
    return true;
  } catch (error) {
    console.error('❌ Gemini API连接失败:', error.message);
    return false;
  }
}

if (require.main === module) {
  verifyGeminiAPI().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = verifyGeminiAPI;
```

## 🔧 自动配置方案

### 临时降级方案
如果无法立即获取真实API密钥，可以实施降级处理：

```typescript
// libs/shared-dtos/src/gemini/gemini.client.ts
export class GeminiClient {
  private isConfigured(): boolean {
    const apiKey = process.env.GEMINI_API_KEY;
    return apiKey && apiKey !== 'your_actual_gemini_api_key_here';
  }

  async generateContent(prompt: string): Promise<string> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Gemini API未配置，使用模拟响应');
      return this.getMockResponse(prompt);
    }
    
    // 正常API调用
    return this.callGeminiAPI(prompt);
  }

  private getMockResponse(prompt: string): string {
    return `[模拟响应] 基于提示"${prompt.substring(0, 50)}..."生成的内容`;
  }
}
```

## 📋 配置检查清单

- [ ] Google AI Studio账号创建
- [ ] API密钥生成
- [ ] 本地环境配置
- [ ] 生产环境配置
- [ ] 密钥验证测试
- [ ] 降级机制实施（可选）