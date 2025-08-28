# 🚀 AI招聘助手"凤凰计划" - 生产环境部署指南

## 📋 部署方式选择

根据您的需求和资源情况，我们提供4种部署方案：

### 🏠 方案1：本地服务器部署 (推荐新手)
- **适用场景**：拥有独立服务器或高配置电脑
- **成本**：低 (仅服务器成本)
- **难度**：⭐⭐⭐
- **维护**：需要手动维护

### ☁️ 方案2：云服务器部署 (推荐中小企业)
- **适用场景**：需要稳定的生产环境
- **成本**：中 (100-500元/月)
- **难度**：⭐⭐⭐⭐
- **维护**：较少维护工作

### 🐳 方案3：Docker容器化部署 (推荐技术团队)
- **适用场景**：容器化运维团队
- **成本**：低-中
- **难度**：⭐⭐⭐⭐⭐
- **维护**：自动化程度高

### 🌐 方案4：Vercel/Netlify部署 (推荐快速上线)
- **适用场景**：快速MVP验证
- **成本**：低 (可免费开始)
- **难度**：⭐⭐
- **维护**：几乎无维护

---

## 🏠 方案1：本地服务器部署

### 🔧 系统要求
```bash
操作系统: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
CPU: 4核以上
内存: 8GB以上
存储: 50GB以上 SSD
网络: 10Mbps以上带宽
```

### Step 1: 环境准备

#### 1.1 安装Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # 应该显示 v18.x.x
npm --version   # 应该显示 9.x.x
```

#### 1.2 安装MongoDB
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# 验证安装
mongosh --eval 'db.runCommand({ connectionStatus: 1 })'
```

#### 1.3 安装Nginx
```bash
sudo apt-get install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 1.4 安装PM2 (进程管理器)
```bash
sudo npm install -g pm2
```

### Step 2: 代码部署

#### 2.1 获取代码
```bash
# 创建项目目录
sudo mkdir -p /var/www/ai-recruitment
sudo chown $USER:$USER /var/www/ai-recruitment
cd /var/www/ai-recruitment

# 复制您的项目文件到此目录
# (从 E:\Code\AI-Recruitment-Clerk 复制所有文件)
```

#### 2.2 安装依赖和构建
```bash
cd /var/www/ai-recruitment

# 安装依赖
npm install

# 构建前端
npm run build

# 构建后端
npx nx build app-gateway
```

### Step 3: 环境配置

#### 3.1 创建环境变量文件
```bash
cd /var/www/ai-recruitment
sudo nano .env.production
```

```bash
# .env.production 文件内容
NODE_ENV=production

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ai-recruitment-clerk
DATABASE_NAME=ai-recruitment-clerk

# API配置
API_BASE_URL=https://your-domain.com/api
FRONTEND_URL=https://your-domain.com
PORT=3000

# 支付配置
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_private_key

# 安全配置
JWT_SECRET=your_super_secret_key_32_chars_long
ENCRYPTION_KEY=another_32_character_secret_key

# 外部服务
QUESTIONNAIRE_URL=https://wj.qq.com/s2/your_questionnaire_id/
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB安全配置
MONGODB_ROOT_PASSWORD=your_secure_mongodb_password
```

#### 3.2 设置文件权限
```bash
sudo chmod 600 .env.production
sudo chown root:www-data .env.production
```

### Step 4: 数据库设置

#### 4.1 MongoDB安全配置
```bash
mongosh
```

```javascript
// 创建管理员用户
use admin
db.createUser({
  user: "admin",
  pwd: "your_secure_mongodb_password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

// 创建应用数据库和用户
use ai-recruitment-clerk
db.createUser({
  user: "app_user",
  pwd: "app_secure_password",
  roles: ["readWrite"]
})

// 创建必要的索引
db.feedbackcodes.createIndex({ "code": 1 }, { unique: true })
db.feedbackcodes.createIndex({ "generatedAt": 1 })
db.feedbackcodes.createIndex({ "isUsed": 1, "generatedAt": -1 })

exit
```

#### 4.2 启用MongoDB认证
```bash
sudo nano /etc/mongod.conf
```

```yaml
# 在 mongod.conf 文件中添加：
security:
  authorization: enabled
```

```bash
sudo systemctl restart mongod
```

### Step 5: Nginx配置

#### 5.1 创建Nginx配置文件
```bash
sudo nano /etc/nginx/sites-available/ai-recruitment
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # 前端静态文件
    location / {
        root /var/www/ai-recruitment/dist/apps/ai-recruitment-frontend;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            gzip_static on;
        }
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket支持 (如果需要)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        
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
```

#### 5.2 启用站点配置
```bash
sudo ln -s /etc/nginx/sites-available/ai-recruitment /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl reload nginx
```

### Step 6: SSL证书安装

#### 6.1 安装Certbot
```bash
sudo apt-get install certbot python3-certbot-nginx
```

#### 6.2 获取SSL证书
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### 6.3 设置自动续期
```bash
sudo crontab -e
# 添加这一行：
0 12 * * * /usr/bin/certbot renew --quiet
```

### Step 7: 启动应用

#### 7.1 创建PM2配置文件
```bash
nano /var/www/ai-recruitment/ecosystem.config.js
```

```javascript
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
    env_file: '.env.production',
    log_file: '/var/log/ai-recruitment/combined.log',
    out_file: '/var/log/ai-recruitment/out.log',
    error_file: '/var/log/ai-recruitment/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    restart_delay: 4000,
    max_memory_restart: '512M',
    node_args: '--max-old-space-size=512'
  }]
};
```

#### 7.2 创建日志目录
```bash
sudo mkdir -p /var/log/ai-recruitment
sudo chown $USER:$USER /var/log/ai-recruitment
```

#### 7.3 启动应用
```bash
cd /var/www/ai-recruitment

# 启动后端服务
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### Step 8: 验证部署

#### 8.1 检查服务状态
```bash
# 检查PM2进程
pm2 status

# 检查应用日志
pm2 logs ai-recruitment-gateway

# 检查Nginx状态
sudo systemctl status nginx

# 检查MongoDB状态
sudo systemctl status mongod
```

#### 8.2 测试API
```bash
# 测试健康检查
curl http://localhost:3000/api/health

# 测试营销API
curl http://localhost:3000/api/marketing/feedback-codes/stats
```

#### 8.3 测试前端
```bash
# 测试前端访问
curl -I http://your-domain.com

# 检查SSL证书
curl -I https://your-domain.com
```

---

## ☁️ 方案2：云服务器部署

### 推荐云服务商选择

#### 🏆 阿里云 (推荐国内用户)
- **配置推荐**: ECS计算型c6.large (2vCPU, 4GB)
- **预估成本**: 200-300元/月
- **优势**: 国内访问速度快，技术支持好

#### 🌟 腾讯云
- **配置推荐**: 标准型S5.MEDIUM4 (2vCPU, 4GB)  
- **预估成本**: 180-280元/月
- **优势**: 与微信生态集成好

#### 🌍 AWS
- **配置推荐**: t3.medium (2vCPU, 4GB)
- **预估成本**: $30-50/月
- **优势**: 全球化部署，服务稳定

### 云服务器部署步骤

#### Step 1: 购买和配置服务器
1. **选择配置**：
   ```
   CPU: 2核及以上
   内存: 4GB及以上  
   存储: 40GB SSD系统盘
   带宽: 5Mbps及以上
   操作系统: Ubuntu 20.04 LTS
   ```

2. **安全组配置**：
   ```
   开放端口：
   - 22 (SSH)
   - 80 (HTTP) 
   - 443 (HTTPS)
   - 3000 (临时调试用，部署完成后可关闭)
   ```

#### Step 2: 连接服务器
```bash
# 使用SSH连接服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y
```

#### Step 3: 执行方案1的部署步骤
按照**方案1的Step 1-8**执行所有步骤，注意：
- 将 `your-domain.com` 替换为您的实际域名或服务器IP
- 确保域名DNS指向您的服务器IP
- 云服务器防火墙需要开放相应端口

---

## 🐳 方案3：Docker容器化部署

### 优势
- 🚀 一键部署，环境一致性
- 🔧 易于维护和升级  
- 📦 资源隔离，互不影响
- 🔄 支持滚动更新和回滚

### Step 1: 安装Docker

#### 1.1 Ubuntu/Debian
```bash
# 卸载旧版本
sudo apt-get remove docker docker-engine docker.io containerd runc

# 安装依赖
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg lsb-release

# 添加Docker官方GPG密钥
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 添加Docker仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 添加用户到docker组
sudo usermod -aG docker $USER
newgrp docker
```

#### 1.2 验证安装
```bash
docker --version
docker compose version
```

### Step 2: 准备项目文件

#### 2.1 复制项目到服务器
```bash
# 创建项目目录
mkdir -p ~/ai-recruitment-clerk
cd ~/ai-recruitment-clerk

# 复制您的项目文件到此目录
# (从 E:\Code\AI-Recruitment-Clerk 复制所有文件)
```

#### 2.2 创建环境变量文件
```bash
nano .env
```

```bash
# .env 文件内容
NODE_ENV=production
MONGODB_ROOT_PASSWORD=your_secure_mongodb_password_here
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_super_secret_jwt_key_32_characters
ENCRYPTION_KEY=your_32_character_encryption_key_here
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_alipay_private_key
QUESTIONNAIRE_URL=https://wj.qq.com/s2/your_questionnaire_id/
```

### Step 3: 构建和启动容器

#### 3.1 构建镜像
```bash
# 构建所有服务
docker compose build

# 查看镜像
docker images
```

#### 3.2 启动服务
```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f
```

### Step 4: 验证部署

#### 4.1 检查服务健康状态
```bash
# 查看所有容器状态
docker compose ps

# 检查健康状态
docker compose exec app-gateway curl http://localhost:3000/api/health
```

#### 4.2 访问应用
- **前端**: http://your-server-ip:4200
- **后端API**: http://your-server-ip:3000/api
- **健康检查**: http://your-server-ip:3000/api/health

### Step 5: 配置反向代理 (可选)

#### 5.1 创建nginx-proxy容器
```bash
nano docker-compose.override.yml
```

```yaml
version: '3.8'

services:
  nginx-proxy:
    image: nginx:alpine
    container_name: ai-recruitment-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - ai-recruitment-frontend
      - app-gateway
    networks:
      - ai-recruitment-network

  # 修改前端端口，避免冲突
  ai-recruitment-frontend:
    ports:
      - "8080:80"  # 改为内部端口
```

#### 5.2 创建Nginx配置
```bash
nano nginx.conf
```

```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server ai-recruitment-frontend:80;
    }
    
    upstream backend {
        server app-gateway:3000;
    }
    
    server {
        listen 80;
        server_name your-domain.com;
        
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /api/ {
            proxy_pass http://backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### 5.3 重启服务
```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### Step 6: 监控和维护

#### 6.1 查看资源使用情况
```bash
# 查看容器资源使用
docker stats

# 查看容器日志
docker compose logs -f [service-name]

# 查看系统资源
htop
df -h
```

#### 6.2 备份和恢复
```bash
# 备份数据库
docker compose exec mongodb mongodump --out /backup/$(date +%Y%m%d)

# 备份整个项目
tar -czf ai-recruitment-backup-$(date +%Y%m%d).tar.gz ~/ai-recruitment-clerk
```

#### 6.3 更新部署
```bash
# 拉取最新代码
git pull

# 重新构建和部署
docker compose build
docker compose up -d

# 清理无用镜像
docker image prune -f
```

---

## 🌐 方案4：Vercel/Netlify快速部署

### 🚀 Vercel部署 (推荐前端)

#### Step 1: 准备Vercel配置

#### 1.1 创建vercel.json
```bash
# 在项目根目录创建
nano vercel.json
```

```json
{
  "version": 2,
  "name": "ai-recruitment-clerk",
  "builds": [
    {
      "src": "apps/ai-recruitment-frontend/**",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/apps/ai-recruitment-frontend"
      }
    },
    {
      "src": "apps/app-gateway/src/main.ts",
      "use": "@vercel/node",
      "config": {
        "includeFiles": [
          "apps/app-gateway/dist/**",
          "libs/**"
        ]
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/apps/app-gateway/src/main.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/apps/ai-recruitment-frontend/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "MONGODB_URI": "@mongodb_uri",
    "GEMINI_API_KEY": "@gemini_api_key",
    "JWT_SECRET": "@jwt_secret",
    "ALIPAY_APP_ID": "@alipay_app_id"
  }
}
```

#### 1.2 修改package.json构建脚本
```json
{
  "scripts": {
    "build": "nx build ai-recruitment-frontend --prod",
    "vercel-build": "npm run build"
  }
}
```

#### Step 2: 部署到Vercel

#### 2.1 安装Vercel CLI
```bash
npm i -g vercel
```

#### 2.2 登录和部署
```bash
# 登录Vercel
vercel login

# 部署项目
vercel --prod

# 设置环境变量
vercel env add MONGODB_URI
vercel env add GEMINI_API_KEY
vercel env add JWT_SECRET
vercel env add ALIPAY_APP_ID
```

### 📦 Railway部署 (推荐全栈)

#### Step 1: 准备Railway配置

#### 1.1 创建railway.json
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300
  }
}
```

#### 1.2 创建Dockerfile (可选)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

#### Step 2: 部署到Railway

#### 2.1 创建项目
1. 访问 https://railway.app
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择您的项目仓库

#### 2.2 配置环境变量
在Railway控制面板中设置：
```
NODE_ENV=production
MONGODB_URI=your_mongodb_uri
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
ALIPAY_APP_ID=your_alipay_app_id
PORT=3000
```

#### 2.3 配置数据库
1. 添加MongoDB插件
2. 复制数据库连接字符串到环境变量

---

## 🔧 部署后配置

### 1. 域名配置

#### 1.1 DNS设置
```dns
类型    名称    值
A       @       your-server-ip
A       www     your-server-ip
CNAME   api     your-domain.com
```

#### 1.2 SSL证书验证
```bash
# 检查证书状态
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### 2. 性能优化

#### 2.1 启用CDN (可选)
- 阿里云CDN
- 腾讯云CDN  
- Cloudflare

#### 2.2 数据库优化
```javascript
// MongoDB性能优化
db.feedbackcodes.createIndex({ "isUsed": 1, "generatedAt": -1 })
db.feedbackcodes.createIndex({ "paymentStatus": 1 })

// 定期清理过期数据
db.feedbackcodes.deleteMany({
  "isUsed": false,
  "generatedAt": { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
})
```

### 3. 监控设置

#### 3.1 应用监控
```bash
# 安装监控工具
npm install -g @vercel/analytics
npm install -g newrelic
```

#### 3.2 日志监控
```bash
# 设置日志轮转
sudo nano /etc/logrotate.d/ai-recruitment
```

```
/var/log/ai-recruitment/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload all
    endscript
}
```

---

## 🚨 故障排查指南

### 常见问题解决

#### 1. 前端无法访问后端
```bash
# 检查网络连接
curl -I http://localhost:3000/api/health

# 检查防火墙
sudo ufw status

# 检查nginx配置
sudo nginx -t
```

#### 2. 数据库连接失败
```bash
# 检查MongoDB状态
sudo systemctl status mongod

# 检查连接字符串
mongosh "your_mongodb_uri"

# 查看MongoDB日志
sudo tail -f /var/log/mongodb/mongod.log
```

#### 3. 应用无法启动
```bash
# 查看PM2日志
pm2 logs

# 检查端口占用
sudo netstat -tlnp | grep :3000

# 查看系统资源
free -h
df -h
```

#### 4. SSL证书问题
```bash
# 重新获取证书
sudo certbot --nginx -d your-domain.com --force-renewal

# 检查证书有效性
sudo certbot certificates
```

---

## 💡 部署建议

### 根据预算选择方案

#### 💰 低成本 (0-100元/月)
- **推荐**：方案4 (Vercel/Railway免费版)
- **适用**：个人项目、MVP验证
- **限制**：有一定的流量和功能限制

#### 💰💰 中等成本 (100-500元/月)  
- **推荐**：方案2 (云服务器) + 方案3 (Docker)
- **适用**：中小企业、正式运营
- **优势**：性能稳定，扩展性好

#### 💰💰💰 高成本 (500元+/月)
- **推荐**：多云部署 + CDN + 负载均衡
- **适用**：大企业、高并发场景
- **优势**：高可用、高性能

### 技术水平建议

#### 🔰 新手开发者
- **推荐顺序**：方案4 → 方案1 → 方案2
- **建议**：从简单部署开始，逐步学习复杂配置

#### 🎯 有经验开发者
- **推荐顺序**：方案3 → 方案2 → 方案1  
- **建议**：优先考虑容器化和自动化

#### 🚀 DevOps工程师
- **推荐**：方案3 + CI/CD + 监控 + 自动扩缩容
- **建议**：构建完整的自动化运维体系

---

## 📞 支持与帮助

### 🆘 遇到问题？

#### 技术支持
- **邮箱**: tech-support@your-domain.com
- **GitHub Issues**: https://github.com/your-org/AI-Recruitment-Clerk/issues
- **文档**: https://docs.your-domain.com

#### 社区支持  
- **微信群**: 扫描二维码加入技术交流群
- **论坛**: https://forum.your-domain.com
- **知识库**: https://kb.your-domain.com

### 📚 更多资源

#### 相关文档
- [API文档](./API_DOCUMENTATION.md)
- [用户指南](./USER_GUIDE.md)  
- [系统架构设计](./docs/TECHNICAL_ARCHITECTURE.md)

#### 视频教程
- 部署教程视频 (即将发布)
- 故障排查视频 (即将发布)

---

**🎉 恭喜！选择适合您的部署方案，开始您的AI招聘助手之旅！**

**需要帮助？随时联系我们的技术支持团队！** 💪

---

*最后更新: 2025-08-13 23:15:00*  
*文档版本: v1.0.0*  
*支持的部署方式: 本地/云服务器/Docker/Serverless*