# AI招聘助手 - 灾难恢复计划 (Disaster Recovery Plan)

## 概述

本文档定义了AI招聘助手系统的灾难恢复计划，确保在系统故障、数据丢失或其他灾难性事件发生时，能够在4小时内恢复正常运营。

## 恢复目标 (Recovery Objectives)

### RTO (Recovery Time Objective)
- **关键服务**: < 2小时
- **完整系统**: < 4小时
- **数据恢复**: < 1小时

### RPO (Recovery Point Objective)  
- **实时数据**: < 15分钟
- **文件数据**: < 1小时
- **历史数据**: < 24小时

## 系统架构风险评估

### 关键组件风险等级

| 组件 | 风险等级 | 影响 | 恢复优先级 |
|------|----------|------|------------|
| MongoDB数据库 | 🔴 极高 | 数据丢失、服务完全中断 | P0 |
| API Gateway | 🔴 极高 | 用户无法访问系统 | P0 |
| NATS消息队列 | 🟡 中等 | 异步处理延迟 | P1 |
| 微服务组件 | 🟡 中等 | 功能部分受限 | P1 |
| 前端应用 | 🟢 低 | 用户界面无法访问 | P2 |
| Redis缓存 | 🟢 低 | 性能下降 | P2 |

### 故障模式分析

#### 1. 数据库故障
**场景**: MongoDB主节点故障、数据损坏、磁盘故障
**影响**: 数据不可用、写操作失败
**检测**: 
- 健康检查失败
- 连接超时告警
- 写操作错误率激增

#### 2. 应用服务故障
**场景**: 服务进程崩溃、内存泄漏、依赖服务不可用
**影响**: API请求失败、功能不可用
**检测**:
- 健康检查端点失败
- 响应时间超过阈值
- 错误率超过5%

#### 3. 基础设施故障
**场景**: 服务器宕机、网络中断、容器平台故障
**影响**: 整个系统不可用
**检测**:
- 主机监控告警
- 网络连通性检查失败
- 容器状态异常

## 备份策略

### 数据备份

#### MongoDB备份
```bash
# 每日完整备份
mongodump --host=mongodb:27017 \
  --username=admin \
  --password=${MONGODB_ROOT_PASSWORD} \
  --authenticationDatabase=admin \
  --db=ai-recruitment \
  --out=/backup/mongodb/$(date +%Y%m%d)

# 每小时增量备份
mongodump --host=mongodb:27017 \
  --username=admin \
  --password=${MONGODB_ROOT_PASSWORD} \
  --authenticationDatabase=admin \
  --db=ai-recruitment \
  --query='{"updatedAt": {"$gte": new Date("'$(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S.%3NZ)'")}}' \
  --out=/backup/mongodb/incremental/$(date +%Y%m%d_%H)
```

#### 文件备份
```bash
# 上传文件备份
rsync -av --delete /var/lib/ai-recruitment/uploads/ \
  /backup/uploads/$(date +%Y%m%d)/

# 应用日志备份
tar -czf /backup/logs/logs-$(date +%Y%m%d_%H).tar.gz \
  /var/lib/ai-recruitment/logs/
```

#### 配置备份
```bash
# 环境配置备份
cp .env.production /backup/config/env-$(date +%Y%m%d_%H%M%S).backup

# Docker配置备份
cp docker-compose.production.yml /backup/config/
cp -r monitoring/ /backup/config/
```

### 备份存储
- **本地存储**: `/backup/` (7天保留)
- **远程存储**: AWS S3/Azure Blob (30天保留)
- **异地备份**: 每日同步到灾备站点

### 备份验证
```bash
#!/bin/bash
# 备份完整性验证脚本

# 验证MongoDB备份
mongorestore --host=test-mongodb:27017 \
  --drop --dir=/backup/mongodb/latest \
  --dryRun

# 验证文件完整性
cd /backup/uploads/latest
find . -type f -exec sha256sum {} \; > checksums.txt
sha256sum -c checksums.txt
```

## 恢复程序

### 紧急响应流程

#### 1. 故障检测与评估 (0-15分钟)
```bash
# 自动检测
- Prometheus告警触发
- 健康检查失败
- 用户报告问题

# 手动评估
./scripts/verify-infrastructure.sh
docker-compose ps
curl -f http://localhost:3000/api/health
```

#### 2. 初步响应 (15-30分钟)
```bash
# 服务状态检查
docker-compose logs --tail=100 app-gateway
docker-compose logs --tail=100 mongodb

# 快速重启尝试
docker-compose restart app-gateway
docker-compose restart mongodb

# 切换到备用服务
# 如果主服务无法恢复，启动备用实例
```

#### 3. 数据恢复 (30-90分钟)

##### 完整数据库恢复
```bash
#!/bin/bash
# 数据库完整恢复脚本

echo "🔄 开始数据库恢复..."

# 停止相关服务
docker-compose stop app-gateway resume-parser-svc scoring-engine-svc report-generator-svc

# 备份当前数据(如果可能)
mongodump --host=mongodb:27017 --out=/backup/emergency/$(date +%Y%m%d_%H%M%S) || true

# 恢复最新备份
LATEST_BACKUP=$(ls -1 /backup/mongodb/ | tail -1)
echo "恢复备份: $LATEST_BACKUP"

mongorestore --host=mongodb:27017 \
  --username=admin \
  --password=${MONGODB_ROOT_PASSWORD} \
  --authenticationDatabase=admin \
  --drop \
  --dir=/backup/mongodb/$LATEST_BACKUP

# 验证数据完整性
mongosh mongodb://admin:${MONGODB_ROOT_PASSWORD}@mongodb:27017/ai-recruitment?authSource=admin \
  --eval "
    print('用户数量:', db.users.countDocuments());
    print('职位数量:', db.jobs.countDocuments());
    print('简历数量:', db.resumes.countDocuments());
  "

# 重启服务
docker-compose up -d

echo "✅ 数据库恢复完成"
```

##### 增量恢复
```bash
#!/bin/bash
# 增量数据恢复脚本

echo "🔄 开始增量数据恢复..."

# 找到最后一次全量备份后的所有增量备份
FULL_BACKUP_DATE=$(date -d '1 day ago' +%Y%m%d)
INCREMENTAL_BACKUPS=$(ls -1 /backup/mongodb/incremental/ | grep "^${FULL_BACKUP_DATE}")

for backup in $INCREMENTAL_BACKUPS; do
  echo "恢复增量备份: $backup"
  mongorestore --host=mongodb:27017 \
    --username=admin \
    --password=${MONGODB_ROOT_PASSWORD} \
    --authenticationDatabase=admin \
    --dir=/backup/mongodb/incremental/$backup
done

echo "✅ 增量恢复完成"
```

#### 4. 服务恢复 (90-180分钟)

##### 完整系统重建
```bash
#!/bin/bash
# 完整系统恢复脚本

echo "🚀 开始完整系统恢复..."

# 1. 清理现有环境
docker-compose down -v
docker system prune -f

# 2. 恢复配置
cp /backup/config/env-latest.backup .env.production
cp /backup/config/docker-compose.production.yml .

# 3. 重建服务
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# 4. 等待服务启动
echo "等待服务启动..."
sleep 60

# 5. 验证服务状态
./scripts/verify-infrastructure.sh

# 6. 恢复数据
./scripts/restore-database.sh

# 7. 恢复文件
rsync -av /backup/uploads/latest/ /var/lib/ai-recruitment/uploads/

echo "✅ 系统恢复完成"
```

#### 5. 验证与测试 (180-240分钟)

##### 功能验证脚本
```bash
#!/bin/bash
# 恢复后功能验证

echo "🧪 开始功能验证..."

# API健康检查
curl -f http://localhost:3000/api/health || exit 1

# 用户登录测试
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' || exit 1

# 文件上传测试
curl -X POST http://localhost:3000/api/upload/resume \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -F "file=@/test/sample-resume.pdf" || exit 1

# 数据库连接测试
mongosh mongodb://admin:${MONGODB_ROOT_PASSWORD}@mongodb:27017/ai-recruitment?authSource=admin \
  --eval "db.runCommand({ping: 1})" || exit 1

echo "✅ 功能验证通过"
```

## 监控与告警

### 关键指标监控
```yaml
# prometheus alerts for disaster recovery
- alert: DisasterRecoveryNeeded
  expr: |
    (
      sum(up{job=~"app-gateway|mongodb|nats"} == 0) > 1
      or
      rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.5
    )
  for: 1m
  labels:
    severity: critical
    category: disaster_recovery
  annotations:
    summary: "Multiple Service Failures - Disaster Recovery May Be Needed"
    description: "{{ $value }} critical services are down or error rate > 50%"
    runbook_url: "https://docs.ai-recruitment.com/disaster-recovery"
```

### 自动化恢复触发
```bash
# 自动化故障检测与恢复脚本
#!/bin/bash

HEALTH_CHECK_URL="http://localhost:3000/api/health"
MAX_FAILURES=3
FAILURE_COUNT=0

while true; do
  if ! curl -f $HEALTH_CHECK_URL >/dev/null 2>&1; then
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
    echo "健康检查失败 ($FAILURE_COUNT/$MAX_FAILURES)"
    
    if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
      echo "触发自动恢复..."
      ./scripts/auto-recovery.sh
      break
    fi
  else
    FAILURE_COUNT=0
  fi
  
  sleep 30
done
```

## 通信计划

### 事故响应团队
- **事故指挥官**: DevOps负责人
- **技术负责人**: 系统架构师
- **沟通协调员**: 产品经理
- **数据库专家**: DBA
- **安全专家**: 安全工程师

### 通知流程
1. **立即通知** (5分钟内): 技术团队
2. **升级通知** (15分钟内): 管理层
3. **用户通知** (30分钟内): 状态页面更新
4. **外部通知** (1小时内): 客户、合作伙伴

### 状态页面模板
```markdown
# 系统状态更新

## 事故概要
时间: [事故发生时间]
影响: [受影响的服务和用户]
状态: [调查中|修复中|已解决]

## 已采取行动
- [时间] [采取的具体行动]
- [时间] [采取的具体行动]

## 下一步计划
- [预计完成时间] [计划的行动]

## 预计恢复时间
[预计服务恢复时间]

最后更新: [更新时间]
```

## 预防措施

### 定期演练
- **月度**: 服务重启演练
- **季度**: 数据恢复演练  
- **半年度**: 完整灾难恢复演练
- **年度**: 跨区域故障切换演练

### 演练检查清单
```markdown
## 灾难恢复演练检查清单

### 准备阶段
- [ ] 通知所有相关人员
- [ ] 准备测试环境
- [ ] 验证备份完整性
- [ ] 确认联系方式更新

### 执行阶段
- [ ] 模拟故障场景
- [ ] 执行恢复程序
- [ ] 记录执行时间
- [ ] 验证功能完整性

### 总结阶段
- [ ] 分析性能指标
- [ ] 识别改进点
- [ ] 更新程序文档
- [ ] 安排后续培训
```

### 容量规划
- **数据增长**: 每月评估存储需求
- **流量增长**: 监控并预测负载趋势
- **备份扩展**: 根据数据量调整备份策略
- **基础设施**: 定期评估硬件资源

## 文档维护

### 更新频率
- **月度**: 更新联系信息和程序细节
- **季度**: 审查和测试所有程序
- **年度**: 完整审查和重写

### 版本控制
- 使用Git管理文档版本
- 重要变更需要团队评审
- 保留历史版本用于审计

---

**文档版本**: v1.0  
**最后更新**: 2025-08-19  
**下次审查**: 2025-11-19  
**负责人**: DevOps团队