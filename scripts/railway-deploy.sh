#!/bin/bash
# Railway CLI快速部署脚本

echo "🚀 开始Railway部署流程..."

# 检查Railway CLI
if ! command -v railway &> /dev/null; then
    echo "安装Railway CLI..."
    npm install -g @railway/cli
fi

# 登录Railway
echo "请完成Railway登录..."
railway login

# 创建新项目
echo "创建Railway项目..."
railway create ai-recruitment-clerk

# 链接项目
railway link

# 设置环境变量
echo "配置环境变量..."
railway variables set NODE_ENV=production
railway variables set MONGODB_ROOT_USER=admin
railway variables set MONGODB_ROOT_PASSWORD=$(openssl rand -base64 32)
railway variables set MONGODB_DATABASE=ai-recruitment
railway variables set REDIS_PASSWORD=$(openssl rand -base64 32)
railway variables set NATS_AUTH_TOKEN=$(openssl rand -base64 32)
railway variables set JWT_SECRET=$(openssl rand -base64 64)
railway variables set JWT_REFRESH_SECRET=$(openssl rand -base64 64)
railway variables set ENCRYPTION_KEY=$(openssl rand -base64 32)

# 提示用户设置API密钥
echo "⚠️  请手动设置以下环境变量:"
echo "   GEMINI_API_KEY=你的Gemini API密钥"
echo ""
echo "可以通过以下命令设置:"
echo "   railway variables set GEMINI_API_KEY=your_actual_api_key"
echo ""

# 部署项目
echo "开始部署..."
railway up --dockerfile apps/app-gateway/Dockerfile

echo "✅ 部署完成!"
echo "🌐 访问地址将在Railway控制台显示"