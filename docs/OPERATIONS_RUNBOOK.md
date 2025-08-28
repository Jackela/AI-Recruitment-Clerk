# AI招聘助手 - 运维手册 (Operations Runbook)

## 概述

本运维手册提供AI招聘助手系统的日常运维操作指南，包括监控、维护、故障排除和标准操作程序。

## 系统架构概览

```mermaid
graph TB
    LB[负载均衡器] --> FE[前端应用]
    LB --> GW[API Gateway]
    GW --> MS1[简历解析服务]
    GW --> MS2[JD提取服务]
    GW --> MS3[评分引擎]
    GW --> MS4[报告生成服务]
    GW --> DB[(MongoDB)]
    GW --> CACHE[(Redis)]
    MS1 --> MQ[NATS]
    MS2 --> MQ
    MS3 --> MQ
    MS4 --> MQ
```

## 日常运维检查清单

### 每日检查 (Daily Health Check)

```bash
#!/bin/bash
# 每日系统健康检查脚本

echo "🌅 开始每日系统健康检查..."

# 1. 服务状态检查
echo "📊 检查服务状态..."
docker-compose ps
curl -f http://localhost:3000/api/health || echo "❌ API Gateway健康检查失败"

# 2. 资源使用情况
echo "💾 系统资源使用情况..."
df -h
free -h
docker stats --no-stream

# 3. 错误日志检查
echo "📋 检查错误日志..."
docker-compose logs --tail=50 --since=24h | grep -i error || echo "✅ 无错误日志"

# 4. 备份状态检查
echo "💾 检查备份状态..."
ls -la /backup/mongodb/full/ | tail -3
ls -la /backup/uploads/ | tail -3

# 5. 监控告警检查
echo "🚨 检查活跃告警..."
curl -s http://localhost:9093/api/v1/alerts | jq '.data[] | select(.status.state == "firing") | .labels.alertname' || echo "✅ 无活跃告警"

echo "✅ 每日健康检查完成"
```

### 每周检查 (Weekly Maintenance)

```bash
#!/bin/bash
# 每周维护检查脚本

echo "📅 开始每周维护检查..."

# 1. 日志轮转
echo "📋 执行日志轮转..."
docker-compose exec app-gateway sh -c "find /app/logs -name '*.log' -mtime +7 -exec gzip {} \;"

# 2. 数据库统计
echo "📊 数据库统计信息..."
mongosh mongodb://admin:${MONGODB_ROOT_PASSWORD}@localhost:27017/ai-recruitment?authSource=admin --eval "
  print('用户总数:', db.users.countDocuments());
  print('职位总数:', db.jobs.countDocuments());
  print('简历总数:', db.resumes.countDocuments());
  print('本周新增用户:', db.users.countDocuments({'createdAt': {\$gte: new Date(Date.now() - 7*24*60*60*1000)}}));
"

# 3. 清理临时文件
echo "🧹 清理临时文件..."
docker system prune -f
docker volume prune -f

# 4. 性能趋势分析
echo "📈 性能趋势分析..."
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[7d])" | jq '.data.result[0].value[1]' || echo "无法获取性能数据"

echo "✅ 每周维护检查完成"
```

## 监控与告警

### 关键指标监控

#### 服务可用性指标
```bash
# 检查所有服务状态
check_services() {
    services=("app-gateway" "mongodb" "redis" "nats")
    
    for service in "${services[@]}"; do
        if docker-compose ps $service | grep -q "Up"; then
            echo "✅ $service: 运行正常"
        else
            echo "❌ $service: 异常"
            docker-compose logs --tail=20 $service
        fi
    done
}
```

#### 性能指标监控
```bash
# 查询关键性能指标
get_performance_metrics() {
    echo "📊 性能指标概览..."
    
    # API响应时间
    curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,%20rate(http_request_duration_seconds_bucket[5m]))" | \
    jq -r '.data.result[0].value[1] // "N/A"' | \
    awk '{printf "API响应时间(P95): %.3f秒\n", $1}'
    
    # 错误率
    curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])*100" | \
    jq -r '.data.result[0].value[1] // "0"' | \
    awk '{printf "错误率: %.2f%%\n", $1}'
    
    # 请求速率
    curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])" | \
    jq -r '.data.result[0].value[1] // "0"' | \
    awk '{printf "请求速率: %.1f req/s\n", $1}'
}
```

### 告警响应流程

#### Critical级别告警 (立即响应)
```markdown
## 🚨 Critical告警响应 (0-15分钟)

1. **确认告警**
   - 检查Prometheus/Grafana
   - 验证服务状态
   - 确认影响范围

2. **初步处理**
   ```bash
   # 快速诊断
   ./scripts/verify-infrastructure.sh
   docker-compose ps
   curl -f http://localhost:3000/api/health
   ```

3. **升级路径**
   - 15分钟内无法解决 → 升级到技术负责人
   - 30分钟内无法解决 → 升级到管理层
   - 1小时内无法解决 → 触发灾难恢复

4. **通信**
   - 立即通知团队
   - 更新状态页面
   - 记录处理过程
```

#### Warning级别告警 (30分钟内响应)
```markdown
## ⚠️ Warning告警响应 (30分钟内)

1. **分析趋势**
   - 检查是否为持续性问题
   - 分析历史数据
   - 评估升级风险

2. **预防性措施**
   - 检查资源使用情况
   - 优化配置参数
   - 安排维护窗口

3. **监控加强**
   - 增加检查频率
   - 设置附加告警
   - 准备应急方案
```

## 故障排除指南

### 常见问题诊断

#### 1. API Gateway无响应
```bash
# 诊断步骤
echo "🔍 诊断API Gateway问题..."

# 检查容器状态
docker-compose ps app-gateway

# 检查日志
docker-compose logs --tail=100 app-gateway | grep -E "(ERROR|FATAL|Exception)"

# 检查端口监听
netstat -tlnp | grep :3000

# 检查内存使用
docker stats app-gateway --no-stream

# 重启服务
if [[ "$(docker-compose ps app-gateway | grep Up)" == "" ]]; then
    echo "重启API Gateway..."
    docker-compose restart app-gateway
    sleep 30
    curl -f http://localhost:3000/api/health
fi
```

#### 2. 数据库连接问题
```bash
# MongoDB连接诊断
echo "🔍 诊断MongoDB连接问题..."

# 检查MongoDB状态
docker-compose ps mongodb

# 测试连接
mongosh mongodb://admin:${MONGODB_ROOT_PASSWORD}@localhost:27017/admin --eval "db.runCommand({ping: 1})"

# 检查连接数
mongosh mongodb://admin:${MONGODB_ROOT_PASSWORD}@localhost:27017/admin --eval "db.runCommand({serverStatus: 1}).connections"

# 检查慢查询
mongosh mongodb://admin:${MONGODB_ROOT_PASSWORD}@localhost:27017/admin --eval "db.getProfilingStatus()"
```

#### 3. 高内存使用
```bash
# 内存使用诊断
echo "🔍 诊断内存使用问题..."

# 检查系统内存
free -h

# 检查容器内存使用
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# 检查最大内存使用的进程
docker exec app-gateway ps aux --sort=-%mem | head -10

# 检查内存泄漏
docker exec app-gateway cat /proc/meminfo | grep -E "(MemAvailable|MemFree|Cached)"
```

#### 4. 磁盘空间不足
```bash
# 磁盘空间清理
echo "🧹 清理磁盘空间..."

# 检查磁盘使用
df -h

# 清理Docker资源
docker system prune -f
docker volume prune -f

# 清理旧日志
find /var/lib/ai-recruitment/logs -name "*.log" -mtime +7 -delete

# 清理旧备份
find /backup -name "*.tar.gz" -mtime +30 -delete

# 压缩大文件
find /var/lib/ai-recruitment/uploads -size +100M -name "*.pdf" -exec gzip {} \;
```

## 部署和发布

### 生产部署流程

#### 1. 预部署检查
```bash
#!/bin/bash
# 预部署检查脚本

echo "🔍 执行预部署检查..."

# 检查环境变量
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production文件不存在"
    exit 1
fi

# 检查Docker镜像
required_images=("mongo:7.0-jammy" "redis:7-alpine" "nats:2.10-alpine")
for image in "${required_images[@]}"; do
    if ! docker images | grep -q "$image"; then
        echo "❌ 缺少必需的Docker镜像: $image"
        exit 1
    fi
done

# 检查备份
if [ ! -d "/backup" ]; then
    echo "❌ 备份目录不存在"
    exit 1
fi

# 检查磁盘空间
available_space=$(df / | awk 'NR==2 {print $4}')
if [ "$available_space" -lt 5242880 ]; then
    echo "❌ 磁盘空间不足 (可用: ${available_space}KB)"
    exit 1
fi

echo "✅ 预部署检查通过"
```

#### 2. 蓝绿部署脚本
```bash
#!/bin/bash
# 蓝绿部署脚本

BLUE_ENV="production"
GREEN_ENV="staging"
CURRENT_ENV=$(docker-compose ps | grep "Up" | wc -l)

echo "🚀 开始蓝绿部署..."

# 1. 构建新版本
echo "📦 构建新版本..."
docker-compose -f docker-compose.production.yml build

# 2. 启动绿色环境
echo "🟢 启动绿色环境..."
docker-compose -f docker-compose.staging.yml up -d

# 3. 等待服务就绪
echo "⏳ 等待服务就绪..."
sleep 60

# 4. 健康检查
if curl -f http://localhost:3001/api/health; then
    echo "✅ 绿色环境健康检查通过"
else
    echo "❌ 绿色环境健康检查失败"
    docker-compose -f docker-compose.staging.yml down
    exit 1
fi

# 5. 切换流量
echo "🔄 切换流量到绿色环境..."
# 这里需要配置负载均衡器切换逻辑

# 6. 关闭蓝色环境
echo "🔵 关闭蓝色环境..."
docker-compose -f docker-compose.production.yml down

echo "✅ 蓝绿部署完成"
```

#### 3. 回滚流程
```bash
#!/bin/bash
# 快速回滚脚本

echo "🔄 开始回滚流程..."

# 1. 恢复上一个版本的配置
git checkout HEAD~1 -- docker-compose.production.yml

# 2. 恢复上一个版本的镜像
docker tag ai-recruitment-gateway:previous ai-recruitment-gateway:latest

# 3. 重启服务
docker-compose -f docker-compose.production.yml up -d

# 4. 验证回滚
sleep 30
if curl -f http://localhost:3000/api/health; then
    echo "✅ 回滚成功"
else
    echo "❌ 回滚失败，需要手动干预"
    exit 1
fi
```

## 性能优化

### 数据库优化

#### 索引优化
```javascript
// MongoDB索引优化脚本
// 在MongoDB shell中执行

// 用户表索引
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });
db.users.createIndex({ "lastLoginAt": -1 });

// 职位表索引
db.jobs.createIndex({ "company": 1, "status": 1 });
db.jobs.createIndex({ "createdAt": -1 });
db.jobs.createIndex({ "requirements.skills": 1 });

// 简历表索引
db.resumes.createIndex({ "userId": 1 });
db.resumes.createIndex({ "uploadDate": -1 });
db.resumes.createIndex({ "skills": 1 });
db.resumes.createIndex({ "experience.years": 1 });

// 复合索引
db.matches.createIndex({ "jobId": 1, "resumeId": 1 }, { unique: true });
db.matches.createIndex({ "score": -1, "createdAt": -1 });
```

#### 查询优化
```bash
# 慢查询分析
mongosh mongodb://admin:${MONGODB_ROOT_PASSWORD}@localhost:27017/ai-recruitment?authSource=admin --eval "
  // 启用性能分析
  db.setProfilingLevel(2, { slowms: 100 });
  
  // 查看慢查询
  db.system.profile.find().limit(5).sort({millis: -1}).pretty();
  
  // 分析查询执行计划
  db.users.find({email: 'test@example.com'}).explain('executionStats');
"
```

### 缓存优化

#### Redis缓存策略
```bash
# 检查Redis性能
redis-cli --latency-history -i 1

# 检查内存使用
redis-cli info memory

# 检查命中率
redis-cli info stats | grep keyspace

# 清理过期键
redis-cli --scan --pattern "*" | xargs redis-cli del
```

### 应用程序优化

#### Node.js性能监控
```bash
# 检查Node.js进程
docker exec app-gateway ps aux | grep node

# 检查内存泄漏
docker exec app-gateway node -e "console.log(process.memoryUsage())"

# 生成堆快照
docker exec app-gateway node --inspect=0.0.0.0:9229 &
# 使用Chrome DevTools连接进行性能分析
```

## 安全运维

### 安全检查清单

#### 每日安全检查
```bash
#!/bin/bash
# 安全检查脚本

echo "🔒 执行安全检查..."

# 检查失败的登录尝试
docker-compose logs --since=24h app-gateway | grep -i "authentication failed" | wc -l

# 检查异常请求
docker-compose logs --since=24h app-gateway | grep -E "(403|404|500)" | tail -10

# 检查SSL证书
echo | openssl s_client -connect localhost:443 2>/dev/null | openssl x509 -noout -dates

# 检查开放端口
nmap -sT localhost

# 检查系统更新
apt list --upgradable 2>/dev/null | wc -l

echo "✅ 安全检查完成"
```

#### 访问日志分析
```bash
# 分析访问模式
docker-compose logs app-gateway | awk '{print $1}' | sort | uniq -c | sort -nr | head -10

# 检查可疑IP
docker-compose logs app-gateway | grep -E "(403|404)" | awk '{print $1}' | sort | uniq -c | sort -nr | head -5

# 检查用户代理
docker-compose logs app-gateway | grep "User-Agent" | awk -F'"' '{print $6}' | sort | uniq -c | sort -nr | head -10
```

## 备份与恢复

### 自动化备份监控
```bash
# 检查备份作业状态
check_backup_status() {
    echo "💾 检查备份状态..."
    
    # 检查最近的备份
    latest_backup=$(ls -t /backup/mongodb/full/*.tar.gz 2>/dev/null | head -1)
    if [ -n "$latest_backup" ]; then
        backup_age=$(( ($(date +%s) - $(stat -c %Y "$latest_backup")) / 3600 ))
        if [ $backup_age -lt 25 ]; then
            echo "✅ 最新备份: $latest_backup (${backup_age}小时前)"
        else
            echo "❌ 备份过期: $latest_backup (${backup_age}小时前)"
        fi
    else
        echo "❌ 未找到备份文件"
    fi
    
    # 检查备份完整性
    if [ -n "$latest_backup" ] && tar -tzf "$latest_backup" >/dev/null 2>&1; then
        echo "✅ 备份文件完整性验证通过"
    else
        echo "❌ 备份文件损坏"
    fi
}
```

### 快速恢复程序
```bash
# 紧急数据恢复
emergency_restore() {
    echo "🚨 执行紧急恢复..."
    
    # 停止服务
    docker-compose stop app-gateway
    
    # 创建当前数据备份
    mongodump --host=localhost:27017 --out=/backup/emergency/$(date +%Y%m%d_%H%M%S)
    
    # 恢复最新备份
    latest_backup=$(ls -t /backup/mongodb/full/*.tar.gz | head -1)
    tar -xzf "$latest_backup" -C /tmp/restore/
    mongorestore --host=localhost:27017 --drop --dir=/tmp/restore/
    
    # 重启服务
    docker-compose start app-gateway
    
    # 验证恢复
    curl -f http://localhost:3000/api/health
    
    echo "✅ 紧急恢复完成"
}
```

## 容量规划

### 资源使用趋势分析
```bash
# 生成资源使用报告
generate_capacity_report() {
    echo "📊 生成容量规划报告..."
    
    # CPU使用趋势
    echo "CPU使用率 (过去7天):"
    curl -s "http://localhost:9090/api/v1/query_range?query=100-avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m]))*100&start=$(date -d '7 days ago' +%s)&end=$(date +%s)&step=3600" | \
    jq -r '.data.result[0].values[] | "\(.[0]) \(.[1])"' | \
    awk '{print strftime("%Y-%m-%d %H:%M", $1), $2"%"}'
    
    # 内存使用趋势
    echo "内存使用率 (过去7天):"
    curl -s "http://localhost:9090/api/v1/query_range?query=(node_memory_MemTotal_bytes-node_memory_MemAvailable_bytes)/node_memory_MemTotal_bytes*100&start=$(date -d '7 days ago' +%s)&end=$(date +%s)&step=3600" | \
    jq -r '.data.result[0].values[] | "\(.[0]) \(.[1])"' | \
    awk '{print strftime("%Y-%m-%d %H:%M", $1), $2"%"}'
    
    # 磁盘增长预测
    current_usage=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
    echo "当前磁盘使用率: ${current_usage}%"
    
    # 请求量增长趋势
    echo "请求量趋势 (过去7天):"
    curl -s "http://localhost:9090/api/v1/query_range?query=rate(http_requests_total[1h])&start=$(date -d '7 days ago' +%s)&end=$(date +%s)&step=3600" | \
    jq -r '.data.result[0].values[] | "\(.[0]) \(.[1])"' | \
    awk '{print strftime("%Y-%m-%d %H:%M", $1), $2" req/s"}'
}
```

## 联系信息和升级路径

### 紧急联系人
```yaml
emergency_contacts:
  primary_oncall: "DevOps工程师"
  secondary_oncall: "系统架构师"
  escalation_manager: "技术总监"
  
escalation_timeline:
  immediate: "0-15分钟 - 一线工程师"
  tier_2: "15-30分钟 - 高级工程师"
  tier_3: "30-60分钟 - 架构师/技术负责人"
  management: "60分钟+ - 管理层"
```

### 外部依赖联系信息
```yaml
external_dependencies:
  cloud_provider: "Railway/AWS支持"
  dns_provider: "域名服务商"
  ssl_provider: "SSL证书提供商"
  monitoring: "监控服务提供商"
```

---

**文档版本**: v1.0  
**最后更新**: 2025-08-19  
**下次审查**: 2025-11-19  
**负责人**: DevOps团队