#!/bin/bash

# AI招聘助手 - 自动化备份脚本
# 实现数据库、文件和配置的自动化备份

set -euo pipefail

# ==========================================
# 配置变量
# ==========================================

BACKUP_BASE_DIR="/backup"
CURRENT_DATE=$(date +%Y%m%d)
CURRENT_HOUR=$(date +%H)
RETENTION_DAYS=7
RETENTION_HOURS=24

# 数据库配置
MONGODB_HOST=${MONGODB_HOST:-"mongodb"}
MONGODB_PORT=${MONGODB_PORT:-"27017"}
MONGODB_USER=${MONGODB_ROOT_USER:-"admin"}
MONGODB_PASSWORD=${MONGODB_ROOT_PASSWORD}
MONGODB_DATABASE=${MONGODB_DATABASE:-"ai-recruitment"}

# 备份目录
MONGODB_BACKUP_DIR="$BACKUP_BASE_DIR/mongodb"
UPLOADS_BACKUP_DIR="$BACKUP_BASE_DIR/uploads"
LOGS_BACKUP_DIR="$BACKUP_BASE_DIR/logs"
CONFIG_BACKUP_DIR="$BACKUP_BASE_DIR/config"

# S3配置(可选)
AWS_S3_BUCKET=${AWS_S3_BUCKET:-""}
AWS_REGION=${AWS_REGION:-"us-east-1"}

# ==========================================
# 日志功能
# ==========================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_BASE_DIR/backup.log"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$BACKUP_BASE_DIR/backup.log" >&2
}

# ==========================================
# 备份前检查
# ==========================================

preflight_checks() {
    log "🔍 执行备份前检查..."
    
    # 检查备份目录
    for dir in "$MONGODB_BACKUP_DIR" "$UPLOADS_BACKUP_DIR" "$LOGS_BACKUP_DIR" "$CONFIG_BACKUP_DIR"; do
        mkdir -p "$dir"
        if [ ! -w "$dir" ]; then
            error "备份目录不可写: $dir"
            exit 1
        fi
    done
    
    # 检查磁盘空间
    available_space=$(df "$BACKUP_BASE_DIR" | awk 'NR==2 {print $4}')
    required_space=5242880  # 5GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        error "磁盘空间不足。可用: ${available_space}KB, 需要: ${required_space}KB"
        exit 1
    fi
    
    # 检查MongoDB连接
    if ! mongosh "mongodb://$MONGODB_USER:$MONGODB_PASSWORD@$MONGODB_HOST:$MONGODB_PORT/admin" \
         --eval "db.runCommand({ping: 1})" --quiet >/dev/null 2>&1; then
        error "无法连接到MongoDB"
        exit 1
    fi
    
    log "✅ 备份前检查通过"
}

# ==========================================
# MongoDB备份
# ==========================================

backup_mongodb() {
    local backup_type=$1
    local backup_dir=""
    local backup_name=""
    
    if [ "$backup_type" = "full" ]; then
        backup_dir="$MONGODB_BACKUP_DIR/full/$CURRENT_DATE"
        backup_name="full-$CURRENT_DATE"
        log "🗄️ 开始完整MongoDB备份..."
    else
        backup_dir="$MONGODB_BACKUP_DIR/incremental/${CURRENT_DATE}_${CURRENT_HOUR}"
        backup_name="incremental-${CURRENT_DATE}_${CURRENT_HOUR}"
        log "🗄️ 开始增量MongoDB备份..."
    fi
    
    mkdir -p "$backup_dir"
    
    # 构建mongodump命令
    local mongodump_cmd="mongodump"
    mongodump_cmd+=" --host=$MONGODB_HOST:$MONGODB_PORT"
    mongodump_cmd+=" --username=$MONGODB_USER"
    mongodump_cmd+=" --password=$MONGODB_PASSWORD"
    mongodump_cmd+=" --authenticationDatabase=admin"
    mongodump_cmd+=" --db=$MONGODB_DATABASE"
    mongodump_cmd+=" --out=$backup_dir"
    
    # 增量备份查询条件
    if [ "$backup_type" = "incremental" ]; then
        local one_hour_ago=$(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S.%3NZ)
        mongodump_cmd+=" --query='{\"updatedAt\": {\"\$gte\": ISODate(\"$one_hour_ago\")}}'"
    fi
    
    # 执行备份
    if eval "$mongodump_cmd"; then
        log "✅ MongoDB备份完成: $backup_name"
        
        # 压缩备份
        cd "$MONGODB_BACKUP_DIR"
        if [ "$backup_type" = "full" ]; then
            tar -czf "full/$backup_name.tar.gz" -C "full/$CURRENT_DATE" .
            rm -rf "full/$CURRENT_DATE"
        else
            tar -czf "incremental/$backup_name.tar.gz" -C "incremental/${CURRENT_DATE}_${CURRENT_HOUR}" .
            rm -rf "incremental/${CURRENT_DATE}_${CURRENT_HOUR}"
        fi
        
        log "✅ 备份压缩完成: $backup_name.tar.gz"
    else
        error "MongoDB备份失败"
        return 1
    fi
}

# ==========================================
# 文件备份
# ==========================================

backup_uploads() {
    log "📁 开始文件上传备份..."
    
    local uploads_source="/var/lib/ai-recruitment/uploads"
    local uploads_backup="$UPLOADS_BACKUP_DIR/$CURRENT_DATE"
    
    if [ ! -d "$uploads_source" ]; then
        log "⚠️ 上传目录不存在: $uploads_source"
        return 0
    fi
    
    mkdir -p "$uploads_backup"
    
    # 使用rsync进行增量备份
    if rsync -av --delete "$uploads_source/" "$uploads_backup/"; then
        log "✅ 文件备份完成"
        
        # 计算文件数量和大小
        local file_count=$(find "$uploads_backup" -type f | wc -l)
        local total_size=$(du -sh "$uploads_backup" | cut -f1)
        log "📊 备份文件统计: $file_count 个文件, 总大小: $total_size"
    else
        error "文件备份失败"
        return 1
    fi
}

# ==========================================
# 日志备份
# ==========================================

backup_logs() {
    log "📋 开始日志备份..."
    
    local logs_source="/var/lib/ai-recruitment/logs"
    local logs_backup="$LOGS_BACKUP_DIR/logs-${CURRENT_DATE}_${CURRENT_HOUR}.tar.gz"
    
    if [ ! -d "$logs_source" ]; then
        log "⚠️ 日志目录不存在: $logs_source"
        return 0
    fi
    
    # 压缩最近24小时的日志
    if find "$logs_source" -name "*.log" -mtime -1 -exec tar -czf "$logs_backup" {} +; then
        log "✅ 日志备份完成: logs-${CURRENT_DATE}_${CURRENT_HOUR}.tar.gz"
    else
        error "日志备份失败"
        return 1
    fi
}

# ==========================================
# 配置备份
# ==========================================

backup_config() {
    log "⚙️ 开始配置备份..."
    
    local config_backup="$CONFIG_BACKUP_DIR/$CURRENT_DATE"
    mkdir -p "$config_backup"
    
    # 备份环境配置(脱敏)
    if [ -f ".env.production" ]; then
        # 创建脱敏版本的配置备份
        sed 's/=.*/=***REDACTED***/g' .env.production > "$config_backup/env-template-$CURRENT_DATE.backup"
        log "✅ 环境配置模板已备份"
    fi
    
    # 备份Docker配置
    for config_file in docker-compose.production.yml docker-compose.monitoring.yml; do
        if [ -f "$config_file" ]; then
            cp "$config_file" "$config_backup/"
            log "✅ 已备份: $config_file"
        fi
    done
    
    # 备份监控配置
    if [ -d "monitoring" ]; then
        cp -r monitoring/ "$config_backup/"
        log "✅ 监控配置已备份"
    fi
    
    # 备份脚本
    if [ -d "scripts" ]; then
        cp -r scripts/ "$config_backup/"
        log "✅ 脚本文件已备份"
    fi
}

# ==========================================
# 备份验证
# ==========================================

verify_backups() {
    log "🔍 开始备份验证..."
    
    local backup_date=$1
    local errors=0
    
    # 验证MongoDB备份
    local mongodb_backup="$MONGODB_BACKUP_DIR/full/full-$backup_date.tar.gz"
    if [ -f "$mongodb_backup" ]; then
        if tar -tzf "$mongodb_backup" >/dev/null 2>&1; then
            log "✅ MongoDB备份文件完整性验证通过"
        else
            error "MongoDB备份文件损坏: $mongodb_backup"
            ((errors++))
        fi
    else
        error "MongoDB备份文件不存在: $mongodb_backup"
        ((errors++))
    fi
    
    # 验证文件备份
    local uploads_backup="$UPLOADS_BACKUP_DIR/$backup_date"
    if [ -d "$uploads_backup" ]; then
        # 计算校验和
        find "$uploads_backup" -type f -exec sha256sum {} \; > "$uploads_backup/checksums.txt"
        log "✅ 文件备份校验和已生成"
    else
        log "⚠️ 文件备份目录不存在: $uploads_backup"
    fi
    
    # 验证配置备份
    local config_backup="$CONFIG_BACKUP_DIR/$backup_date"
    if [ -d "$config_backup" ]; then
        log "✅ 配置备份目录存在"
    else
        error "配置备份目录不存在: $config_backup"
        ((errors++))
    fi
    
    if [ $errors -eq 0 ]; then
        log "✅ 所有备份验证通过"
        return 0
    else
        error "备份验证失败，发现 $errors 个错误"
        return 1
    fi
}

# ==========================================
# 云端同步
# ==========================================

sync_to_cloud() {
    if [ -z "$AWS_S3_BUCKET" ]; then
        log "⚠️ 未配置S3存储桶，跳过云端同步"
        return 0
    fi
    
    log "☁️ 开始同步到云端存储..."
    
    local backup_date=$1
    
    # 检查AWS CLI
    if ! command -v aws >/dev/null 2>&1; then
        error "AWS CLI未安装，无法同步到云端"
        return 1
    fi
    
    # 同步MongoDB备份
    local mongodb_backup="$MONGODB_BACKUP_DIR/full/full-$backup_date.tar.gz"
    if [ -f "$mongodb_backup" ]; then
        if aws s3 cp "$mongodb_backup" "s3://$AWS_S3_BUCKET/backups/mongodb/" --storage-class STANDARD_IA; then
            log "✅ MongoDB备份已同步到S3"
        else
            error "MongoDB备份同步失败"
        fi
    fi
    
    # 同步文件备份
    local uploads_backup="$UPLOADS_BACKUP_DIR/$backup_date"
    if [ -d "$uploads_backup" ]; then
        if aws s3 sync "$uploads_backup" "s3://$AWS_S3_BUCKET/backups/uploads/$backup_date/" --storage-class STANDARD_IA; then
            log "✅ 文件备份已同步到S3"
        else
            error "文件备份同步失败"
        fi
    fi
    
    log "✅ 云端同步完成"
}

# ==========================================
# 清理旧备份
# ==========================================

cleanup_old_backups() {
    log "🧹 开始清理旧备份..."
    
    # 清理本地备份
    log "清理 $RETENTION_DAYS 天前的本地备份..."
    
    # 清理MongoDB完整备份
    find "$MONGODB_BACKUP_DIR/full" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # 清理增量备份（保留24小时）
    find "$MONGODB_BACKUP_DIR/incremental" -name "*.tar.gz" -mtime +1 -delete 2>/dev/null || true
    
    # 清理文件备份
    find "$UPLOADS_BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    # 清理日志备份
    find "$LOGS_BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # 清理配置备份
    find "$CONFIG_BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    log "✅ 本地备份清理完成"
    
    # 清理云端备份（如果配置了S3）
    if [ -n "$AWS_S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
        log "清理S3中30天前的备份..."
        
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        
        # 列出并删除旧的MongoDB备份
        aws s3 ls "s3://$AWS_S3_BUCKET/backups/mongodb/" --recursive | \
        awk '$1 < "'$cutoff_date'" {print $4}' | \
        while read file; do
            aws s3 rm "s3://$AWS_S3_BUCKET/$file"
        done
        
        log "✅ 云端备份清理完成"
    fi
}

# ==========================================
# 备份状态报告
# ==========================================

generate_backup_report() {
    local backup_date=$1
    local start_time=$2
    local end_time=$(date)
    
    log "📊 生成备份报告..."
    
    local report_file="$BACKUP_BASE_DIR/reports/backup-report-$backup_date.txt"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# AI招聘助手备份报告
日期: $backup_date
开始时间: $start_time
结束时间: $end_time

## 备份统计
EOF
    
    # MongoDB备份统计
    if [ -f "$MONGODB_BACKUP_DIR/full/full-$backup_date.tar.gz" ]; then
        local mongodb_size=$(du -h "$MONGODB_BACKUP_DIR/full/full-$backup_date.tar.gz" | cut -f1)
        echo "MongoDB备份大小: $mongodb_size" >> "$report_file"
    fi
    
    # 文件备份统计
    if [ -d "$UPLOADS_BACKUP_DIR/$backup_date" ]; then
        local uploads_size=$(du -sh "$UPLOADS_BACKUP_DIR/$backup_date" | cut -f1)
        local uploads_count=$(find "$UPLOADS_BACKUP_DIR/$backup_date" -type f | wc -l)
        echo "文件备份大小: $uploads_size ($uploads_count 个文件)" >> "$report_file"
    fi
    
    # 磁盘使用情况
    echo "" >> "$report_file"
    echo "## 磁盘使用情况" >> "$report_file"
    df -h "$BACKUP_BASE_DIR" >> "$report_file"
    
    log "✅ 备份报告已生成: $report_file"
}

# ==========================================
# 主函数
# ==========================================

main() {
    local backup_type=${1:-"full"}
    local start_time=$(date)
    
    log "🚀 开始备份流程 (类型: $backup_type)"
    
    # 创建锁文件防止重复执行
    local lock_file="/tmp/backup-ai-recruitment.lock"
    if [ -f "$lock_file" ]; then
        error "备份正在进行中，退出"
        exit 1
    fi
    
    echo $$ > "$lock_file"
    trap "rm -f $lock_file" EXIT
    
    # 执行备份流程
    preflight_checks
    
    # 根据时间决定备份类型
    if [ "$backup_type" = "auto" ]; then
        if [ "$CURRENT_HOUR" = "02" ]; then
            backup_type="full"
        else
            backup_type="incremental"
        fi
    fi
    
    # 执行备份
    backup_mongodb "$backup_type"
    
    if [ "$backup_type" = "full" ]; then
        backup_uploads
        backup_config
    fi
    
    backup_logs
    
    # 验证备份
    verify_backups "$CURRENT_DATE"
    
    # 云端同步（仅完整备份）
    if [ "$backup_type" = "full" ]; then
        sync_to_cloud "$CURRENT_DATE"
    fi
    
    # 清理旧备份
    cleanup_old_backups
    
    # 生成报告
    generate_backup_report "$CURRENT_DATE" "$start_time"
    
    log "🎉 备份流程完成!"
}

# ==========================================
# 脚本入口
# ==========================================

case "${1:-auto}" in
    "full")
        main "full"
        ;;
    "incremental")
        main "incremental"
        ;;
    "auto")
        main "auto"
        ;;
    *)
        echo "用法: $0 {full|incremental|auto}"
        echo "  full         - 完整备份"
        echo "  incremental  - 增量备份"
        echo "  auto         - 自动选择(2点执行完整备份，其他时间增量备份)"
        exit 1
        ;;
esac