#!/bin/bash

# AI招聘助手 - 基础设施验证脚本
# 验证所有必需的服务是否正常运行

echo "🔍 AI招聘助手 - 基础设施状态验证"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印状态
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

# 函数：检查端口是否开放
check_port() {
    local port=$1
    local service=$2
    
    if command -v nc >/dev/null 2>&1; then
        nc -z localhost $port >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_status 0 "$service (端口 $port) 连接正常"
            return 0
        else
            print_status 1 "$service (端口 $port) 连接失败"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  nc 命令不可用，跳过端口检查${NC}"
        return 0
    fi
}

# 加载环境变量
if [ -f .env.development ]; then
    echo "📄 加载开发环境配置..."
    source .env.development
else
    echo -e "${YELLOW}⚠️  .env.development 文件不存在，使用默认配置${NC}"
fi

echo
echo "🔍 检查基础服务连接..."

# 检查 MongoDB
echo "📊 MongoDB 连接测试..."
if command -v mongosh >/dev/null 2>&1; then
    MONGODB_TEST_URI=${MONGODB_URI:-"mongodb://localhost:27017/ai-recruitment-clerk"}
    mongosh "$MONGODB_TEST_URI" --eval "db.runCommand({ping: 1})" --quiet >/dev/null 2>&1
    print_status $? "MongoDB 数据库连接"
else
    check_port 27017 "MongoDB"
fi

# 检查 NATS
echo "📨 NATS 消息队列测试..."
check_port 4222 "NATS JetStream"

# 检查 Redis (可选)
echo "💾 Redis 缓存测试..."
if [ "${USE_REDIS_CACHE}" = "true" ] && [ "${DISABLE_REDIS}" != "true" ]; then
    if command -v redis-cli >/dev/null 2>&1; then
        REDIS_TEST_URL=${REDIS_URL:-"redis://localhost:6379"}
        redis-cli -u "$REDIS_TEST_URL" ping >/dev/null 2>&1
        print_status $? "Redis 缓存服务"
    else
        check_port 6379 "Redis"
    fi
else
    echo -e "${YELLOW}⚠️  Redis 已禁用，使用内存缓存${NC}"
fi

echo
echo "🚀 检查应用服务..."

# 检查 Gateway 服务
check_port 3000 "API Gateway"

# 检查 Frontend 服务
check_port 4200 "Frontend Application"

echo
echo "🔐 安全配置检查..."

# 检查关键环境变量
check_env_var() {
    local var_name=$1
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        print_status 1 "$var_name 环境变量未设置"
        return 1
    elif [ "$var_value" = "your_actual_gemini_api_key_here" ] || [ "$var_value" = "your_gemini_api_key_here" ]; then
        print_status 1 "$var_name 使用了默认占位符值"
        return 1
    else
        print_status 0 "$var_name 已正确配置"
        return 0
    fi
}

# 验证密钥长度
check_key_length() {
    local var_name=$1
    local var_value="${!var_name}"
    local expected_length=$2
    
    if [ -n "$var_value" ]; then
        actual_length=${#var_value}
        if [ $actual_length -eq $expected_length ]; then
            print_status 0 "$var_name 密钥长度正确 ($actual_length 字符)"
        else
            print_status 1 "$var_name 密钥长度不正确 (期望 $expected_length，实际 $actual_length)"
        fi
    fi
}

check_env_var "JWT_SECRET"
check_key_length "JWT_SECRET" 64

check_env_var "JWT_REFRESH_SECRET" 
check_key_length "JWT_REFRESH_SECRET" 64

check_env_var "ENCRYPTION_KEY"
check_key_length "ENCRYPTION_KEY" 64

check_env_var "MONGODB_ROOT_PASSWORD"
check_env_var "GEMINI_API_KEY"

echo
echo "📋 系统状态总结"
echo "========================================"

# Docker 检查
if command -v docker >/dev/null 2>&1; then
    running_containers=$(docker ps --filter "name=ai-recruitment" --format "table {{.Names}}" | grep -v NAMES | wc -l)
    if [ $running_containers -gt 0 ]; then
        print_status 0 "Docker 容器运行中 ($running_containers 个)"
        echo "   运行中的容器:"
        docker ps --filter "name=ai-recruitment" --format "   - {{.Names}} ({{.Status}})"
    else
        print_status 1 "未发现 AI 招聘助手相关容器运行"
    fi
else
    echo -e "${YELLOW}⚠️  Docker 不可用${NC}"
fi

echo
echo "💡 提示:"
echo "   - 如果服务未运行，请执行: docker-compose up -d"
echo "   - 查看服务日志: docker-compose logs [service-name]"
echo "   - 停止所有服务: docker-compose down"
echo "   - 查看详细状态: docker-compose ps"

echo
echo "✅ 基础设施验证完成!"