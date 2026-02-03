#!/bin/bash

# 🚀 AI招聘助手"凤凰计划" - 一键部署脚本
# 支持Ubuntu 20.04+ 系统自动部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查系统
check_system() {
    log_step "检查系统环境..."
    
    if [[ "$EUID" -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_info "安装curl..."
        sudo apt-get update
        sudo apt-get install -y curl
    fi
    
    log_info "系统检查完成"
}

# 收集配置信息
collect_config() {
    log_step "收集配置信息..."
    
    echo "请输入以下配置信息："
    
    read -p "域名 (例如: example.com): " DOMAIN
    if [[ -z "$DOMAIN" ]]; then
        DOMAIN="localhost"
        log_warn "未输入域名，使用默认值: localhost"
    fi
    
    read -p "MongoDB密码: " MONGODB_PASSWORD
    if [[ -z "$MONGODB_PASSWORD" ]]; then
        MONGODB_PASSWORD="ai_recruitment_$(date +%s)"
        log_warn "未输入MongoDB密码，自动生成: $MONGODB_PASSWORD"
    fi
    
    read -p "JWT密钥 (32位字符): " JWT_SECRET
    if [[ -z "$JWT_SECRET" ]]; then
        JWT_SECRET=$(openssl rand -base64 32)
        log_warn "未输入JWT密钥，自动生成"
    fi
    
    read -p "Gemini API Key: " GEMINI_API_KEY
    if [[ -z "$GEMINI_API_KEY" ]]; then
        log_warn "未输入Gemini API Key，请稍后手动配置"
    fi
    
    read -p "支付宝App ID (可选): " ALIPAY_APP_ID
    read -p "腾讯问卷URL (可选): " QUESTIONNAIRE_URL
    
    log_info "配置信息收集完成"
}

# 安装Node.js
install_nodejs() {
    log_step "安装Node.js 18..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_info "Node.js已安装: $NODE_VERSION"
        return
    fi
    
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    log_info "Node.js安装完成: $(node --version)"
}

# 安装MongoDB
install_mongodb() {
    log_step "安装MongoDB..."
    
    if command -v mongosh &> /dev/null; then
        log_info "MongoDB已安装"
        return
    fi
    
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    
    # 启动MongoDB
    sudo systemctl start mongod
    sudo systemctl enable mongod
    
    log_info "MongoDB安装完成"
}

# 安装Nginx
install_nginx() {
    log_step "安装Nginx..."
    
    if command -v nginx &> /dev/null; then
        log_info "Nginx已安装"
        return
    fi
    
    sudo apt-get install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    log_info "Nginx安装完成"
}

# 安装PM2
install_pm2() {
    log_step "安装PM2..."
    
    if command -v pm2 &> /dev/null; then
        log_info "PM2已安装"
        return
    fi
    
    sudo npm install -g pm2
    log_info "PM2安装完成"
}

# 部署应用
deploy_application() {
    log_step "部署应用..."
    
    PROJECT_DIR="/var/www/ai-recruitment"
    
    # 创建项目目录
    sudo mkdir -p $PROJECT_DIR
    sudo chown $USER:$USER $PROJECT_DIR
    
    # 如果是从当前目录部署
    if [[ -f "package.json" ]]; then
        log_info "从当前目录复制文件..."
        cp -r . $PROJECT_DIR/
    else
        log_error "未找到package.json，请在项目根目录运行此脚本"
        exit 1
    fi
    
    cd $PROJECT_DIR
    
    # 安装依赖
    log_info "安装项目依赖..."
    npm install
    
    # 构建项目
    log_info "构建项目..."
    npm run build 2>/dev/null || {
        log_warn "构建失败，尝试使用nx build..."
        npx nx build app-gateway || {
            log_error "项目构建失败，请检查代码"
            exit 1
        }
    }
    
    log_info "应用部署完成"
}

# 配置环境变量
setup_environment() {
    log_step "配置环境变量..."
    
    cat > /var/www/ai-recruitment/.env << EOF
NODE_ENV=production

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ai-recruitment-clerk
DATABASE_NAME=ai-recruitment-clerk
MONGODB_ROOT_PASSWORD=$MONGODB_PASSWORD

# API配置
API_BASE_URL=https://$DOMAIN/api
FRONTEND_URL=https://$DOMAIN
PORT=3000

# 支付配置
ALIPAY_APP_ID=$ALIPAY_APP_ID
ALIPAY_PRIVATE_KEY=your_private_key

# 安全配置
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$(openssl rand -base64 32)

# 外部服务
QUESTIONNAIRE_URL=$QUESTIONNAIRE_URL
GEMINI_API_KEY=$GEMINI_API_KEY

# NATS配置
NATS_URL=nats://localhost:4222
EOF
    
    chmod 600 /var/www/ai-recruitment/.env
    
    log_info "环境变量配置完成"
}

# 配置数据库
setup_database() {
    log_step "配置数据库..."
    
    # 等待MongoDB启动
    sleep 5
    
    # 创建数据库和用户
    mongosh --eval "
    use admin;
    db.createUser({
      user: 'admin',
      pwd: '$MONGODB_PASSWORD',
      roles: ['userAdminAnyDatabase', 'dbAdminAnyDatabase', 'readWriteAnyDatabase']
    });
    
    use ai-recruitment-clerk;
    db.createUser({
      user: 'app_user',
      pwd: 'app_$MONGODB_PASSWORD',
      roles: ['readWrite']
    });
    
    // 创建索引
    db.feedbackcodes.createIndex({ 'code': 1 }, { unique: true });
    db.feedbackcodes.createIndex({ 'generatedAt': 1 });
    db.feedbackcodes.createIndex({ 'isUsed': 1, 'generatedAt': -1 });
    " 2>/dev/null || {
        log_warn "数据库配置可能已存在，跳过..."
    }
    
    # 启用认证
    sudo sed -i 's/#security:/security:\n  authorization: enabled/' /etc/mongod.conf
    sudo systemctl restart mongod
    
    log_info "数据库配置完成"
}

# 配置Nginx
setup_nginx() {
    log_step "配置Nginx..."
    
    # 备份默认配置
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak
    
    # 创建新配置
    sudo tee /etc/nginx/sites-available/ai-recruitment > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # 前端静态文件
    location / {
        root /var/www/ai-recruitment/dist/apps/ai-recruitment-frontend;
        try_files \$uri \$uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            gzip_static on;
        }
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 安全配置
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
EOF
    
    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/ai-recruitment /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    sudo nginx -t
    sudo systemctl reload nginx
    
    log_info "Nginx配置完成"
}

# 启动应用
start_application() {
    log_step "启动应用..."
    
    cd /var/www/ai-recruitment
    
    # 创建PM2配置文件
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ai-recruitment-gateway',
    script: 'dist/apps/app-gateway/main.js',
    cwd: '/var/www/ai-recruitment',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    env_file: '.env',
    log_file: '/var/log/ai-recruitment/combined.log',
    out_file: '/var/log/ai-recruitment/out.log',
    error_file: '/var/log/ai-recruitment/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    restart_delay: 4000,
    max_memory_restart: '512M',
    node_args: '--max-old-space-size=512'
  }]
};
EOF
    
    # 创建日志目录
    sudo mkdir -p /var/log/ai-recruitment
    sudo chown $USER:$USER /var/log/ai-recruitment
    
    # 启动应用
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    log_info "应用启动完成"
}

# 安装SSL证书
install_ssl() {
    log_step "安装SSL证书..."
    
    if [[ "$DOMAIN" == "localhost" ]]; then
        log_warn "使用localhost，跳过SSL证书安装"
        return
    fi
    
    read -p "是否安装SSL证书？(y/n): " INSTALL_SSL
    if [[ "$INSTALL_SSL" != "y" ]]; then
        log_info "跳过SSL证书安装"
        return
    fi
    
    # 安装Certbot
    sudo apt-get install -y certbot python3-certbot-nginx
    
    # 获取证书
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    # 设置自动续期
    (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
    
    log_info "SSL证书安装完成"
}

# 验证部署
verify_deployment() {
    log_step "验证部署..."
    
    sleep 10
    
    # 检查服务状态
    if ! pm2 list | grep -q "ai-recruitment-gateway"; then
        log_error "应用未启动"
        return 1
    fi
    
    # 检查API健康状态
    if curl -s -f http://localhost:3000/api/health > /dev/null; then
        log_info "✅ API健康检查通过"
    else
        log_error "❌ API健康检查失败"
        return 1
    fi
    
    # 检查前端访问
    if curl -s -f http://localhost/ > /dev/null; then
        log_info "✅ 前端访问正常"
    else
        log_error "❌ 前端访问失败"
        return 1
    fi
    
    log_info "✅ 部署验证完成"
}

# 显示部署信息
show_deployment_info() {
    log_step "部署完成！"
    
    echo "=================================="
    echo "🎉 AI招聘助手部署成功！"
    echo "=================================="
    echo
    echo "📱 访问地址:"
    if [[ "$DOMAIN" != "localhost" ]]; then
        echo "   前端: https://$DOMAIN"
        echo "   API:  https://$DOMAIN/api"
    else
        echo "   前端: http://localhost"
        echo "   API:  http://localhost/api"
    fi
    echo
    echo "🛠️  管理命令:"
    echo "   查看状态: pm2 status"
    echo "   查看日志: pm2 logs"
    echo "   重启应用: pm2 restart all"
    echo "   停止应用: pm2 stop all"
    echo
    echo "📂 项目目录: /var/www/ai-recruitment"
    echo "📄 日志目录: /var/log/ai-recruitment"
    echo "⚙️  配置文件: /var/www/ai-recruitment/.env"
    echo
    echo "🔐 数据库信息:"
    echo "   MongoDB密码: $MONGODB_PASSWORD"
    echo "   数据库名: ai-recruitment-clerk"
    echo
    if [[ -z "$GEMINI_API_KEY" ]]; then
        echo "⚠️  请手动配置Gemini API Key:"
        echo "   编辑文件: /var/www/ai-recruitment/.env"
        echo "   重启应用: pm2 restart all"
        echo
    fi
    echo "📚 完整文档: ./PRODUCTION_DEPLOYMENT_GUIDE.md"
    echo "🆘 技术支持: https://github.com/your-org/AI-Recruitment-Clerk/issues"
    echo
    echo "=================================="
}

# 清理函数
cleanup() {
    if [[ $? -ne 0 ]]; then
        log_error "部署过程中出现错误"
        log_info "请查看错误信息并手动修复"
        log_info "或联系技术支持: https://github.com/your-org/AI-Recruitment-Clerk/issues"
    fi
}

trap cleanup EXIT

# 主函数
main() {
    echo "🚀 AI招聘助手\"凤凰计划\" - 自动部署脚本"
    echo "================================================"
    echo
    
    check_system
    collect_config
    
    # 更新系统
    log_step "更新系统包..."
    sudo apt-get update
    sudo apt-get upgrade -y
    
    # 安装组件
    install_nodejs
    install_mongodb
    install_nginx
    install_pm2
    
    # 部署应用
    deploy_application
    setup_environment
    setup_database
    setup_nginx
    start_application
    
    # 可选组件
    install_ssl
    
    # 验证部署
    if verify_deployment; then
        show_deployment_info
    else
        log_error "部署验证失败，请检查配置"
        exit 1
    fi
}

# 运行主函数
main "$@"