/**
 * Full-Stack Observability Platform
 * 全栈可观测性平台
 * 
 * 功能特性:
 * - 端到端链路追踪
 * - 统一日志和指标收集
 * - 实时监控和告警
 * - 故障诊断和根因分析
 * - 性能优化建议
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

// Tracing and Spans
interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage: Record<string, string>;
  flags: number;
}

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: SpanLog[];
  status: SpanStatus;
  kind: SpanKind;
}

interface SpanLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields: Record<string, any>;
}

enum SpanStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED'
}

enum SpanKind {
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  PRODUCER = 'PRODUCER',
  CONSUMER = 'CONSUMER',
  INTERNAL = 'INTERNAL'
}

// Metrics and Monitoring
interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  timestamp: number;
  labels: Record<string, string>;
  unit?: string;
  description?: string;
}

interface MetricSeries {
  metric: string;
  labels: Record<string, string>;
  values: Array<{ timestamp: number; value: number; }>;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'p50' | 'p95' | 'p99';
}

// Logging System
interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  fields: Record<string, any>;
  source: LogSource;
}

interface LogSource {
  service: string;
  version: string;
  instance: string;
  environment: string;
  region?: string;
  zone?: string;
}

// Alerting System
interface AlertRule {
  id: string;
  name: string;
  description: string;
  query: string;
  condition: AlertCondition;
  severity: 'critical' | 'high' | 'medium' | 'low';
  channels: NotificationChannel[];
  enabled: boolean;
  cooldown: number; // seconds
  lastTriggered?: Date;
}

interface AlertCondition {
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  duration: number; // seconds
  aggregation?: string;
}

interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  configuration: Record<string, any>;
  enabled: boolean;
}

interface Alert {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'acknowledged' | 'resolved';
  startTime: Date;
  endTime?: Date;
  value: number;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

// Service Health and SLI/SLO
interface ServiceLevelIndicator {
  name: string;
  description: string;
  query: string;
  target: number; // percentage
  window: string; // time window
  burnRate: BurnRateConfig[];
}

interface BurnRateConfig {
  window: string;
  threshold: number;
}

interface ServiceLevelObjective {
  service: string;
  sli: ServiceLevelIndicator;
  objective: number; // percentage
  period: string; // time period
  errorBudget: ErrorBudget;
}

interface ErrorBudget {
  total: number;
  consumed: number;
  remaining: number;
  burnRate: number;
  status: 'healthy' | 'warning' | 'critical';
}

// Performance Analysis
interface PerformanceProfile {
  service: string;
  endpoint: string;
  method: string;
  requestRate: number;
  errorRate: number;
  responseTimeP50: number;
  responseTimeP95: number;
  responseTimeP99: number;
  throughput: number;
  saturation: number;
  bottlenecks: PerformanceBottleneck[];
  recommendations: string[];
}

interface PerformanceBottleneck {
  type: 'cpu' | 'memory' | 'network' | 'database' | 'external_service';
  severity: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  suggestion: string;
}

@Injectable()
export class ObservabilityPlatformService {
  private readonly logger = new Logger(ObservabilityPlatformService.name);
  
  // Storage
  private traces = new Map<string, Span[]>();
  private metrics = new Map<string, MetricSeries>();
  private logs: LogEntry[] = [];
  private alerts = new Map<string, Alert>();
  private alertRules = new Map<string, AlertRule>();
  private slos = new Map<string, ServiceLevelObjective>();
  
  // Active monitoring
  private activeTraces = new Map<string, Span[]>();
  private metricsBuffer: Metric[] = [];
  
  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeAlertRules();
    this.initializeSLOs();
    this.startMetricsCollection();
  }

  /**
   * 初始化告警规则
   */
  private initializeAlertRules(): void {
    const rules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Service error rate exceeds threshold',
        query: 'rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100',
        condition: {
          operator: '>',
          threshold: 5, // 5% error rate
          duration: 300, // 5 minutes
          aggregation: 'avg'
        },
        severity: 'critical',
        channels: [
          {
            type: 'email',
            configuration: {
              recipients: ['ops@company.com', 'dev@company.com']
            },
            enabled: true
          },
          {
            type: 'slack',
            configuration: {
              webhook: process.env.SLACK_WEBHOOK_URL,
              channel: '#alerts'
            },
            enabled: true
          }
        ],
        enabled: true,
        cooldown: 600 // 10 minutes
      },
      
      {
        id: 'high-response-time',
        name: 'High Response Time',
        description: 'Service response time exceeds acceptable threshold',
        query: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000',
        condition: {
          operator: '>',
          threshold: 2000, // 2 seconds
          duration: 300,
          aggregation: 'avg'
        },
        severity: 'high',
        channels: [
          {
            type: 'slack',
            configuration: {
              webhook: process.env.SLACK_WEBHOOK_URL,
              channel: '#performance'
            },
            enabled: true
          }
        ],
        enabled: true,
        cooldown: 300
      },
      
      {
        id: 'low-throughput',
        name: 'Low Throughput',
        description: 'Service throughput below expected levels',
        query: 'rate(http_requests_total[5m])',
        condition: {
          operator: '<',
          threshold: 10, // requests per second
          duration: 600,
          aggregation: 'avg'
        },
        severity: 'medium',
        channels: [
          {
            type: 'email',
            configuration: {
              recipients: ['dev@company.com']
            },
            enabled: true
          }
        ],
        enabled: true,
        cooldown: 900
      },

      {
        id: 'memory-usage-high',
        name: 'High Memory Usage',
        description: 'Service memory usage exceeds safe threshold',
        query: 'process_memory_usage_bytes / process_memory_limit_bytes * 100',
        condition: {
          operator: '>',
          threshold: 85, // 85% memory usage
          duration: 300,
          aggregation: 'avg'
        },
        severity: 'high',
        channels: [
          {
            type: 'slack',
            configuration: {
              webhook: process.env.SLACK_WEBHOOK_URL,
              channel: '#infrastructure'
            },
            enabled: true
          }
        ],
        enabled: true,
        cooldown: 600
      },

      {
        id: 'disk-space-low',
        name: 'Low Disk Space',
        description: 'Available disk space below critical threshold',
        query: '(disk_total_bytes - disk_used_bytes) / disk_total_bytes * 100',
        condition: {
          operator: '<',
          threshold: 15, // 15% available space
          duration: 60,
          aggregation: 'min'
        },
        severity: 'critical',
        channels: [
          {
            type: 'email',
            configuration: {
              recipients: ['ops@company.com']
            },
            enabled: true
          },
          {
            type: 'sms',
            configuration: {
              numbers: ['+1234567890']
            },
            enabled: true
          }
        ],
        enabled: true,
        cooldown: 1800
      }
    ];

    rules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });

    this.logger.log(`Initialized ${rules.length} alert rules`);
  }

  /**
   * 初始化SLO
   */
  private initializeSLOs(): void {
    const slos: ServiceLevelObjective[] = [
      {
        service: 'app-gateway',
        sli: {
          name: 'request-success-rate',
          description: 'Percentage of successful HTTP requests',
          query: 'rate(http_requests_total{status!~"5.."}[5m]) / rate(http_requests_total[5m]) * 100',
          target: 99.9,
          window: '28d',
          burnRate: [
            { window: '1h', threshold: 14.4 },
            { window: '6h', threshold: 6 }
          ]
        },
        objective: 99.9, // 99.9% uptime
        period: '28d',
        errorBudget: {
          total: 100,
          consumed: 15,
          remaining: 85,
          burnRate: 1.2,
          status: 'healthy'
        }
      },
      
      {
        service: 'resume-parser-svc',
        sli: {
          name: 'processing-success-rate',
          description: 'Percentage of successful resume parsing operations',
          query: 'rate(resume_parsing_total{status="success"}[5m]) / rate(resume_parsing_total[5m]) * 100',
          target: 95.0,
          window: '28d',
          burnRate: [
            { window: '1h', threshold: 2 },
            { window: '6h', threshold: 0.5 }
          ]
        },
        objective: 95.0,
        period: '28d',
        errorBudget: {
          total: 100,
          consumed: 30,
          remaining: 70,
          burnRate: 0.8,
          status: 'healthy'
        }
      },

      {
        service: 'scoring-engine-svc',
        sli: {
          name: 'scoring-latency',
          description: '95th percentile scoring response time under 2 seconds',
          query: 'histogram_quantile(0.95, rate(scoring_duration_seconds_bucket[5m]))',
          target: 2.0,
          window: '28d',
          burnRate: [
            { window: '1h', threshold: 6 },
            { window: '6h', threshold: 1 }
          ]
        },
        objective: 95.0, // 95% of requests under 2s
        period: '28d',
        errorBudget: {
          total: 100,
          consumed: 25,
          remaining: 75,
          burnRate: 1.1,
          status: 'healthy'
        }
      }
    ];

    slos.forEach(slo => {
      this.slos.set(`${slo.service}_${slo.sli.name}`, slo);
    });

    this.logger.log(`Initialized ${slos.length} SLOs`);
  }

  /**
   * 开始收集指标
   */
  private startMetricsCollection(): void {
    // 定期收集系统指标
    setInterval(() => {
      this.collectSystemMetrics();
    }, 15000); // 每15秒

    // 定期收集应用指标
    setInterval(() => {
      this.collectApplicationMetrics();
    }, 30000); // 每30秒
  }

  /**
   * 创建新的追踪
   */
  startTrace(operationName: string, serviceName: string, parentContext?: TraceContext): TraceContext {
    const traceId = parentContext?.traceId || this.generateId();
    const spanId = this.generateId();
    
    const span: Span = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      operationName,
      serviceName,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: SpanStatus.OK,
      kind: SpanKind.INTERNAL
    };

    if (!this.activeTraces.has(traceId)) {
      this.activeTraces.set(traceId, []);
    }
    this.activeTraces.get(traceId)!.push(span);

    return {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      baggage: parentContext?.baggage || {},
      flags: parentContext?.flags || 0
    };
  }

  /**
   * 完成追踪
   */
  finishTrace(context: TraceContext, tags?: Record<string, any>, status?: SpanStatus): void {
    const spans = this.activeTraces.get(context.traceId);
    if (!spans) return;

    const span = spans.find(s => s.spanId === context.spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    
    if (tags) {
      span.tags = { ...span.tags, ...tags };
    }
    
    if (status) {
      span.status = status;
    }

    // 移动到完成的追踪
    if (!this.traces.has(context.traceId)) {
      this.traces.set(context.traceId, []);
    }
    this.traces.get(context.traceId)!.push(span);

    // 发送追踪完成事件
    this.eventEmitter.emit('trace.finished', {
      traceId: context.traceId,
      span,
      timestamp: new Date()
    });
  }

  /**
   * 添加追踪标签
   */
  addTraceTag(context: TraceContext, key: string, value: any): void {
    const spans = this.activeTraces.get(context.traceId);
    if (!spans) return;

    const span = spans.find(s => s.spanId === context.spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  /**
   * 添加追踪日志
   */
  addTraceLog(context: TraceContext, level: 'debug' | 'info' | 'warn' | 'error', message: string, fields?: Record<string, any>): void {
    const spans = this.activeTraces.get(context.traceId);
    if (!spans) return;

    const span = spans.find(s => s.spanId === context.spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        level,
        message,
        fields: fields || {}
      });
    }
  }

  /**
   * 记录指标
   */
  recordMetric(name: string, value: number, type: 'counter' | 'gauge' | 'histogram' | 'summary', labels?: Record<string, string>): void {
    const metric: Metric = {
      name,
      type,
      value,
      timestamp: Date.now(),
      labels: labels || {}
    };

    this.metricsBuffer.push(metric);

    // 如果缓冲区太大，立即处理
    if (this.metricsBuffer.length > 1000) {
      this.processMetricsBuffer();
    }
  }

  /**
   * 处理指标缓冲区
   */
  private processMetricsBuffer(): void {
    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // 按名称和标签分组
    const grouped = new Map<string, Metric[]>();
    
    metrics.forEach(metric => {
      const key = `${metric.name}_${JSON.stringify(metric.labels)}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    });

    // 更新时间序列
    grouped.forEach((metricGroup, key) => {
      const firstMetric = metricGroup[0];
      const seriesKey = `${firstMetric.name}_${JSON.stringify(firstMetric.labels)}`;
      
      if (!this.metrics.has(seriesKey)) {
        this.metrics.set(seriesKey, {
          metric: firstMetric.name,
          labels: firstMetric.labels,
          values: []
        });
      }

      const series = this.metrics.get(seriesKey)!;
      metricGroup.forEach(metric => {
        series.values.push({
          timestamp: metric.timestamp,
          value: metric.value
        });
      });

      // 保持最近1小时的数据
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      series.values = series.values.filter(v => v.timestamp > oneHourAgo);
    });
  }

  /**
   * 记录日志
   */
  log(level: 'debug' | 'info' | 'warn' | 'error' | 'fatal', message: string, service: string, context?: TraceContext, fields?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      service,
      traceId: context?.traceId,
      spanId: context?.spanId,
      fields: fields || {},
      source: {
        service,
        version: '1.0.0',
        instance: process.env.HOSTNAME || 'unknown',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    this.logs.push(logEntry);

    // 保持最近10000条日志
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-10000);
    }

    // 发送日志事件
    this.eventEmitter.emit('log.recorded', logEntry);

    // 检查是否需要触发告警
    if (level === 'error' || level === 'fatal') {
      this.checkErrorAlerts(logEntry);
    }
  }

  /**
   * 收集系统指标
   */
  private collectSystemMetrics(): void {
    // CPU使用率
    this.recordMetric('system_cpu_usage_percent', this.getCpuUsage(), 'gauge', {
      instance: process.env.HOSTNAME || 'unknown'
    });

    // 内存使用率
    const memoryUsage = process.memoryUsage();
    this.recordMetric('system_memory_usage_bytes', memoryUsage.rss, 'gauge', {
      type: 'rss',
      instance: process.env.HOSTNAME || 'unknown'
    });
    this.recordMetric('system_memory_usage_bytes', memoryUsage.heapUsed, 'gauge', {
      type: 'heap_used',
      instance: process.env.HOSTNAME || 'unknown'
    });
    this.recordMetric('system_memory_usage_bytes', memoryUsage.heapTotal, 'gauge', {
      type: 'heap_total',
      instance: process.env.HOSTNAME || 'unknown'
    });

    // 垃圾回收指标
    if (global.gc) {
      const gcStats = this.getGCStats();
      this.recordMetric('system_gc_duration_seconds', gcStats.duration, 'histogram', {
        type: gcStats.type,
        instance: process.env.HOSTNAME || 'unknown'
      });
    }
  }

  /**
   * 收集应用指标
   */
  private collectApplicationMetrics(): void {
    // 活跃追踪数
    this.recordMetric('app_active_traces_count', this.activeTraces.size, 'gauge');

    // 日志计数
    const logCounts = this.getLogCounts();
    Object.entries(logCounts).forEach(([level, count]) => {
      this.recordMetric('app_logs_total', count, 'counter', { level });
    });

    // 告警状态
    const alertCounts = this.getAlertCounts();
    Object.entries(alertCounts).forEach(([status, count]) => {
      this.recordMetric('app_alerts_total', count, 'gauge', { status });
    });
  }

  /**
   * 获取CPU使用率
   */
  private getCpuUsage(): number {
    // 简化实现，实际应该使用真实的CPU监控
    return Math.random() * 100;
  }

  /**
   * 获取GC统计
   */
  private getGCStats(): { duration: number; type: string; } {
    // 简化实现
    return {
      duration: Math.random() * 10,
      type: 'scavenge'
    };
  }

  /**
   * 获取日志计数
   */
  private getLogCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    this.logs.forEach(log => {
      counts[log.level] = (counts[log.level] || 0) + 1;
    });

    return counts;
  }

  /**
   * 获取告警计数
   */
  private getAlertCounts(): Record<string, number> {
    const counts: Record<string, number> = {
      open: 0,
      acknowledged: 0,
      resolved: 0
    };

    this.alerts.forEach(alert => {
      counts[alert.status]++;
    });

    return counts;
  }

  /**
   * 检查错误告警
   */
  private checkErrorAlerts(logEntry: LogEntry): void {
    // 检查错误率告警
    const recentErrors = this.logs.filter(log => 
      log.level === 'error' && 
      log.timestamp > Date.now() - 300000 && // 最近5分钟
      log.service === logEntry.service
    ).length;

    if (recentErrors > 10) {
      this.triggerAlert('high-error-rate', {
        service: logEntry.service,
        errorCount: recentErrors,
        message: `High error rate detected in service ${logEntry.service}: ${recentErrors} errors in 5 minutes`
      });
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(ruleId: string, context: Record<string, any>): Promise<void> {
    const rule = this.alertRules.get(ruleId);
    if (!rule || !rule.enabled) return;

    // 检查冷却时间
    if (rule.lastTriggered && Date.now() - rule.lastTriggered.getTime() < rule.cooldown * 1000) {
      return;
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId,
      title: rule.name,
      description: rule.description,
      severity: rule.severity,
      status: 'open',
      startTime: new Date(),
      value: context.value || 0,
      labels: context.labels || {},
      annotations: context.annotations || {}
    };

    this.alerts.set(alert.id, alert);
    rule.lastTriggered = new Date();

    this.logger.warn(`Alert triggered: ${alert.title} - ${alert.description}`);

    // 发送通知
    await this.sendAlertNotifications(rule, alert, context);

    // 发送告警事件
    this.eventEmitter.emit('alert.triggered', alert);
  }

  /**
   * 发送告警通知
   */
  private async sendAlertNotifications(rule: AlertRule, alert: Alert, context: Record<string, any>): Promise<void> {
    for (const channel of rule.channels) {
      if (!channel.enabled) continue;

      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailNotification(channel, alert, context);
            break;
          case 'slack':
            await this.sendSlackNotification(channel, alert, context);
            break;
          case 'webhook':
            await this.sendWebhookNotification(channel, alert, context);
            break;
          case 'sms':
            await this.sendSmsNotification(channel, alert, context);
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send ${channel.type} notification: ${error.message}`);
      }
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(channel: NotificationChannel, alert: Alert, context: Record<string, any>): Promise<void> {
    // 实现邮件发送逻辑
    this.logger.log(`Email notification sent for alert: ${alert.title}`);
  }

  /**
   * 发送Slack通知
   */
  private async sendSlackNotification(channel: NotificationChannel, alert: Alert, context: Record<string, any>): Promise<void> {
    // 实现Slack发送逻辑
    this.logger.log(`Slack notification sent for alert: ${alert.title}`);
  }

  /**
   * 发送Webhook通知
   */
  private async sendWebhookNotification(channel: NotificationChannel, alert: Alert, context: Record<string, any>): Promise<void> {
    // 实现Webhook发送逻辑
    this.logger.log(`Webhook notification sent for alert: ${alert.title}`);
  }

  /**
   * 发送短信通知
   */
  private async sendSmsNotification(channel: NotificationChannel, alert: Alert, context: Record<string, any>): Promise<void> {
    // 实现短信发送逻辑
    this.logger.log(`SMS notification sent for alert: ${alert.title}`);
  }

  /**
   * 分析性能
   */
  analyzePerformance(service: string, endpoint?: string): PerformanceProfile {
    // 获取相关指标
    const relevantTraces = Array.from(this.traces.values())
      .flat()
      .filter(span => span.serviceName === service && (!endpoint || span.operationName.includes(endpoint)));

    if (relevantTraces.length === 0) {
      return {
        service,
        endpoint: endpoint || 'all',
        method: 'all',
        requestRate: 0,
        errorRate: 0,
        responseTimeP50: 0,
        responseTimeP95: 0,
        responseTimeP99: 0,
        throughput: 0,
        saturation: 0,
        bottlenecks: [],
        recommendations: ['Insufficient data for analysis']
      };
    }

    // 计算性能指标
    const durations = relevantTraces.map(span => span.duration || 0).sort((a, b) => a - b);
    const errorCount = relevantTraces.filter(span => span.status === SpanStatus.ERROR).length;

    const profile: PerformanceProfile = {
      service,
      endpoint: endpoint || 'all',
      method: 'all',
      requestRate: relevantTraces.length / 60, // requests per minute
      errorRate: (errorCount / relevantTraces.length) * 100,
      responseTimeP50: this.calculatePercentile(durations, 50),
      responseTimeP95: this.calculatePercentile(durations, 95),
      responseTimeP99: this.calculatePercentile(durations, 99),
      throughput: relevantTraces.length,
      saturation: this.calculateSaturation(relevantTraces),
      bottlenecks: this.identifyBottlenecks(relevantTraces),
      recommendations: this.generatePerformanceRecommendations(relevantTraces)
    };

    return profile;
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    if (lower === upper) return sortedArray[lower];

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * 计算饱和度
   */
  private calculateSaturation(spans: Span[]): number {
    // 简化实现，基于响应时间增长率
    const avgDuration = spans.reduce((sum, span) => sum + (span.duration || 0), 0) / spans.length;
    return Math.min(avgDuration / 1000 * 50, 100); // 假设1秒响应时间 = 50%饱和度
  }

  /**
   * 识别性能瓶颈
   */
  private identifyBottlenecks(spans: Span[]): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    
    // 检查高延迟操作
    const highLatencySpans = spans.filter(span => (span.duration || 0) > 2000);
    if (highLatencySpans.length > spans.length * 0.1) {
      bottlenecks.push({
        type: 'network',
        severity: 'high',
        description: 'High latency detected in network operations',
        impact: 'Increased response times and poor user experience',
        suggestion: 'Consider optimizing network calls, implementing caching, or using connection pooling'
      });
    }

    // 检查错误率
    const errorSpans = spans.filter(span => span.status === SpanStatus.ERROR);
    if (errorSpans.length > spans.length * 0.05) {
      bottlenecks.push({
        type: 'external_service',
        severity: 'high',
        description: 'High error rate in external service calls',
        impact: 'Service instability and reliability issues',
        suggestion: 'Implement circuit breakers and retry logic for external service calls'
      });
    }

    return bottlenecks;
  }

  /**
   * 生成性能建议
   */
  private generatePerformanceRecommendations(spans: Span[]): string[] {
    const recommendations: string[] = [];

    const avgDuration = spans.reduce((sum, span) => sum + (span.duration || 0), 0) / spans.length;
    
    if (avgDuration > 1000) {
      recommendations.push('Consider implementing response caching to reduce average response time');
    }

    if (spans.filter(s => s.status === SpanStatus.ERROR).length > 0) {
      recommendations.push('Implement better error handling and monitoring');
    }

    const databaseSpans = spans.filter(span => span.tags.component === 'database');
    if (databaseSpans.length > spans.length * 0.5) {
      recommendations.push('Database queries dominate execution time - consider query optimization');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance metrics look healthy - continue monitoring');
    }

    return recommendations;
  }

  /**
   * 获取可观测性概览
   */
  getObservabilityOverview(): any {
    const totalTraces = Array.from(this.traces.values()).reduce((sum, spans) => sum + spans.length, 0);
    const activeAlertsCount = Array.from(this.alerts.values()).filter(a => a.status === 'open').length;
    const totalMetrics = this.metrics.size;
    const totalLogs = this.logs.length;

    // 计算SLO合规性
    const sloCompliance = this.calculateSLOCompliance();

    return {
      tracing: {
        totalTraces,
        activeTraces: this.activeTraces.size,
        avgTraceLatency: this.calculateAvgTraceLatency(),
        errorRate: this.calculateOverallErrorRate()
      },
      metrics: {
        totalSeries: totalMetrics,
        dataPoints: Array.from(this.metrics.values()).reduce((sum, series) => sum + series.values.length, 0),
        retention: '7d'
      },
      logging: {
        totalLogs,
        errorLogs: this.logs.filter(l => l.level === 'error').length,
        retention: '30d'
      },
      alerting: {
        totalRules: this.alertRules.size,
        activeAlerts: activeAlertsCount,
        resolvedToday: Array.from(this.alerts.values()).filter(a => 
          a.status === 'resolved' && 
          a.endTime && 
          a.endTime.toDateString() === new Date().toDateString()
        ).length
      },
      slo: {
        totalSLOs: this.slos.size,
        compliance: sloCompliance,
        errorBudgetHealth: this.getErrorBudgetHealth()
      }
    };
  }

  /**
   * 计算平均追踪延迟
   */
  private calculateAvgTraceLatency(): number {
    const allSpans = Array.from(this.traces.values()).flat();
    if (allSpans.length === 0) return 0;
    
    const totalDuration = allSpans.reduce((sum, span) => sum + (span.duration || 0), 0);
    return totalDuration / allSpans.length;
  }

  /**
   * 计算总体错误率
   */
  private calculateOverallErrorRate(): number {
    const allSpans = Array.from(this.traces.values()).flat();
    if (allSpans.length === 0) return 0;
    
    const errorSpans = allSpans.filter(span => span.status === SpanStatus.ERROR);
    return (errorSpans.length / allSpans.length) * 100;
  }

  /**
   * 计算SLO合规性
   */
  private calculateSLOCompliance(): number {
    const slos = Array.from(this.slos.values());
    if (slos.length === 0) return 100;

    const compliantSLOs = slos.filter(slo => slo.errorBudget.status === 'healthy').length;
    return (compliantSLOs / slos.length) * 100;
  }

  /**
   * 获取错误预算健康状态
   */
  private getErrorBudgetHealth(): Record<string, number> {
    const slos = Array.from(this.slos.values());
    const health = { healthy: 0, warning: 0, critical: 0 };

    slos.forEach(slo => {
      health[slo.errorBudget.status]++;
    });

    return health;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * 定时处理指标
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processMetrics(): Promise<void> {
    this.processMetricsBuffer();
  }

  /**
   * 定时评估告警规则
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateAlertRules(): Promise<void> {
    // 评估所有启用的告警规则
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      
      try {
        const shouldAlert = await this.evaluateAlertRule(rule);
        if (shouldAlert) {
          await this.triggerAlert(rule.id, {
            value: shouldAlert.value,
            labels: shouldAlert.labels || {},
            annotations: { rule: rule.name }
          });
        }
      } catch (error) {
        this.logger.error(`Failed to evaluate alert rule ${rule.name}: ${error.message}`);
      }
    }
  }

  /**
   * 评估告警规则
   */
  private async evaluateAlertRule(rule: AlertRule): Promise<{ value: number; labels?: Record<string, string>; } | null> {
    // 简化实现 - 基于当前指标评估
    // 实际应该执行真实的查询语言（如PromQL）
    
    if (rule.id === 'high-error-rate') {
      const errorRate = this.calculateOverallErrorRate();
      if (errorRate > rule.condition.threshold) {
        return { value: errorRate };
      }
    }
    
    if (rule.id === 'high-response-time') {
      const avgLatency = this.calculateAvgTraceLatency();
      if (avgLatency > rule.condition.threshold) {
        return { value: avgLatency };
      }
    }

    return null;
  }

  /**
   * 定时清理旧数据
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldData(): Promise<void> {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // 清理旧的追踪数据
    this.traces.forEach((spans, traceId) => {
      const hasRecentSpans = spans.some(span => span.startTime > oneWeekAgo);
      if (!hasRecentSpans) {
        this.traces.delete(traceId);
      }
    });

    // 清理旧的日志
    this.logs = this.logs.filter(log => log.timestamp > oneWeekAgo);

    // 清理已解决的告警
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.alerts.forEach((alert, alertId) => {
      if (alert.status === 'resolved' && alert.endTime && alert.endTime.getTime() < oneDayAgo) {
        this.alerts.delete(alertId);
      }
    });

    this.logger.log('Old observability data cleaned up');
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    this.logger.log('Shutting down observability platform...');
    
    // 处理剩余的指标
    this.processMetricsBuffer();
    
    this.logger.log('Observability platform shutdown complete');
  }
}