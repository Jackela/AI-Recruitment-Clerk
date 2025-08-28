#!/bin/bash

# AI招聘助手 - 安全审计脚本
# 全面的安全检查和漏洞扫描

set -euo pipefail

# ==========================================
# 配置变量
# ==========================================

AUDIT_DATE=$(date +%Y%m%d_%H%M%S)
AUDIT_REPORT_DIR="/tmp/security-audit-$AUDIT_DATE"
DOCKER_COMPOSE_FILE="docker-compose.production.yml"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==========================================
# 日志功能
# ==========================================

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$AUDIT_REPORT_DIR/audit.log"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$AUDIT_REPORT_DIR/audit.log"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$AUDIT_REPORT_DIR/audit.log"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$AUDIT_REPORT_DIR/audit.log"
}

# ==========================================
# 初始化审计
# ==========================================

initialize_audit() {
    log "🔐 开始AI招聘助手安全审计..."
    
    # 创建审计报告目录
    mkdir -p "$AUDIT_REPORT_DIR"
    
    # 生成审计报告头部
    cat > "$AUDIT_REPORT_DIR/security-audit-report.md" << EOF
# AI招聘助手安全审计报告

**审计日期**: $(date '+%Y-%m-%d %H:%M:%S')  
**审计版本**: v1.0  
**审计工具**: 自动化安全扫描脚本  

## 执行摘要

本报告包含AI招聘助手系统的全面安全评估，涵盖容器安全、网络安全、应用安全和配置安全等方面。

## 审计范围

- Docker容器安全配置
- 环境变量和密钥管理
- 网络安全配置
- SSL/TLS配置
- 应用安全配置
- 数据库安全
- 日志安全
- 备份安全

---

EOF
    
    success "审计环境初始化完成"
}

# ==========================================
# Docker容器安全审计
# ==========================================

audit_docker_security() {
    log "🐳 审计Docker容器安全配置..."
    
    local findings=0
    
    echo "## Docker容器安全审计" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查Docker版本
    local docker_version=$(docker --version)
    echo "### Docker版本" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "\`\`\`" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "$docker_version" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "\`\`\`" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查运行的容器
    echo "### 运行容器状态" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "\`\`\`" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "\`\`\`" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查容器特权配置
    log "检查容器特权配置..."
    local privileged_containers=$(docker ps --format "table {{.Names}}" --filter "label=privileged=true")
    if [ -n "$privileged_containers" ]; then
        error "发现特权容器运行"
        echo "**⚠️ 安全风险**: 发现特权容器" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
        ((findings++))
    else
        success "未发现特权容器"
    fi
    
    # 检查容器用户配置
    log "检查容器用户配置..."
    while IFS= read -r container; do
        if [ -n "$container" ]; then
            local user_info=$(docker inspect "$container" --format '{{.Config.User}}' 2>/dev/null || echo "root")
            if [ "$user_info" = "root" ] || [ -z "$user_info" ]; then
                warning "容器 $container 以root用户运行"
                echo "**⚠️ 安全建议**: 容器 $container 应使用非root用户运行" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
                ((findings++))
            else
                success "容器 $container 使用非root用户: $user_info"
            fi
        fi
    done < <(docker ps --format "{{.Names}}")
    
    # 检查容器资源限制
    log "检查容器资源限制..."
    while IFS= read -r container; do
        if [ -n "$container" ]; then
            local memory_limit=$(docker inspect "$container" --format '{{.HostConfig.Memory}}' 2>/dev/null || echo "0")
            local cpu_limit=$(docker inspect "$container" --format '{{.HostConfig.CpuShares}}' 2>/dev/null || echo "0")
            
            if [ "$memory_limit" = "0" ]; then
                warning "容器 $container 未设置内存限制"
                ((findings++))
            fi
            
            if [ "$cpu_limit" = "0" ]; then
                warning "容器 $container 未设置CPU限制"
                ((findings++))
            fi
        fi
    done < <(docker ps --format "{{.Names}}")
    
    # 检查Docker Compose安全配置
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        log "检查Docker Compose安全配置..."
        
        # 检查是否使用了安全选项
        if grep -q "security_opt" "$DOCKER_COMPOSE_FILE"; then
            success "Docker Compose配置使用了安全选项"
        else
            warning "Docker Compose配置未使用security_opt"
            ((findings++))
        fi
        
        # 检查是否禁用了新特权
        if grep -q "no-new-privileges:true" "$DOCKER_COMPOSE_FILE"; then
            success "Docker Compose配置禁用了新特权"
        else
            warning "Docker Compose配置未禁用新特权"
            ((findings++))
        fi
        
        # 检查是否使用了只读文件系统
        if grep -q "read_only: true" "$DOCKER_COMPOSE_FILE"; then
            success "Docker Compose配置使用了只读文件系统"
        else
            warning "部分容器可能未使用只读文件系统"
        fi
    fi
    
    echo "**Docker安全发现**: $findings 个潜在问题" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    return $findings
}

# ==========================================
# 环境变量安全审计
# ==========================================

audit_environment_security() {
    log "🔐 审计环境变量和密钥安全..."
    
    local findings=0
    
    echo "## 环境变量安全审计" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查环境配置文件
    local env_files=(".env" ".env.production" ".env.development" ".env.test")
    
    for env_file in "${env_files[@]}"; do
        if [ -f "$env_file" ]; then
            log "检查 $env_file..."
            
            # 检查文件权限
            local file_perms=$(stat -c "%a" "$env_file")
            if [ "$file_perms" != "600" ]; then
                error "$env_file 文件权限不安全: $file_perms (应为600)"
                echo "**🚨 严重**: $env_file 文件权限不安全 ($file_perms)" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
                ((findings++))
            else
                success "$env_file 文件权限安全"
            fi
            
            # 检查默认密码
            if grep -q "password123\|admin123\|test123\|changeme" "$env_file"; then
                error "$env_file 包含默认密码"
                echo "**🚨 严重**: $env_file 包含默认密码" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
                ((findings++))
            fi
            
            # 检查密钥长度
            while IFS= read -r line; do
                if [[ $line =~ ^([A-Z_]+)=(.+)$ ]]; then
                    local key="${BASH_REMATCH[1]}"
                    local value="${BASH_REMATCH[2]}"
                    
                    case $key in
                        *SECRET*|*PASSWORD*|*KEY*)
                            local value_length=${#value}
                            if [ $value_length -lt 32 ]; then
                                warning "$key 长度不足 ($value_length 字符，建议≥32)"
                                ((findings++))
                            fi
                            ;;
                        JWT_SECRET|JWT_REFRESH_SECRET|SESSION_SECRET)
                            local value_length=${#value}
                            if [ $value_length -lt 64 ]; then
                                warning "$key 长度不足 ($value_length 字符，建议≥64)"
                                ((findings++))
                            fi
                            ;;
                    esac
                fi
            done < "$env_file"
            
            # 检查敏感信息泄露
            if grep -qE "(api[_-]?key|token|secret|password)" "$env_file" | grep -qE "your[_-]|example|test|demo"; then
                error "$env_file 包含示例/测试凭据"
                echo "**🚨 严重**: $env_file 包含示例凭据" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
                ((findings++))
            fi
        fi
    done
    
    # 检查Git忽略配置
    if [ -f ".gitignore" ]; then
        if grep -q "\.env" ".gitignore"; then
            success "环境配置文件已在Git中忽略"
        else
            error "环境配置文件未在Git中忽略"
            echo "**🚨 严重**: 环境配置文件未在.gitignore中" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
            ((findings++))
        fi
    else
        error "缺少.gitignore文件"
        ((findings++))
    fi
    
    echo "**环境变量安全发现**: $findings 个潜在问题" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    return $findings
}

# ==========================================
# 网络安全审计
# ==========================================

audit_network_security() {
    log "🌐 审计网络安全配置..."
    
    local findings=0
    
    echo "## 网络安全审计" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查开放端口
    log "检查开放端口..."
    echo "### 开放端口扫描" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "\`\`\`" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    if command -v nmap >/dev/null 2>&1; then
        nmap -sT localhost | tee -a "$AUDIT_REPORT_DIR/security-audit-report.md"
    else
        netstat -tlnp | tee -a "$AUDIT_REPORT_DIR/security-audit-report.md"
    fi
    
    echo "\`\`\`" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查Docker网络配置
    log "检查Docker网络配置..."
    echo "### Docker网络配置" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "\`\`\`" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    docker network ls >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "\`\`\`" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查容器端口绑定
    while IFS= read -r container; do
        if [ -n "$container" ]; then
            local port_bindings=$(docker port "$container" 2>/dev/null || echo "")
            if echo "$port_bindings" | grep -q "0.0.0.0"; then
                warning "容器 $container 绑定到所有接口"
                echo "**⚠️ 安全建议**: 容器 $container 应绑定到特定接口" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
                ((findings++))
            fi
        fi
    done < <(docker ps --format "{{.Names}}")
    
    # 检查防火墙状态
    log "检查防火墙状态..."
    if command -v ufw >/dev/null 2>&1; then
        local ufw_status=$(ufw status 2>/dev/null || echo "inactive")
        if [[ $ufw_status == *"inactive"* ]]; then
            warning "UFW防火墙未启用"
            echo "**⚠️ 安全建议**: 启用UFW防火墙" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
            ((findings++))
        else
            success "UFW防火墙已启用"
        fi
    elif command -v iptables >/dev/null 2>&1; then
        local iptables_rules=$(iptables -L -n | wc -l)
        if [ "$iptables_rules" -lt 10 ]; then
            warning "iptables规则较少，可能未配置防火墙"
            ((findings++))
        fi
    fi
    
    echo "**网络安全发现**: $findings 个潜在问题" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    return $findings
}

# ==========================================
# SSL/TLS安全审计
# ==========================================

audit_ssl_security() {
    log "🔒 审计SSL/TLS配置..."
    
    local findings=0
    
    echo "## SSL/TLS安全审计" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查SSL证书
    if [ -d "ssl" ] || [ -d "certs" ] || [ -d "config" ]; then
        log "检查SSL证书文件..."
        
        local cert_dirs=("ssl" "certs" "config")
        for cert_dir in "${cert_dirs[@]}"; do
            if [ -d "$cert_dir" ]; then
                local cert_files=$(find "$cert_dir" -name "*.pem" -o -name "*.crt" -o -name "*.cert" 2>/dev/null)
                for cert_file in $cert_files; do
                    if [ -f "$cert_file" ]; then
                        local cert_expiry=$(openssl x509 -enddate -noout -in "$cert_file" 2>/dev/null | cut -d= -f2)
                        if [ -n "$cert_expiry" ]; then
                            local expiry_timestamp=$(date -d "$cert_expiry" +%s 2>/dev/null || echo "0")
                            local current_timestamp=$(date +%s)
                            local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                            
                            if [ $days_until_expiry -lt 30 ]; then
                                error "SSL证书 $cert_file 将在 $days_until_expiry 天后过期"
                                echo "**🚨 严重**: SSL证书即将过期 ($cert_file)" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
                                ((findings++))
                            elif [ $days_until_expiry -lt 90 ]; then
                                warning "SSL证书 $cert_file 将在 $days_until_expiry 天后过期"
                                ((findings++))
                            else
                                success "SSL证书 $cert_file 有效期正常 ($days_until_expiry 天)"
                            fi
                        fi
                        
                        # 检查证书文件权限
                        local cert_perms=$(stat -c "%a" "$cert_file")
                        if [ "$cert_perms" != "600" ] && [ "$cert_perms" != "644" ]; then
                            warning "SSL证书文件权限可能不安全: $cert_file ($cert_perms)"
                            ((findings++))
                        fi
                    fi
                done
            fi
        done
    else
        warning "未找到SSL证书目录"
        echo "**⚠️ 注意**: 未找到SSL证书配置" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
        ((findings++))
    fi
    
    # 检查HAProxy SSL配置
    if [ -f "config/haproxy.cfg" ]; then
        log "检查HAProxy SSL配置..."
        
        if grep -q "ssl-default-bind-ciphers" "config/haproxy.cfg"; then
            success "HAProxy配置了SSL密码套件"
        else
            warning "HAProxy未配置SSL密码套件"
            ((findings++))
        fi
        
        if grep -q "ssl-min-ver TLSv1.2" "config/haproxy.cfg"; then
            success "HAProxy配置了最小TLS版本"
        else
            warning "HAProxy未配置最小TLS版本"
            ((findings++))
        fi
        
        if grep -q "no-tls-tickets" "config/haproxy.cfg"; then
            success "HAProxy禁用了TLS会话票据"
        else
            warning "HAProxy未禁用TLS会话票据"
            ((findings++))
        fi
    fi
    
    echo "**SSL/TLS安全发现**: $findings 个潜在问题" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    return $findings
}

# ==========================================
# 应用安全审计
# ==========================================

audit_application_security() {
    log "🛡️ 审计应用安全配置..."
    
    local findings=0
    
    echo "## 应用安全审计" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查应用配置文件
    local config_files=("package.json" "apps/*/package.json")
    
    for config_pattern in "${config_files[@]}"; do
        for config_file in $config_pattern; do
            if [ -f "$config_file" ]; then
                log "检查 $config_file..."
                
                # 检查已知漏洞的依赖
                if command -v npm >/dev/null 2>&1; then
                    local audit_result=$(npm audit --json 2>/dev/null || echo '{"vulnerabilities": {}}')
                    local critical_vulns=$(echo "$audit_result" | jq '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
                    local high_vulns=$(echo "$audit_result" | jq '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
                    
                    if [ "$critical_vulns" -gt 0 ] || [ "$high_vulns" -gt 0 ]; then
                        error "发现高危漏洞: Critical $critical_vulns, High $high_vulns"
                        echo "**🚨 严重**: 发现高危依赖漏洞" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
                        ((findings++))
                    fi
                fi
                
                # 检查过时的依赖
                if grep -q "\"express\":" "$config_file"; then
                    local express_version=$(grep "\"express\":" "$config_file" | sed 's/.*"express": *"\([^"]*\)".*/\1/')
                    log "Express版本: $express_version"
                fi
            fi
        done
    done
    
    # 检查CORS配置
    if grep -r "cors" apps/ --include="*.ts" --include="*.js" >/dev/null 2>&1; then
        log "检查CORS配置..."
        if grep -r "origin.*\*" apps/ --include="*.ts" --include="*.js" >/dev/null 2>&1; then
            error "发现不安全的CORS配置 (origin: *)"
            echo "**🚨 严重**: CORS配置允许所有域名" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
            ((findings++))
        else
            success "CORS配置看起来安全"
        fi
    fi
    
    # 检查安全头配置
    if grep -r "helmet\|security.*header" apps/ --include="*.ts" --include="*.js" >/dev/null 2>&1; then
        success "应用配置了安全头"
    else
        warning "应用可能未配置安全头"
        echo "**⚠️ 安全建议**: 配置安全头 (helmet)" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
        ((findings++))
    fi
    
    # 检查输入验证
    if grep -r "validator\|joi\|yup" apps/ --include="*.ts" --include="*.js" >/dev/null 2>&1; then
        success "应用配置了输入验证"
    else
        warning "应用可能缺少输入验证"
        echo "**⚠️ 安全建议**: 加强输入验证" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
        ((findings++))
    fi
    
    echo "**应用安全发现**: $findings 个潜在问题" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    return $findings
}

# ==========================================
# 数据库安全审计
# ==========================================

audit_database_security() {
    log "🗃️ 审计数据库安全配置..."
    
    local findings=0
    
    echo "## 数据库安全审计" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查MongoDB配置
    if docker ps | grep -q mongodb; then
        log "检查MongoDB安全配置..."
        
        # 检查认证
        if docker exec $(docker ps --format "{{.Names}}" | grep mongodb) mongosh --eval "db.runCommand({connectionStatus: 1})" 2>/dev/null | grep -q "authenticatedUsers"; then
            success "MongoDB启用了认证"
        else
            error "MongoDB可能未启用认证"
            echo "**🚨 严重**: MongoDB未启用认证" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
            ((findings++))
        fi
        
        # 检查绑定地址
        local mongo_config=$(docker exec $(docker ps --format "{{.Names}}" | grep mongodb) cat /etc/mongod.conf 2>/dev/null || echo "")
        if echo "$mongo_config" | grep -q "bindIp.*127.0.0.1"; then
            success "MongoDB绑定到本地地址"
        elif echo "$mongo_config" | grep -q "bindIp.*0.0.0.0"; then
            warning "MongoDB绑定到所有接口"
            echo "**⚠️ 安全建议**: MongoDB应绑定到特定接口" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
            ((findings++))
        fi
        
        # 检查SSL配置
        if echo "$mongo_config" | grep -q "ssl"; then
            success "MongoDB配置了SSL"
        else
            warning "MongoDB未配置SSL"
            ((findings++))
        fi
    fi
    
    # 检查Redis配置
    if docker ps | grep -q redis; then
        log "检查Redis安全配置..."
        
        # 检查密码保护
        if docker exec $(docker ps --format "{{.Names}}" | grep redis) redis-cli ping 2>/dev/null | grep -q "NOAUTH"; then
            error "Redis未设置密码"
            echo "**🚨 严重**: Redis未设置密码保护" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
            ((findings++))
        else
            success "Redis已设置密码保护"
        fi
        
        # 检查危险命令
        local redis_config=$(docker exec $(docker ps --format "{{.Names}}" | grep redis) redis-cli config get "*" 2>/dev/null || echo "")
        if echo "$redis_config" | grep -q "rename-command.*FLUSHALL"; then
            success "Redis禁用了危险命令"
        else
            warning "Redis未禁用危险命令"
            ((findings++))
        fi
    fi
    
    echo "**数据库安全发现**: $findings 个潜在问题" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    return $findings
}

# ==========================================
# 日志安全审计
# ==========================================

audit_logging_security() {
    log "📋 审计日志安全配置..."
    
    local findings=0
    
    echo "## 日志安全审计" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查日志文件权限
    local log_dirs=("/var/log" "/var/lib/ai-recruitment/logs" "logs")
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            log "检查日志目录: $log_dir"
            
            # 检查目录权限
            local dir_perms=$(stat -c "%a" "$log_dir")
            if [ "$dir_perms" -gt 750 ]; then
                warning "日志目录权限过于宽松: $log_dir ($dir_perms)"
                ((findings++))
            fi
            
            # 检查日志文件权限
            find "$log_dir" -name "*.log" -type f | while read -r log_file; do
                local file_perms=$(stat -c "%a" "$log_file")
                if [ "$file_perms" -gt 640 ]; then
                    warning "日志文件权限过于宽松: $log_file ($file_perms)"
                    ((findings++))
                fi
            done
        fi
    done
    
    # 检查敏感信息泄露
    log "检查日志中的敏感信息..."
    local sensitive_patterns=("password" "secret" "token" "api.*key" "jwt")
    
    for pattern in "${sensitive_patterns[@]}"; do
        local log_files=$(find . -name "*.log" -type f 2>/dev/null)
        for log_file in $log_files; do
            if [ -f "$log_file" ]; then
                local matches=$(grep -ci "$pattern" "$log_file" 2>/dev/null || echo "0")
                if [ "$matches" -gt 0 ]; then
                    warning "日志文件 $log_file 可能包含敏感信息 ($pattern: $matches 次)"
                    echo "**⚠️ 安全风险**: 日志文件包含敏感信息" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
                    ((findings++))
                fi
            fi
        done
    done
    
    # 检查日志轮转配置
    if [ -f "/etc/logrotate.d/ai-recruitment" ]; then
        success "已配置日志轮转"
    else
        warning "未配置日志轮转"
        echo "**⚠️ 安全建议**: 配置日志轮转" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
        ((findings++))
    fi
    
    echo "**日志安全发现**: $findings 个潜在问题" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    return $findings
}

# ==========================================
# 备份安全审计
# ==========================================

audit_backup_security() {
    log "💾 审计备份安全配置..."
    
    local findings=0
    
    echo "## 备份安全审计" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 检查备份目录
    local backup_dirs=("/backup" "/var/backup" "backup")
    
    for backup_dir in "${backup_dirs[@]}"; do
        if [ -d "$backup_dir" ]; then
            log "检查备份目录: $backup_dir"
            
            # 检查目录权限
            local dir_perms=$(stat -c "%a" "$backup_dir")
            if [ "$dir_perms" -gt 700 ]; then
                warning "备份目录权限过于宽松: $backup_dir ($dir_perms)"
                ((findings++))
            else
                success "备份目录权限安全: $backup_dir ($dir_perms)"
            fi
            
            # 检查备份文件加密
            local backup_files=$(find "$backup_dir" -name "*.tar.gz" -o -name "*.zip" -o -name "*.bak" 2>/dev/null)
            local encrypted_files=$(find "$backup_dir" -name "*.gpg" -o -name "*.enc" 2>/dev/null | wc -l)
            local total_files=$(echo "$backup_files" | wc -l)
            
            if [ "$encrypted_files" -eq 0 ] && [ "$total_files" -gt 0 ]; then
                warning "备份文件未加密"
                echo "**⚠️ 安全建议**: 备份文件应该加密存储" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
                ((findings++))
            elif [ "$encrypted_files" -gt 0 ]; then
                success "发现加密的备份文件"
            fi
            
            # 检查备份完整性
            local checksum_files=$(find "$backup_dir" -name "*.sha256" -o -name "*.md5" 2>/dev/null | wc -l)
            if [ "$checksum_files" -eq 0 ] && [ "$total_files" -gt 0 ]; then
                warning "备份文件缺少完整性校验"
                ((findings++))
            fi
        fi
    done
    
    # 检查备份脚本权限
    local backup_scripts=$(find . -name "*backup*" -name "*.sh" 2>/dev/null)
    for script in $backup_scripts; do
        if [ -f "$script" ]; then
            local script_perms=$(stat -c "%a" "$script")
            if [ "$script_perms" -gt 700 ]; then
                warning "备份脚本权限过于宽松: $script ($script_perms)"
                ((findings++))
            fi
        fi
    done
    
    echo "**备份安全发现**: $findings 个潜在问题" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    echo "" >> "$AUDIT_REPORT_DIR/security-audit-report.md"
    
    return $findings
}

# ==========================================
# 生成最终报告
# ==========================================

generate_final_report() {
    local total_findings=$1
    
    log "📊 生成最终安全审计报告..."
    
    # 计算安全评分
    local max_score=100
    local deduction_per_finding=5
    local security_score=$((max_score - (total_findings * deduction_per_finding)))
    if [ $security_score -lt 0 ]; then
        security_score=0
    fi
    
    # 确定安全等级
    local security_level=""
    local security_color=""
    
    if [ $security_score -ge 90 ]; then
        security_level="优秀 (A)"
        security_color="🟢"
    elif [ $security_score -ge 80 ]; then
        security_level="良好 (B)"
        security_color="🟡"
    elif [ $security_score -ge 70 ]; then
        security_level="一般 (C)"
        security_color="🟠"
    elif [ $security_score -ge 60 ]; then
        security_level="较差 (D)"
        security_color="🔴"
    else
        security_level="很差 (F)"
        security_color="🔴"
    fi
    
    # 添加总结到报告
    cat >> "$AUDIT_REPORT_DIR/security-audit-report.md" << EOF

## 审计总结

### 安全评分
**总体评分**: $security_color $security_score/100 ($security_level)

**发现问题总数**: $total_findings

### 风险分类
- 🚨 **严重风险**: 需要立即修复
- ⚠️ **中等风险**: 建议尽快修复
- ℹ️ **低等风险**: 可在维护窗口修复

### 优先修复建议
1. 修复所有严重风险问题
2. 加强环境变量和密钥管理
3. 配置防火墙和网络安全
4. 启用SSL/TLS加密
5. 实施日志安全和监控

### 合规性检查
- [ ] PCI DSS 合规性
- [ ] GDPR 数据保护
- [ ] ISO 27001 信息安全
- [ ] SOC 2 安全控制

---

**报告生成时间**: $(date)  
**下次建议审计时间**: $(date -d '+1 month')  
**报告版本**: v1.0
EOF
    
    # 生成简要摘要
    cat > "$AUDIT_REPORT_DIR/security-summary.txt" << EOF
AI招聘助手安全审计摘要
====================
审计时间: $(date)
安全评分: $security_score/100 ($security_level)
发现问题: $total_findings
报告位置: $AUDIT_REPORT_DIR/security-audit-report.md
EOF
    
    success "安全审计完成"
    success "安全评分: $security_color $security_score/100 ($security_level)"
    success "发现问题: $total_findings"
    success "详细报告: $AUDIT_REPORT_DIR/security-audit-report.md"
    
    # 如果评分过低，返回错误代码
    if [ $security_score -lt 70 ]; then
        error "安全评分过低，需要立即采取行动"
        return 1
    fi
    
    return 0
}

# ==========================================
# 主函数
# ==========================================

main() {
    local total_findings=0
    
    # 初始化审计
    initialize_audit
    
    # 执行各项安全审计
    audit_docker_security
    total_findings=$((total_findings + $?))
    
    audit_environment_security
    total_findings=$((total_findings + $?))
    
    audit_network_security
    total_findings=$((total_findings + $?))
    
    audit_ssl_security
    total_findings=$((total_findings + $?))
    
    audit_application_security
    total_findings=$((total_findings + $?))
    
    audit_database_security
    total_findings=$((total_findings + $?))
    
    audit_logging_security
    total_findings=$((total_findings + $?))
    
    audit_backup_security
    total_findings=$((total_findings + $?))
    
    # 生成最终报告
    generate_final_report $total_findings
    
    return $?
}

# ==========================================
# 脚本入口
# ==========================================

# 检查是否以root运行
if [ "$EUID" -eq 0 ]; then
    warning "建议不要以root用户运行安全审计"
fi

# 执行主函数
main "$@"