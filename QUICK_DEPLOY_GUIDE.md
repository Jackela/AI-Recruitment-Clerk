# 🚀 AI招聘助手 - 一键部署指南

## 🎯 最快部署方案 (推荐Railway)

### 第1步: 准备工作 (2分钟)

1. **获取Gemini API密钥**
   - 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
   - 创建免费API密钥
   - 保存密钥备用

2. **推送代码到GitHub** (如果尚未推送)
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

### 第2步: Railway一键部署 (5分钟)

1. **访问 [railway.app](https://railway.app)**

2. **GitHub登录并授权**

3. **创建新项目**
   - 点击 "Deploy from GitHub repo"
   - 选择 `AI-Recruitment-Clerk` 仓库
   - Railway自动检测Dockerfile

4. **配置环境变量**
   ```bash
   # 复制以下变量到Railway环境变量设置
   
   # 必需配置
   NODE_ENV=production
   GEMINI_API_KEY=你的Gemini_API密钥
   
   # 数据库配置 (自动生成安全密码)
   MONGODB_ROOT_USER=admin
   MONGODB_ROOT_PASSWORD=<点击generate生成>
   MONGODB_DATABASE=ai-recruitment
   
   # 安全密钥 (自动生成)
   JWT_SECRET=<点击generate生成64字符>
   JWT_REFRESH_SECRET=<点击generate生成64字符>
   ENCRYPTION_KEY=<点击generate生成32字符>
   
   # 其他服务密码
   REDIS_PASSWORD=<点击generate生成>
   NATS_AUTH_TOKEN=<点击generate生成>
   ```

5. **部署启动**
   - 点击 "Deploy" 按钮
   - 等待5-10分钟完成构建
   - 获得访问链接: `https://your-app.railway.app`

### 第3步: 验证部署 (2分钟)

1. **访问应用**
   - 打开Railway提供的URL
   - 应该看到AI招聘助手登录页面

2. **健康检查**
   - 访问 `https://your-app.railway.app/api/health`
   - 应该返回 `{"status":"ok"}`

3. **注册测试账户**
   - 使用任意邮箱注册
   - 测试基本功能

## 🔧 故障排除

### 常见问题

**问题1: 部署失败**
```bash
解决方案:
1. 检查Dockerfile是否存在
2. 确认所有环境变量已设置
3. 查看Railway构建日志
```

**问题2: 数据库连接失败**
```bash
解决方案:
1. 确认MONGODB_ROOT_PASSWORD已设置
2. 检查MongoDB服务状态
3. 验证数据库URL格式
```

**问题3: API响应错误**
```bash
解决方案:
1. 验证GEMINI_API_KEY是否有效
2. 检查JWT_SECRET是否设置
3. 查看应用日志
```

### 监控和维护

1. **Railway控制台**
   - 实时日志查看
   - 性能监控
   - 环境变量管理

2. **应用监控**
   - 健康检查: `/api/health`
   - 系统状态: `/api/system/status`
   - 错误日志监控

## 🎉 部署完成!

恭喜! 你的AI招聘助手现在已经可以在生产环境中使用了。

**访问地址:** `https://your-app.railway.app`

**主要功能:**
- ✅ 用户注册/登录
- ✅ 简历上传和AI解析
- ✅ 职位描述分析
- ✅ 智能匹配评分
- ✅ 报告生成
- ✅ 企业级安全

**接下来可以:**
- 设置自定义域名
- 配置SSL证书
- 设置监控告警
- 扩展服务器资源

## 📞 技术支持

如遇到部署问题，请提供:
1. Railway部署日志
2. 错误截图
3. 环境变量配置 (隐藏敏感信息)

Happy coding! 🚀