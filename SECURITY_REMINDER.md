# 🔒 安全提醒

## ⚠️ 重要：环境变量安全

在部署到Railway时，**绝不要**在代码中硬编码任何敏感信息：

### ❌ 绝不要提交的内容
- 数据库密码
- API密钥
- JWT秘钥
- 第三方服务凭据

### ✅ 正确做法
1. 使用Railway环境变量界面设置所有敏感信息
2. 文档中只使用占位符 `YOUR_PASSWORD`、`YOUR_API_KEY` 等
3. 定期轮换敏感凭据

### 🚨 如果不慎泄露
1. 立即轮换/重置受影响的凭据
2. 检查访问日志
3. 更新所有使用该凭据的应用

## Railway环境变量设置
```bash
railway variables set MONGODB_URI=mongodb+srv://YOUR_ACTUAL_USERNAME:YOUR_ACTUAL_PASSWORD@cluster.mongodb.net/ai-recruitment
railway variables set JWT_SECRET=your_actual_32_character_secret
railway variables set GEMINI_API_KEY=your_actual_gemini_key
```