# Operations Runbook - AI Recruitment Clerk

## 1. Document Overview

**Document Title**: Production Operations Runbook  
**System**: AI Recruitment Clerk  
**Version**: 1.0  
**Status**: Production Ready  
**Last Updated**: August 2025  
**On-Call Team**: DevOps & Engineering  

## 2. System Overview

AI Recruitment Clerk is a microservices-based recruitment platform with event-driven architecture. The system processes resumes and job descriptions to generate intelligent matching reports using AI technology.

### 2.1 Production Environment
- **Infrastructure**: Docker Compose orchestration
- **Services**: 9 containers (7 business services + 2 infrastructure)
- **Database**: MongoDB with replica sets
- **Message Queue**: NATS JetStream
- **Cache**: Redis with memory fallback
- **Monitoring**: Prometheus, Grafana, ELK Stack

### 2.2 Service Inventory
| Service | Port | Health Check | Dependencies |
|---------|------|--------------|--------------|
| ai-frontend | 4200 | HTTP /health | app-gateway |
| app-gateway | 3000 | GET /api/health | mongodb, nats, redis |
| resume-parser-svc | 3001 | GET /health | mongodb, nats, gemini-api |
| jd-extractor-svc | 3002 | GET /health | mongodb, nats |
| scoring-engine-svc | 3003 | GET /health | mongodb, nats |
| report-generator-svc | 3004 | GET /health | mongodb, nats |
| mongodb | 27017 | mongosh ping | - |
| nats | 4222/8222 | nc -z localhost 4222 | - |
| redis | 6379 | redis-cli ping | - |

## 3. Deployment Procedures

### 3.1 Production Deployment

#### Pre-deployment Checklist
- [ ] All tests passing (503/503 unit tests)
- [ ] Docker images built successfully
- [ ] Database migrations reviewed
- [ ] Security scan completed
- [ ] Performance benchmarks verified
- [ ] Rollback plan prepared

#### Deployment Steps

**Windows Deployment**
```cmd
# 1. Stop existing system
docker-compose down

# 2. Pull latest images
docker-compose pull

# 3. Start system with health checks
start-system.bat

# 4. Validate deployment
validate-system.bat

# 5. Run E2E tests
run-e2e-tests.bat
```

**Linux/macOS Deployment**
```bash
# 1. Stop existing system
docker-compose down

# 2. Pull latest images  
docker-compose pull

# 3. Start system with health checks
./start-system.sh

# 4. Validate deployment
./validate-system.sh

# 5. Run E2E tests
./run-e2e-tests.sh
```

#### Deployment Validation
```bash
# System health verification
curl -f http://localhost:3000/api/health
curl -f http://localhost:4200/

# Service connectivity test
docker-compose logs app-gateway | grep "successfully started"
docker-compose logs nats | grep "Server is ready"
docker-compose logs mongodb | grep "waiting for connections"
```

### 3.2 Rollback Procedures

#### Emergency Rollback
```bash
# 1. Stop current deployment
docker-compose down

# 2. Restore previous version
docker-compose -f docker-compose.rollback.yml up -d

# 3. Verify rollback
./validate-system.sh

# 4. Monitor for 30 minutes
watch -n 30 'curl -s http://localhost:3000/api/health'
```

#### Database Rollback
```bash
# 1. Stop applications
docker-compose stop app-gateway resume-parser-svc jd-extractor-svc scoring-engine-svc report-generator-svc

# 2. Restore database backup
mongorestore --host localhost:27017 --username admin --password password123 --authenticationDatabase admin --db ai-recruitment /backup/mongodb-$(date -d yesterday +%Y%m%d)

# 3. Restart applications
docker-compose start app-gateway resume-parser-svc jd-extractor-svc scoring-engine-svc report-generator-svc
```

## 4. Monitoring & Alerting

### 4.1 Key Performance Indicators (KPIs)

#### System Health Metrics
| Metric | Target | Critical Threshold | Alert Channel |
|--------|--------|-------------------|---------------|
| System Uptime | 99.9% | < 99.5% | PagerDuty |
| API Response Time (P95) | < 200ms | > 500ms | Slack |
| Resume Processing Time | < 30s | > 60s | Slack |
| Error Rate | < 0.1% | > 1% | PagerDuty |
| Cache Hit Rate | > 80% | < 50% | Email |
| Database Connection Pool | < 80% | > 90% | Slack |

#### Business Metrics
| Metric | Target | Measurement | Dashboard |
|--------|--------|-------------|-----------|
| Resume Processing Volume | 1000/day | Daily count | Grafana |
| Matching Accuracy | > 95% | User feedback | Business Intelligence |
| User Satisfaction | > 4.5/5 | Survey scores | CRM Integration |
| Processing Success Rate | > 99% | Error logs | Ops Dashboard |

### 4.2 Monitoring Stack Configuration

#### Prometheus Metrics Collection
```yaml
# Key metrics collected
- api_requests_total (counter)
- api_request_duration_seconds (histogram)
- cache_hits_total / cache_misses_total (counter)
- database_connections_active (gauge)
- resume_processing_duration_seconds (histogram)
- llm_api_calls_total / llm_api_failures_total (counter)
- system_memory_usage / system_cpu_usage (gauge)
```

#### Grafana Dashboard Components
- **System Overview**: Service status, response times, error rates
- **Cache Performance**: Hit rates, memory usage, eviction rates
- **Database Metrics**: Connection pools, query performance, storage usage
- **Business Metrics**: Processing volumes, success rates, user activity
- **Alert Status**: Current alerts, alert history, resolution times

#### Log Management (ELK Stack)
```yaml
Log Sources:
  - Application Logs: Structured JSON logs from all services
  - Access Logs: Nginx/API Gateway request logs
  - System Logs: Docker container and system metrics
  - Security Logs: Authentication events, suspicious activities
  - Performance Logs: Slow queries, high CPU usage events

Log Retention:
  - Debug Logs: 7 days
  - Info Logs: 30 days  
  - Warning/Error Logs: 90 days
  - Security Logs: 1 year
  - Audit Logs: 7 years
```

### 4.3 Alerting Rules

#### Critical Alerts (PagerDuty)
```yaml
System Down:
  condition: "up == 0"
  duration: "1m"
  action: "Immediate page to on-call engineer"

High Error Rate:
  condition: "rate(http_requests_total{code=~'5..'}[5m]) > 0.01"
  duration: "5m" 
  action: "Page with severity: critical"

Database Connection Failure:
  condition: "mongodb_up == 0"
  duration: "30s"
  action: "Immediate page + auto-restart attempt"

LLM API Failure:
  condition: "rate(llm_api_failures_total[5m]) > 0.05"
  duration: "2m"
  action: "Page + activate fallback mode"
```

#### Warning Alerts (Slack)
```yaml
High Response Time:
  condition: "histogram_quantile(0.95, http_request_duration_seconds) > 0.5"
  duration: "10m"
  action: "Slack notification to #operations"

Low Cache Hit Rate:
  condition: "cache_hit_rate < 0.5"
  duration: "15m"
  action: "Slack notification + cache warming trigger"

High Memory Usage:
  condition: "container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.8"
  duration: "5m"
  action: "Slack notification + scaling recommendation"
```

## 5. Incident Response Procedures

### 5.1 Incident Classification

#### Severity Levels
- **P1 - Critical**: System down, data loss, security breach
- **P2 - High**: Major feature broken, performance severely degraded
- **P3 - Medium**: Minor feature broken, performance impact
- **P4 - Low**: Cosmetic issues, non-critical functionality

#### Response Times
| Severity | Response Time | Resolution Target | Communication |
|----------|---------------|------------------|---------------|
| P1 | 5 minutes | 1 hour | Hourly updates |
| P2 | 15 minutes | 4 hours | Every 2 hours |
| P3 | 1 hour | 1 business day | Daily updates |
| P4 | 4 hours | 1 week | Weekly updates |

### 5.2 Common Incident Playbooks

#### P1: System Completely Down
```yaml
Immediate Actions (0-5 minutes):
  1. Acknowledge alert in PagerDuty
  2. Check overall system status: ./validate-system.sh
  3. Verify infrastructure: docker-compose ps
  4. Check logs: docker-compose logs --tail=100
  5. Start communication thread in #incident-response

Investigation (5-15 minutes):
  6. Check service dependencies (DB, NATS, Redis)
  7. Review recent deployments and changes
  8. Analyze error patterns in logs
  9. Check resource utilization (CPU, memory, disk)

Resolution (15-60 minutes):
  10. Attempt service restart if root cause identified
  11. Rollback to previous version if deployment-related
  12. Scale resources if capacity issue
  13. Engage vendor support for infrastructure issues

Post-Incident:
  14. Conduct blameless post-mortem within 48 hours
  15. Document lessons learned and preventive measures
  16. Update runbook and monitoring based on findings
```

#### P1: LLM API Service Outage
```yaml
Detection:
  - Alert: "LLM API failure rate > 5% for 2 minutes"
  - Symptoms: Resume processing failures, timeout errors

Immediate Response (0-2 minutes):
  1. Acknowledge alert and assess scope
  2. Check Gemini API status page
  3. Verify API key validity and quotas
  4. Test API connectivity: curl -X POST api-endpoint

Fallback Activation (2-5 minutes):
  5. Enable OCR fallback mode in resume-parser-svc
  6. Reduce processing quality to maintain availability
  7. Notify users of temporary service degradation
  8. Monitor fallback performance metrics

Resolution (5-15 minutes):
  9. Contact Gemini support if API issue confirmed
  10. Implement request retry logic if transient issue
  11. Scale down processing if quota limits hit
  12. Consider alternative LLM providers for critical operations

Recovery:
  13. Gradually restore normal processing when service recovers
  14. Reprocess failed resumes using full LLM capability
  15. Update cost monitoring and quota management
  16. Document incident and improve fallback procedures
```

#### P2: High Response Times (> 500ms P95)
```yaml
Detection:
  - Alert: "API response time P95 > 500ms for 10 minutes"
  - Symptoms: User complaints about slow performance

Investigation (0-5 minutes):
  1. Check current load and traffic patterns
  2. Review cache hit rates and cache health
  3. Examine database query performance
  4. Analyze resource utilization across services

Quick Fixes (5-15 minutes):
  5. Clear cache and trigger cache warmup if hit rate low
  6. Restart Redis if cache issues detected
  7. Scale up containers if CPU/memory usage high
  8. Enable request throttling if traffic spike

Root Cause Analysis (15-60 minutes):
  9. Identify slow database queries using logs
  10. Check for memory leaks or resource exhaustion
  11. Review recent code changes for performance regressions
  12. Analyze external service latencies (LLM API)

Resolution:
  13. Optimize identified slow queries
  14. Restart services if memory leaks detected
  15. Rollback if recent deployment caused regression
  16. Implement caching for expensive operations
```

#### P2: Database Connection Issues
```yaml
Detection:
  - Alert: "MongoDB connection failures"
  - Symptoms: Database connection errors, query failures

Immediate Actions (0-2 minutes):
  1. Check MongoDB container status: docker-compose ps mongodb
  2. Verify MongoDB health: docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
  3. Check connection pool status in application logs
  4. Review MongoDB resource usage

Diagnosis (2-10 minutes):
  5. Examine MongoDB logs for error patterns
  6. Check replica set status if configured
  7. Verify disk space and memory availability
  8. Test connection from application containers

Resolution (10-30 minutes):
  9. Restart MongoDB container if service issues
  10. Scale MongoDB resources if capacity issues
  11. Restart application services to reset connection pools
  12. Repair database if corruption detected

Prevention:
  13. Implement connection pool monitoring
  14. Add automated disk space cleanup
  15. Configure MongoDB alerting for resource usage
  16. Document connection pool optimization settings
```

#### P3: Cache Performance Degradation
```yaml
Detection:
  - Alert: "Cache hit rate < 50% for 15 minutes"
  - Symptoms: Slower response times, increased database load

Investigation (0-5 minutes):
  1. Check Redis container status and health
  2. Review cache memory usage and eviction patterns
  3. Analyze cache key patterns and TTL settings
  4. Examine application cache usage logs

Analysis (5-15 minutes):
  5. Identify most frequently missed cache keys
  6. Check if cache warming is functioning correctly
  7. Review cache invalidation patterns
  8. Analyze memory pressure and allocation

Resolution (15-45 minutes):
  9. Trigger manual cache warmup for critical data
  10. Adjust TTL settings for frequently accessed data
  11. Increase Redis memory limits if needed
  12. Optimize cache key structure for better hit rates

Improvement:
  13. Implement intelligent cache preloading
  14. Add cache performance monitoring dashboards
  15. Optimize application caching strategies
  16. Document cache tuning procedures
```

### 5.3 Communication Procedures

#### Internal Communication
- **Slack Channels**: #operations, #incident-response, #engineering
- **PagerDuty**: On-call rotation with escalation policies
- **Status Page**: Internal status dashboard for engineering team
- **Email Lists**: ops-team@company.com, engineering@company.com

#### External Communication
- **User Notifications**: In-app announcements, email notifications
- **Status Page**: Public status page for transparency
- **Customer Support**: Integrated ticketing system updates
- **Social Media**: Twitter/LinkedIn for major incidents

#### Communication Templates
```yaml
P1 Incident Notification:
  Subject: "[P1] AI Recruitment Clerk - System Outage"
  Body: |
    INCIDENT: System-wide outage affecting all users
    START TIME: [timestamp]
    IMPACT: Users cannot access the application
    STATUS: Investigation in progress
    ETA: Updates every 15 minutes
    CONTACT: [on-call engineer]

P2 Performance Issue:
  Subject: "[P2] AI Recruitment Clerk - Performance Degradation"
  Body: |
    INCIDENT: Slower response times system-wide
    START TIME: [timestamp]  
    IMPACT: Users experiencing delays (30-60s)
    STATUS: Investigation and mitigation in progress
    ETA: Resolution within 2 hours
    CONTACT: [engineering team]
```

## 6. Maintenance Procedures

### 6.1 Routine Maintenance

#### Daily Operations
- **Morning Checklist** (9:00 AM):
  - [ ] Verify all services are healthy
  - [ ] Check overnight processing volumes
  - [ ] Review error logs and alerts
  - [ ] Validate backup completion
  - [ ] Monitor resource utilization trends

- **Evening Checklist** (6:00 PM):
  - [ ] Review daily performance metrics
  - [ ] Check for any outstanding alerts
  - [ ] Verify cache performance statistics
  - [ ] Monitor LLM API usage and costs
  - [ ] Prepare for overnight batch processing

#### Weekly Maintenance
- **System Health Review** (Mondays):
  - [ ] Analyze weekly performance trends
  - [ ] Review and optimize slow database queries
  - [ ] Update security patches for base images
  - [ ] Validate backup and restore procedures
  - [ ] Review capacity planning metrics

- **Security Review** (Wednesdays):
  - [ ] Review access logs for suspicious activity
  - [ ] Update dependency security patches
  - [ ] Verify SSL certificate expiration dates
  - [ ] Check for new security vulnerabilities
  - [ ] Validate firewall and access controls

#### Monthly Maintenance
- **Capacity Planning** (First Monday):
  - [ ] Analyze resource usage trends
  - [ ] Project capacity needs for next quarter
  - [ ] Review and optimize resource allocation
  - [ ] Plan infrastructure scaling activities
  - [ ] Update disaster recovery procedures

- **Performance Tuning** (Third Monday):
  - [ ] Database performance optimization
  - [ ] Cache strategy review and tuning
  - [ ] Application performance profiling
  - [ ] Network and I/O optimization
  - [ ] Load testing validation

### 6.2 Database Maintenance

#### Daily Database Tasks
```bash
# Check database health
docker-compose exec mongodb mongosh --eval "
  db.adminCommand('ping');
  db.stats();
  db.serverStatus().connections;
"

# Monitor slow queries
docker-compose exec mongodb mongosh --eval "
  db.setProfilingLevel(2, { slowms: 1000 });
  db.system.profile.find().limit(5).sort({ ts: -1 });
"

# Check replica set status (if applicable)
docker-compose exec mongodb mongosh --eval "rs.status()"
```

#### Weekly Database Tasks
```bash
# Database optimization
docker-compose exec mongodb mongosh ai-recruitment --eval "
  db.runCommand({compact: 'jobs'});
  db.runCommand({compact: 'resumes'});
  db.runCommand({compact: 'reports'});
"

# Index analysis and optimization
docker-compose exec mongodb mongosh ai-recruitment --eval "
  db.jobs.getIndexes();
  db.resumes.getIndexes(); 
  db.stats();
"

# Backup verification
mongorestore --dry-run --host localhost:27017 /backup/latest/
```

#### Monthly Database Tasks
```bash
# Full backup and archival
mongodump --host localhost:27017 --username admin --password password123 --authenticationDatabase admin --gzip --archive=/backup/monthly/ai-recruitment-$(date +%Y%m).gz

# Database compaction and optimization
docker-compose exec mongodb mongosh --eval "
  db.runCommand({planCacheClear: 'jobs'});
  db.runCommand({planCacheClear: 'resumes'});
  db.runCommand({reIndex: 'jobs'});
  db.runCommand({reIndex: 'resumes'});
"

# Retention policy enforcement
docker-compose exec mongodb mongosh ai-recruitment --eval "
  // Remove old audit logs (older than 1 year)
  db.audit_logs.deleteMany({createdAt: {\$lt: new Date(Date.now() - 365*24*60*60*1000)}});
  
  // Archive old processed resumes (older than 6 months)
  db.processed_resumes.find({processedAt: {\$lt: new Date(Date.now() - 180*24*60*60*1000)}});
"
```

### 6.3 Cache Maintenance

#### Daily Cache Operations
```bash
# Check Redis health and statistics
docker-compose exec redis redis-cli INFO stats
docker-compose exec redis redis-cli INFO memory

# Monitor cache performance
curl -s http://localhost:3000/api/cache/metrics | jq .

# Verify cache warmup is functioning
curl -s http://localhost:3000/api/cache/warmup/status | jq .
```

#### Weekly Cache Optimization
```bash
# Analyze cache key patterns
docker-compose exec redis redis-cli --scan --pattern "*" | head -20

# Check cache memory usage and eviction
docker-compose exec redis redis-cli INFO keyspace
docker-compose exec redis redis-cli INFO stats | grep evicted

# Manual cache warmup for critical data
curl -X POST http://localhost:3000/api/cache/warmup/trigger

# Clear stale cache entries if needed
docker-compose exec redis redis-cli EVAL "
  local keys = redis.call('keys', ARGV[1])
  for i=1,#keys,5000 do
    redis.call('del', unpack(keys, i, math.min(i+4999, #keys)))
  end
  return #keys
" 0 "stale:*"
```

### 6.4 Security Maintenance

#### Security Monitoring
```bash
# Check for failed authentication attempts
grep "authentication failed" /var/log/ai-recruitment/*.log | tail -20

# Review access patterns
grep "POST\|PUT\|DELETE" /var/log/nginx/access.log | grep -v "200\|201\|204" | tail -20

# Verify SSL certificate status
openssl s_client -connect localhost:443 -servername localhost < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Check for suspicious file uploads
find /app/uploads -type f -size +100M -mtime -1 -ls
```

#### Security Updates
```bash
# Update base Docker images
docker-compose pull
docker-compose build --pull --no-cache

# Scan for vulnerabilities
docker scan app-gateway:latest
docker scan resume-parser-svc:latest

# Update dependencies
npm audit fix
npm update

# Rotate API keys (monthly)
# 1. Generate new Gemini API key
# 2. Update environment variables
# 3. Test with new key
# 4. Revoke old key after 24 hours
```

## 7. Backup and Recovery

### 7.1 Backup Strategy

#### Backup Schedule
- **Database Backups**: Daily at 2:00 AM UTC
- **File Storage Backups**: Daily at 3:00 AM UTC  
- **Configuration Backups**: Weekly on Sundays
- **Full System Backup**: Monthly on 1st Sunday

#### Automated Backup Script
```bash
#!/bin/bash
# backup-system.sh - Comprehensive system backup

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/backup"

# Database backup
echo "Starting MongoDB backup..."
mongodump --host localhost:27017 \
  --username admin --password password123 \
  --authenticationDatabase admin \
  --gzip --archive="$BACKUP_ROOT/mongodb/mongodb_$DATE.gz"

# GridFS file backup
echo "Backing up GridFS files..."
mongofiles --host localhost:27017 \
  --username admin --password password123 \
  --authenticationDatabase admin \
  --db ai-recruitment \
  list | grep -E '\.pdf$|\.docx$' > "$BACKUP_ROOT/files/files_$DATE.list"

# Configuration backup
echo "Backing up configuration files..."
tar -czf "$BACKUP_ROOT/config/config_$DATE.tar.gz" \
  docker-compose.yml \
  .env* \
  nginx.conf \
  monitoring/

# Cleanup old backups (keep 30 days)
find "$BACKUP_ROOT" -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 7.2 Recovery Procedures

#### Database Recovery
```bash
# Full database restore
mongorestore --host localhost:27017 \
  --username admin --password password123 \
  --authenticationDatabase admin \
  --drop --gzip --archive=/backup/mongodb/mongodb_YYYYMMDD_HHMMSS.gz

# Selective collection restore
mongorestore --host localhost:27017 \
  --username admin --password password123 \
  --authenticationDatabase admin \
  --db ai-recruitment \
  --collection jobs \
  /backup/mongodb/selective/jobs.bson
```

#### Point-in-Time Recovery
```bash
# Stop all application services
docker-compose stop app-gateway resume-parser-svc jd-extractor-svc scoring-engine-svc report-generator-svc

# Restore database to specific point in time
mongorestore --host localhost:27017 \
  --username admin --password password123 \
  --authenticationDatabase admin \
  --drop --gzip --archive=/backup/mongodb/mongodb_target_date.gz

# Validate data integrity
docker-compose exec mongodb mongosh ai-recruitment --eval "
  db.jobs.count();
  db.resumes.count();
  db.reports.count();
"

# Restart applications
docker-compose start app-gateway resume-parser-svc jd-extractor-svc scoring-engine-svc report-generator-svc
```

#### Disaster Recovery
```bash
# Complete system recovery procedure
# 1. Provision new infrastructure
# 2. Install Docker and Docker Compose
# 3. Restore configuration files
tar -xzf /backup/config/config_latest.tar.gz

# 4. Start infrastructure services
docker-compose up -d mongodb nats redis

# 5. Wait for infrastructure to be ready
./validate-system.sh --infrastructure-only

# 6. Restore database
mongorestore --host localhost:27017 \
  --username admin --password password123 \
  --authenticationDatabase admin \
  --drop --gzip --archive=/backup/mongodb/mongodb_latest.gz

# 7. Start application services
docker-compose up -d app-gateway resume-parser-svc jd-extractor-svc scoring-engine-svc report-generator-svc ai-frontend

# 8. Validate complete system
./validate-system.sh

# 9. Run E2E tests to verify functionality
./run-e2e-tests.sh

# 10. Update DNS and load balancer configurations
# 11. Monitor system performance for 24 hours
```

## 8. Performance Optimization

### 8.1 Performance Monitoring

#### Key Performance Metrics
```yaml
Application Performance:
  - API Response Time: P50, P95, P99 percentiles
  - Resume Processing Time: Average and P95
  - Cache Hit Ratio: Overall and per-service
  - Database Query Performance: Slow query analysis
  - Memory Usage: Per-service memory consumption
  - CPU Utilization: System and per-container usage

Business Performance:
  - Processing Volume: Resumes/hour, jobs/hour
  - Success Rate: Successful processing percentage
  - User Activity: Active users, session duration
  - Feature Usage: Most/least used features
  - Error Rates: By service and operation type
```

#### Performance Dashboards
```yaml
Real-time Dashboard:
  - Current RPS (Requests Per Second)
  - Active user count
  - Cache hit rate (last 5 minutes)
  - Average response time (last 5 minutes)
  - Error rate (last 5 minutes)
  - Database connection pool usage

Historical Dashboard:
  - Daily/Weekly/Monthly trends
  - Performance regression detection
  - Capacity planning metrics
  - SLA compliance tracking
  - Cost optimization opportunities
```

### 8.2 Optimization Procedures

#### Database Optimization
```bash
# Monthly index optimization
docker-compose exec mongodb mongosh ai-recruitment --eval "
  // Analyze query patterns
  db.setProfilingLevel(2, { slowms: 100 });
  
  // Most common queries
  db.system.profile.aggregate([
    {\$group: {_id: '\$command', count: {\$sum: 1}}},
    {\$sort: {count: -1}},
    {\$limit: 10}
  ]);
  
  // Create missing indexes
  db.jobs.createIndex({companyName: 1, createdAt: -1});
  db.resumes.createIndex({candidateName: 1, processedAt: -1});
  db.reports.createIndex({jobId: 1, resumeId: 1, generatedAt: -1});
"

# Query optimization
docker-compose exec mongodb mongosh ai-recruitment --eval "
  // Analyze slow queries
  db.system.profile.find({millis: {\$gt: 1000}}).sort({ts: -1}).limit(5);
  
  // Check index usage
  db.jobs.find({status: 'active'}).explain('executionStats');
"
```

#### Cache Optimization
```bash
# Intelligent cache warming based on usage patterns
curl -X POST "http://localhost:3000/api/cache/warmup/intelligent"

# Cache hit rate analysis
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Memory optimization
redis-cli CONFIG GET maxmemory*
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"

# Eviction policy optimization
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

#### Application Performance Tuning
```bash
# Node.js performance optimization
export NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"

# Connection pool tuning
# MongoDB: Set maxPoolSize=20, minPoolSize=5
# Redis: Set maxRetriesPerRequest=3, retryDelayOnFailover=100

# Async processing optimization
# Enable clustering: NODE_ENV=production node cluster.js
# Implement worker threads for CPU-intensive tasks
```

## 9. Security Operations

### 9.1 Security Monitoring

#### Security Metrics
```yaml
Authentication:
  - Failed login attempts per hour
  - Successful login rate
  - Password reset requests
  - Account lockout incidents
  - Multi-factor authentication usage

Access Control:
  - Privilege escalation attempts  
  - Unauthorized access attempts
  - API key usage patterns
  - Role-based access violations
  - Administrative action audit

Data Security:
  - File upload security scans
  - Data encryption status
  - PII access patterns
  - Data retention compliance
  - Backup encryption validation
```

#### Security Alerting
```yaml
Critical Security Alerts:
  - Multiple failed login attempts (>5 in 5 minutes)
  - Privilege escalation detected
  - Unusual API access patterns
  - Malware detected in uploads
  - Unauthorized configuration changes

Warning Security Alerts:
  - New user registrations spike
  - Unusual geographic access patterns
  - High volume API usage
  - SSL certificate expiry (30 days)
  - Security patch availability
```

### 9.2 Security Procedures

#### Daily Security Checks
```bash
# Check for failed authentication attempts
grep "Authentication failed" /var/log/ai-recruitment/auth.log | wc -l

# Monitor suspicious file uploads
find /app/uploads -type f -name "*.exe" -o -name "*.bat" -o -name "*.sh" -ls

# Review API access logs
tail -1000 /var/log/nginx/access.log | grep -E "POST|PUT|DELETE" | grep -v "200\|201\|204"

# Check SSL certificate validity
echo | openssl s_client -connect localhost:443 2>/dev/null | openssl x509 -noout -dates
```

#### Weekly Security Tasks
```bash
# Update security patches
docker-compose build --pull --no-cache
npm audit fix --force

# Scan for vulnerabilities
docker scan app-gateway:latest --severity high
docker scan resume-parser-svc:latest --severity high

# Review user access patterns
grep "login" /var/log/ai-recruitment/auth.log | awk '{print $5}' | sort | uniq -c | sort -nr

# Validate backup encryption
gpg --verify /backup/mongodb/mongodb_latest.gz.sig
```

#### Monthly Security Review
```bash
# Comprehensive security audit
# 1. Review all user accounts and permissions
# 2. Check for unused API keys and tokens
# 3. Validate firewall rules and network policies
# 4. Review third-party integrations and permissions
# 5. Conduct penetration testing
# 6. Update incident response procedures
# 7. Review and update security documentation
```

## 10. Troubleshooting Guide

### 10.1 Common Issues

#### Service Startup Issues
```yaml
Problem: "Container fails to start"
Symptoms:
  - Docker container exits immediately
  - Health check failures
  - Port binding errors

Troubleshooting Steps:
  1. Check container logs: docker-compose logs [service-name]
  2. Verify port availability: netstat -tulpn | grep [port]
  3. Check environment variables: docker-compose config
  4. Validate file permissions: ls -la /app/
  5. Test service dependencies: docker-compose ps

Resolution:
  - Fix configuration issues in environment files
  - Resolve port conflicts by changing ports
  - Update file permissions: chmod +x /app/entrypoint.sh
  - Restart dependencies before main service
```

#### Database Connection Issues
```yaml
Problem: "Cannot connect to MongoDB"
Symptoms:
  - Connection timeout errors
  - Authentication failures
  - Database query failures

Troubleshooting Steps:
  1. Check MongoDB status: docker-compose ps mongodb
  2. Test connection: docker-compose exec mongodb mongosh
  3. Verify credentials in environment files
  4. Check network connectivity: docker network ls
  5. Review MongoDB logs: docker-compose logs mongodb

Resolution:
  - Restart MongoDB container: docker-compose restart mongodb
  - Fix authentication credentials in .env files
  - Recreate Docker network if corrupted
  - Check MongoDB configuration for binding issues
```

#### Performance Issues
```yaml
Problem: "Slow API response times"
Symptoms:
  - Response times > 5 seconds
  - User complaints about slowness
  - High CPU/memory usage

Troubleshooting Steps:
  1. Check current load: docker stats
  2. Review cache hit rates: curl /api/cache/metrics
  3. Analyze slow database queries
  4. Monitor external API response times
  5. Check for memory leaks

Resolution:
  - Scale up services: docker-compose up --scale app-gateway=2
  - Clear and warm cache: curl -X POST /api/cache/warmup/trigger
  - Optimize database queries and add indexes
  - Restart services to clear memory leaks
```

### 10.2 Diagnostic Commands

#### System Health Diagnostics
```bash
# Complete system health check
./validate-system.sh

# Individual service health
curl -f http://localhost:3000/api/health
curl -f http://localhost:3001/health
curl -f http://localhost:3002/health
curl -f http://localhost:3003/health
curl -f http://localhost:3004/health

# Container resource usage
docker stats --no-stream

# Network connectivity
docker-compose exec app-gateway nc -zv mongodb 27017
docker-compose exec app-gateway nc -zv nats 4222
docker-compose exec app-gateway nc -zv redis 6379
```

#### Performance Diagnostics
```bash
# Database performance
docker-compose exec mongodb mongosh --eval "db.serverStatus().opcounters"
docker-compose exec mongodb mongosh --eval "db.stats()"

# Cache performance  
docker-compose exec redis redis-cli INFO stats
curl -s http://localhost:3000/api/cache/metrics | jq .

# Memory and CPU usage
docker exec [container-id] cat /proc/meminfo
docker exec [container-id] top -bn1 | head -20

# Network analysis
docker-compose exec app-gateway netstat -tulpn
docker network inspect ai-recruitment-clerk_ai-recruitment-network
```

#### Log Analysis
```bash
# Error log analysis
docker-compose logs --tail=1000 | grep -i error | tail -20

# Performance log analysis
docker-compose logs --tail=1000 app-gateway | grep "duration" | tail -10

# Security log analysis
docker-compose logs --tail=1000 | grep -E "authentication|authorization|failed" | tail -20

# Database log analysis
docker-compose logs mongodb | grep -E "slow|error|warning" | tail -10
```

---

**Document Status**: Production Ready  
**Maintenance Schedule**: Updated monthly or after major incidents  
**Review Cycle**: Quarterly review with engineering and operations teams  
**Contact Information**: DevOps Team - devops@company.com, On-Call - +1-XXX-XXX-XXXX