#!/bin/bash
# Render快速部署脚本

echo "🎨 开始Render部署流程..."

# 检查Render CLI
if ! command -v render &> /dev/null; then
    echo "安装Render CLI..."
    npm install -g @render/cli
fi

# 登录Render
echo "请完成Render登录..."
render auth login

# 创建项目从GitHub
echo "从GitHub创建Render项目..."
echo "请访问: https://dashboard.render.com/select-repo"
echo "选择您的 AI-Recruitment-Clerk 仓库"
echo ""

# 提供环境变量设置指导
echo "📋 需要在Render控制台设置的环境变量:"
echo ""
echo "🔐 安全密钥 (自动生成):"
echo "   JWT_SECRET=随机64字符"
echo "   JWT_REFRESH_SECRET=随机64字符" 
echo "   ENCRYPTION_KEY=随机32字符"
echo ""
echo "🤖 API密钥 (手动设置):"
echo "   GEMINI_API_KEY=your_actual_gemini_api_key"
echo ""
echo "💾 数据库 (自动配置):"
echo "   DATABASE_URL=自动从PostgreSQL服务获取"
echo "   REDIS_URL=自动从Redis服务获取"
echo ""

# 生成环境变量
echo "🔑 自动生成的安全密钥:"
echo "JWT_SECRET=$(openssl rand -base64 64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo ""

echo "✅ 配置完成！"
echo "🌐 部署后的访问地址:"
echo "   Frontend: https://ai-recruitment-frontend.onrender.com"
echo "   API: https://ai-recruitment-gateway.onrender.com"