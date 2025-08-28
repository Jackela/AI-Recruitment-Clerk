#!/bin/bash

# AI招聘系统监控体系快速部署脚本
# Quick Setup Script for AI Recruitment Monitoring System

set -e

echo "🏥 AI招聘系统监控体系部署脚本"
echo "========================================"

# 检查Docker和Docker Compose
check_prerequisites() {
    echo "📋 检查系统前置条件..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    echo "✅ Docker和Docker Compose已安装"
}

# 创建必要的配置目录
create_directories() {
    echo "📁 创建监控配置目录..."
    
    mkdir -p monitoring/config/{grafana/provisioning/{dashboards,datasources,notifiers},prometheus,alertmanager}
    mkdir -p monitoring/config/grafana/dashboards
    mkdir -p monitoring/data/{prometheus,grafana,alertmanager,jaeger,loki,tempo}
    
    echo "✅ 目录结构创建完成"
}

# 生成基础配置文件
generate_configs() {
    echo "⚙️ 生成监控配置文件..."
    
    # Prometheus配置
    cat > monitoring/config/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'app-gateway'
    static_configs:
      - targets: ['app-gateway:9090']
    metrics_path: '/metrics'

  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - http://app-gateway:3000/api/health
        - http://ai-recruitment-frontend:80/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
EOF

    # AlertManager配置
    cat > monitoring/config/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@ai-recruitment.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  email_configs:
  - to: 'admin@ai-recruitment.com'
    subject: 'AI招聘系统告警: {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      告警: {{ .Annotations.summary }}
      详情: {{ .Annotations.description }}
      时间: {{ .StartsAt }}
      {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

    # Grafana数据源配置
    mkdir -p monitoring/config/grafana/provisioning/datasources
    cat > monitoring/config/grafana/provisioning/datasources/datasources.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    
  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
EOF

    # Grafana仪表板配置
    cat > monitoring/config/grafana/provisioning/dashboards/dashboards.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'AI招聘系统监控'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    # Loki配置
    cat > monitoring/config/loki.yml << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 1h
  max_chunk_age: 1h
  chunk_target_size: 1048576
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /tmp/loki/boltdb-shipper-active
    cache_location: /tmp/loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /tmp/loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
EOF

    # Promtail配置
    cat > monitoring/config/promtail.yml << 'EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*log

    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          expressions:
            tag:
          source: attrs
      - regex:
          expression: (?P<container_name>(?:[^|].*))
          source: tag
      - timestamp:
          format: RFC3339Nano
          source: time
      - labels:
          stream:
          container_name:
      - output:
          source: output
EOF

    # BlackBox Exporter配置
    cat > monitoring/config/blackbox.yml << 'EOF'
modules:
  http_2xx:
    prober: http
    http:
      valid_status_codes: []
      method: GET
      follow_redirects: true
      preferred_ip_protocol: "ip4"
EOF

    # Tempo配置
    cat > monitoring/config/tempo.yml << 'EOF'
server:
  http_listen_port: 3200

distributor:
  receivers:
    jaeger:
      protocols:
        thrift_http:
        grpc:
        thrift_binary:
        thrift_compact:
    otlp:
      protocols:
        grpc:
        http:

ingester:
  trace_idle_period: 10s
  max_block_bytes: 1_000_000
  max_block_duration: 5m

compactor:
  compaction:
    compaction_window: 1h
    max_compaction_objects: 1000000
    block_retention: 1h
    compacted_block_retention: 10m

storage:
  trace:
    backend: local
    local:
      path: /tmp/tempo/traces
    wal:
      path: /tmp/tempo/wal
    pool:
      max_workers: 100
      queue_depth: 10000
EOF

    echo "✅ 配置文件生成完成"
}

# 设置环境变量
setup_environment() {
    echo "🔧 配置环境变量..."
    
    if [ ! -f .env.monitoring ]; then
        cat > .env.monitoring << 'EOF'
# 监控系统环境变量配置
GRAFANA_ADMIN_PASSWORD=admin123
MONGODB_ROOT_PASSWORD=mongodb123
REDIS_URL=redis://redis:6379
MONGODB_URL=mongodb://admin:mongodb123@mongodb:27017/admin

# 可选配置
JAEGER_ENDPOINT=http://jaeger:14250
PROMETHEUS_PORT=9090
ENABLE_TRACING=true
ENABLE_METRICS=true
TRACE_SAMPLE_RATE=1.0

# 告警配置
SMTP_HOST=localhost
SMTP_PORT=587
ALERT_EMAIL=admin@ai-recruitment.com
EOF
        echo "✅ 环境变量文件已创建: .env.monitoring"
        echo "⚠️  请根据实际情况修改 .env.monitoring 中的配置"
    else
        echo "✅ 环境变量文件已存在"
    fi
}

# 启动监控服务
start_monitoring() {
    echo "🚀 启动监控服务..."
    
    # 加载环境变量
    if [ -f .env.monitoring ]; then
        export $(grep -v '^#' .env.monitoring | xargs)
    fi
    
    # 启动核心监控服务
    echo "📊 启动核心监控服务..."
    docker-compose -f monitoring/docker-compose.monitoring.yml up -d \
        prometheus grafana alertmanager jaeger loki promtail tempo \
        node-exporter cadvisor blackbox-exporter
    
    # 等待服务启动
    echo "⏳ 等待服务启动完成..."
    sleep 30
    
    # 检查服务状态
    check_services
}

# 检查服务状态
check_services() {
    echo "🔍 检查服务状态..."
    
    services=(
        "prometheus:9090"
        "grafana:3001"
        "alertmanager:9093"
        "jaeger:16686"
        "loki:3100"
    )
    
    for service in "${services[@]}"; do
        name=$(echo $service | cut -d':' -f1)
        port=$(echo $service | cut -d':' -f2)
        
        if curl -s http://localhost:$port > /dev/null; then
            echo "✅ $name 服务正常 (端口 $port)"
        else
            echo "❌ $name 服务异常 (端口 $port)"
        fi
    done
}

# 显示访问信息
show_access_info() {
    echo ""
    echo "🎉 监控系统部署完成！"
    echo "========================================"
    echo "📊 Grafana 仪表板: http://localhost:3001"
    echo "   用户名: admin"
    echo "   密码: admin123"
    echo ""
    echo "📈 Prometheus: http://localhost:9090"
    echo "🚨 AlertManager: http://localhost:9093"
    echo "🔍 Jaeger 追踪: http://localhost:16686"
    echo "📝 Loki 日志: http://localhost:3100"
    echo ""
    echo "📚 更多信息请参考: docs/monitoring-system-implementation-report.md"
    echo "========================================"
}

# 清理函数
cleanup() {
    echo "🧹 清理监控服务..."
    docker-compose -f monitoring/docker-compose.monitoring.yml down -v
    echo "✅ 清理完成"
}

# 主函数
main() {
    case "${1:-install}" in
        "install")
            check_prerequisites
            create_directories
            generate_configs
            setup_environment
            start_monitoring
            show_access_info
            ;;
        "start")
            echo "🚀 启动监控服务..."
            docker-compose -f monitoring/docker-compose.monitoring.yml up -d
            check_services
            show_access_info
            ;;
        "stop")
            echo "🛑 停止监控服务..."
            docker-compose -f monitoring/docker-compose.monitoring.yml down
            ;;
        "restart")
            echo "🔄 重启监控服务..."
            docker-compose -f monitoring/docker-compose.monitoring.yml restart
            check_services
            ;;
        "status")
            check_services
            ;;
        "cleanup")
            cleanup
            ;;
        "logs")
            docker-compose -f monitoring/docker-compose.monitoring.yml logs -f "${2:-}"
            ;;
        *)
            echo "用法: $0 {install|start|stop|restart|status|cleanup|logs [service]}"
            echo ""
            echo "命令说明:"
            echo "  install  - 完整安装和启动监控系统"
            echo "  start    - 启动监控服务"
            echo "  stop     - 停止监控服务"
            echo "  restart  - 重启监控服务"
            echo "  status   - 检查服务状态"
            echo "  cleanup  - 清理所有监控数据和服务"
            echo "  logs     - 查看服务日志"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"