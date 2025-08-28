#!/bin/bash

# 测试清理脚本 - 确保测试环境完全清理
# 根据最佳实践实施会话级一键回收

set -euo pipefail

echo "🧹 AI招聘助手 - 测试环境清理"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 清理函数
cleanup_processes() {
    echo "🔄 清理相关进程..."
    
    # 杀死可能的Node.js测试进程
    if command -v pkill >/dev/null 2>&1; then
        pkill -f "ai-recruitment" || true
        pkill -f "jest" || true
        pkill -f "nx test" || true
    fi
    
    # Windows环境清理
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        taskkill //F //IM node.exe //FI "WINDOWTITLE eq *ai-recruitment*" 2>/dev/null || true
        taskkill //F //IM node.exe //FI "WINDOWTITLE eq *jest*" 2>/dev/null || true
    fi
}

cleanup_ports() {
    echo "🌐 清理端口占用..."
    
    local ports=(3000 3001 4200 4222 6222 8222 27017 6379)
    
    for port in "${ports[@]}"; do
        if command -v lsof >/dev/null 2>&1; then
            # Unix系统
            local pids=$(lsof -ti:$port 2>/dev/null || true)
            if [[ -n "$pids" ]]; then
                echo "  终止端口 $port 上的进程: $pids"
                echo "$pids" | xargs -r kill -TERM 2>/dev/null || true
                sleep 1
                echo "$pids" | xargs -r kill -KILL 2>/dev/null || true
            fi
        elif command -v netstat >/dev/null 2>&1 && command -v taskkill >/dev/null 2>&1; then
            # Windows系统
            local pids=$(netstat -ano | findstr ":$port " | awk '{print $5}' | sort -u 2>/dev/null || true)
            for pid in $pids; do
                if [[ "$pid" =~ ^[0-9]+$ ]] && [[ "$pid" != "0" ]]; then
                    echo "  终止端口 $port 上的进程: $pid"
                    taskkill //F //PID "$pid" 2>/dev/null || true
                fi
            done
        fi
    done
}

cleanup_docker() {
    echo "🐳 清理Docker资源..."
    
    if command -v docker >/dev/null 2>&1; then
        # 停止并删除AI招聘助手相关容器
        local containers=$(docker ps -aq --filter "name=ai-recruitment" 2>/dev/null || true)
        if [[ -n "$containers" ]]; then
            echo "  停止容器: $containers"
            echo "$containers" | xargs -r docker stop >/dev/null 2>&1 || true
            echo "$containers" | xargs -r docker rm >/dev/null 2>&1 || true
        fi
        
        # 清理悬挂的网络
        local networks=$(docker network ls --filter "name=ai-recruitment" -q 2>/dev/null || true)
        if [[ -n "$networks" ]]; then
            echo "  删除网络: $networks"
            echo "$networks" | xargs -r docker network rm >/dev/null 2>&1 || true
        fi
        
        # 可选：清理测试产生的卷
        if [[ "${CLEANUP_VOLUMES:-false}" == "true" ]]; then
            local volumes=$(docker volume ls --filter "name=ai-recruitment" -q 2>/dev/null || true)
            if [[ -n "$volumes" ]]; then
                echo "  删除卷: $volumes"
                echo "$volumes" | xargs -r docker volume rm >/dev/null 2>&1 || true
            fi
        fi
    else
        echo "  Docker不可用，跳过Docker清理"
    fi
}

cleanup_temp_files() {
    echo "📁 清理临时文件..."
    
    # 清理测试生成的临时文件
    find . -name "*.tmp" -type f -delete 2>/dev/null || true
    find . -name "*.log" -path "*/test/*" -delete 2>/dev/null || true
    find . -name "coverage" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # 清理Jest缓存
    if [[ -d "node_modules/.cache/jest" ]]; then
        rm -rf node_modules/.cache/jest
    fi
    
    # 清理Nx缓存
    if [[ -d ".nx/cache" ]]; then
        rm -rf .nx/cache
    fi
}

check_cleanup_success() {
    echo "✅ 验证清理结果..."
    
    local issues=0
    
    # 检查端口占用
    local ports=(3000 3001 4200)
    for port in "${ports[@]}"; do
        if command -v nc >/dev/null 2>&1; then
            if nc -z localhost $port 2>/dev/null; then
                echo -e "${YELLOW}⚠️  端口 $port 仍被占用${NC}"
                issues=$((issues + 1))
            fi
        fi
    done
    
    # 检查Docker容器
    if command -v docker >/dev/null 2>&1; then
        local running_containers=$(docker ps --filter "name=ai-recruitment" --format "{{.Names}}" 2>/dev/null || true)
        if [[ -n "$running_containers" ]]; then
            echo -e "${YELLOW}⚠️  仍有运行中的容器: $running_containers${NC}"
            issues=$((issues + 1))
        fi
    fi
    
    if [[ $issues -eq 0 ]]; then
        echo -e "${GREEN}✅ 清理成功，环境已完全重置${NC}"
    else
        echo -e "${YELLOW}⚠️  清理完成，但检测到 $issues 个问题${NC}"
    fi
    
    return $issues
}

# 主清理流程
main() {
    echo "开始清理测试环境..."
    
    # 按顺序执行清理
    cleanup_processes
    cleanup_ports
    cleanup_docker
    cleanup_temp_files
    
    echo
    check_cleanup_success
    
    echo
    echo "💡 建议："
    echo "   - 清理完成后等待5秒再开始新的测试"
    echo "   - 如果问题持续，重启终端或系统"
    echo "   - 使用 'npm run test:clean' 进行完整的测试重置"
    
    echo
    echo "🏁 清理流程完成!"
}

# 捕获中断信号
trap 'echo -e "\n⚠️  清理过程被中断"; exit 1' INT TERM

# 执行主流程
main "$@"