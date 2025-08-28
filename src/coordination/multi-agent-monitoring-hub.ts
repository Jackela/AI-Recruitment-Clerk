import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 多代理监控中心 - 统一监控和性能指标收集
 * 集成各代理的性能数据，提供实时监控和智能告警
 */

export interface AgentPerformanceMetrics {
  agentId: string;
  agentType: string;
  timestamp: Date;
  cpu: {
    usage: number;        // 0-1
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;         // bytes
    total: number;        // bytes
    heapUsed: number;     // bytes
    heapTotal: number;    // bytes
    external: number;     // bytes
    rss: number;          // bytes
  };
  network: {
    bytesIn: number;      // bytes/s
    bytesOut: number;     // bytes/s
    packetsIn: number;    // packets/s
    packetsOut: number;   // packets/s
    errors: number;       // error count
    latency: number;      // ms
  };
  application: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;    // 0-1
    activeConnections: number;
    queueDepth: number;
    cacheHitRate: number; // 0-1
  };
  coordination: {
    tasksProcessed: number;
    tasksQueued: number;
    messagessent: number;
    messagesReceived: number;
    coordinationLatency: number; // ms
    conflictsResolved: number;
  };
}

export interface SystemMetrics {
  timestamp: Date;
  overallHealth: number; // 0-1
  totalThroughput: number;
  averageLatency: number;
  errorRate: number;
  availabilityScore: number;
  coordinationEfficiency: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    network: number;
    storage: number;
  };
  activeAgents: number;
  healthyAgents: number;
  degradedAgents: number;
  criticalAlerts: number;
}

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'performance' | 'availability' | 'security' | 'capacity' | 'coordination';
  title: string;
  description: string;
  source: string;
  affectedAgents: string[];
  metrics: any;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: Date;
  escalated: boolean;
  autoResolve: boolean;
  tags: string[];
}

export interface MonitoringThreshold {
  id: string;
  name: string;
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  duration: number; // ms - 需要持续多长时间才触发
  severity: Alert['severity'];
  autoResolve: boolean;
  escalationRules?: {
    escalateAfter: number; // ms
    escalateTo: string[];
  };
}

export interface PerformanceTrend {
  metric: string;
  timeWindow: string;
  trend: 'improving' | 'stable' | 'degrading' | 'volatile';
  changeRate: number; // % change per hour
  significance: number; // 0-1, statistical significance
  prediction: {
    next1h: number;
    next6h: number;
    next24h: number;
    confidence: number;
  };
}

export interface CoordinationMetrics {
  totalAgents: number;
  activeCoordinations: number;
  averageCoordinationTime: number;
  conflictResolutionRate: number;
  messageDeliveryRate: number;
  systemCoherence: number; // 0-1, how well agents work together
  adaptabilityScore: number; // 0-1, how quickly system adapts to changes
  emergentBehaviors: string[]; // detected emergent coordination patterns
}

@Injectable()
export class MultiAgentMonitoringHub {
  private readonly logger = new Logger(MultiAgentMonitoringHub.name);
  private agentMetrics = new Map<string, AgentPerformanceMetrics[]>();
  private systemMetricsHistory: SystemMetrics[] = [];
  private activeAlerts = new Map<string, Alert>();
  private resolvedAlerts: Alert[] = [];
  private thresholds = new Map<string, MonitoringThreshold>();
  private performanceTrends = new Map<string, PerformanceTrend>();
  
  private readonly maxHistorySize = 1000; // 保持最近1000个数据点
  private readonly trendAnalysisWindow = 100; // 使用最近100个数据点分析趋势
  
  private dashboardConnections = new Set<any>(); // WebSocket连接
  private alertSubscribers = new Set<(alert: Alert) => void>();
  
  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.log('📊 MultiAgentMonitoringHub initialized');
    this.initializeDefaultThresholds();
    this.setupEventListeners();
  }

  /**
   * 记录代理性能指标
   */
  async recordAgentMetrics(metrics: AgentPerformanceMetrics): Promise<void> {
    const agentHistory = this.agentMetrics.get(metrics.agentId) || [];
    agentHistory.push(metrics);
    
    // 保持历史记录在合理范围内
    if (agentHistory.length > this.maxHistorySize) {
      agentHistory.splice(0, agentHistory.length - this.maxHistorySize);
    }
    
    this.agentMetrics.set(metrics.agentId, agentHistory);
    
    // 检查阈值告警
    await this.checkThresholds(metrics);
    
    // 更新趋势分析
    await this.updatePerformanceTrends(metrics);
    
    // 实时推送到仪表板
    this.broadcastToRealtimeDashboard('agent_metrics', metrics);
  }

  /**
   * 计算系统整体指标
   */
  async calculateSystemMetrics(): Promise<SystemMetrics> {
    const allAgents = Array.from(this.agentMetrics.keys());
    const latestMetrics = allAgents.map(agentId => {
      const history = this.agentMetrics.get(agentId) || [];
      return history[history.length - 1];
    }).filter(Boolean);

    if (latestMetrics.length === 0) {
      return this.createEmptySystemMetrics();
    }

    const systemMetrics: SystemMetrics = {
      timestamp: new Date(),
      overallHealth: this.calculateOverallHealth(latestMetrics),
      totalThroughput: this.calculateTotalThroughput(latestMetrics),
      averageLatency: this.calculateAverageLatency(latestMetrics),
      errorRate: this.calculateSystemErrorRate(latestMetrics),
      availabilityScore: this.calculateAvailabilityScore(latestMetrics),
      coordinationEfficiency: this.calculateCoordinationEfficiency(latestMetrics),
      resourceUtilization: this.calculateResourceUtilization(latestMetrics),
      activeAgents: latestMetrics.length,
      healthyAgents: this.countHealthyAgents(latestMetrics),
      degradedAgents: this.countDegradedAgents(latestMetrics),
      criticalAlerts: this.countCriticalAlerts()
    };

    this.systemMetricsHistory.push(systemMetrics);
    
    // 保持历史记录
    if (this.systemMetricsHistory.length > this.maxHistorySize) {
      this.systemMetricsHistory.splice(0, this.systemMetricsHistory.length - this.maxHistorySize);
    }
    
    // 广播系统指标
    this.broadcastToRealtimeDashboard('system_metrics', systemMetrics);
    this.eventEmitter.emit('system.metrics.updated', systemMetrics);
    
    return systemMetrics;
  }

  /**
   * 检查阈值告警
   */
  private async checkThresholds(metrics: AgentPerformanceMetrics): Promise<void> {
    for (const [thresholdId, threshold] of this.thresholds) {
      const metricValue = this.extractMetricValue(metrics, threshold.metric);
      
      if (metricValue === undefined) continue;
      
      const violated = this.evaluateThreshold(metricValue, threshold);
      
      if (violated) {
        await this.handleThresholdViolation(threshold, metrics, metricValue);
      }
    }
  }

  /**
   * 处理阈值违规
   */
  private async handleThresholdViolation(
    threshold: MonitoringThreshold,
    metrics: AgentPerformanceMetrics,
    value: number
  ): Promise<void> {
    const alertId = `${threshold.id}_${metrics.agentId}_${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      timestamp: new Date(),
      severity: threshold.severity,
      category: this.categorizeMetric(threshold.metric),
      title: `${threshold.name} threshold violated`,
      description: `Agent ${metrics.agentId}: ${threshold.metric} ${threshold.operator} ${threshold.value} (current: ${value.toFixed(2)})`,
      source: metrics.agentId,
      affectedAgents: [metrics.agentId],
      metrics: { [threshold.metric]: value, threshold: threshold.value },
      acknowledged: false,
      resolved: false,
      escalated: false,
      autoResolve: threshold.autoResolve,
      tags: [threshold.metric, metrics.agentType]
    };
    
    this.activeAlerts.set(alertId, alert);
    
    this.logger.warn(`🚨 Alert triggered: ${alert.title}`);
    this.eventEmitter.emit('alert.triggered', alert);
    
    // 通知订阅者
    this.alertSubscribers.forEach(subscriber => {
      try {
        subscriber(alert);
      } catch (error) {
        this.logger.error('Error notifying alert subscriber:', error);
      }
    });
    
    // 实时推送告警
    this.broadcastToRealtimeDashboard('alert', alert);
    
    // 处理升级规则
    if (threshold.escalationRules && threshold.severity === 'critical') {
      this.scheduleAlertEscalation(alert, threshold.escalationRules);
    }
  }

  /**
   * 更新性能趋势分析
   */
  private async updatePerformanceTrends(metrics: AgentPerformanceMetrics): Promise<void> {
    const metricsToAnalyze = [
      'cpu.usage',
      'memory.used',
      'application.responseTime',
      'application.errorRate',
      'coordination.coordinationLatency'
    ];

    for (const metricName of metricsToAnalyze) {
      const trendKey = `${metrics.agentId}_${metricName}`;
      await this.analyzeTrend(trendKey, metricName, metrics);
    }
  }

  /**
   * 分析单个指标的趋势
   */
  private async analyzeTrend(trendKey: string, metricName: string, metrics: AgentPerformanceMetrics): Promise<void> {
    const agentHistory = this.agentMetrics.get(metrics.agentId) || [];
    
    if (agentHistory.length < 10) return; // 需要足够的历史数据
    
    const recentValues = agentHistory
      .slice(-this.trendAnalysisWindow)
      .map(m => this.extractMetricValue(m, metricName))
      .filter(v => v !== undefined) as number[];
    
    if (recentValues.length < 5) return;
    
    const trend = this.calculateTrend(recentValues);
    const prediction = this.predictFutureValues(recentValues);
    
    const performanceTrend: PerformanceTrend = {
      metric: metricName,
      timeWindow: `${recentValues.length} samples`,
      trend: this.classifyTrend(trend.slope, trend.confidence),
      changeRate: trend.slope * 3600, // per hour
      significance: trend.confidence,
      prediction
    };
    
    this.performanceTrends.set(trendKey, performanceTrend);
    
    // 检测异常趋势
    if (performanceTrend.trend === 'degrading' && performanceTrend.significance > 0.8) {
      await this.createTrendAlert(metrics.agentId, performanceTrend);
    }
  }

  /**
   * 计算趋势
   */
  private calculateTrend(values: number[]): { slope: number; confidence: number } {
    const n = values.length;
    if (n < 2) return { slope: 0, confidence: 0 };
    
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + idx * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // 计算R²作为置信度
    const meanY = sumY / n;
    const ssTotal = values.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const ssResidual = values.reduce((sum, val, idx) => {
      const predicted = meanY + slope * (idx - (n - 1) / 2);
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const confidence = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
    
    return { slope: isNaN(slope) ? 0 : slope, confidence: Math.max(0, Math.min(1, confidence)) };
  }

  /**
   * 预测未来值
   */
  private predictFutureValues(values: number[]): PerformanceTrend['prediction'] {
    if (values.length < 5) {
      return { next1h: values[values.length - 1], next6h: 0, next24h: 0, confidence: 0 };
    }
    
    const trend = this.calculateTrend(values);
    const lastValue = values[values.length - 1];
    const avgStepSize = 60; // 假设每分钟一个样本
    
    return {
      next1h: lastValue + (trend.slope * avgStepSize),
      next6h: lastValue + (trend.slope * avgStepSize * 6),
      next24h: lastValue + (trend.slope * avgStepSize * 24),
      confidence: trend.confidence
    };
  }

  /**
   * 分类趋势
   */
  private classifyTrend(slope: number, confidence: number): PerformanceTrend['trend'] {
    if (confidence < 0.5) return 'volatile';
    
    const absSlope = Math.abs(slope);
    
    if (absSlope < 0.01) return 'stable';
    if (slope > 0.05) return 'degrading'; // 假设增长是degrading（如错误率、延迟）
    if (slope < -0.05) return 'improving';
    
    return 'stable';
  }

  /**
   * 创建趋势告警
   */
  private async createTrendAlert(agentId: string, trend: PerformanceTrend): Promise<void> {
    const alertId = `trend_${agentId}_${trend.metric}_${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      timestamp: new Date(),
      severity: 'warning',
      category: 'performance',
      title: `Performance trend degradation detected`,
      description: `Agent ${agentId}: ${trend.metric} showing degrading trend (${(trend.changeRate * 100).toFixed(1)}% change/hour)`,
      source: agentId,
      affectedAgents: [agentId],
      metrics: {
        metric: trend.metric,
        trend: trend.trend,
        changeRate: trend.changeRate,
        significance: trend.significance
      },
      acknowledged: false,
      resolved: false,
      escalated: false,
      autoResolve: true,
      tags: ['trend', 'performance', trend.metric]
    };
    
    this.activeAlerts.set(alertId, alert);
    this.eventEmitter.emit('alert.trend', alert);
  }

  /**
   * 获取协调效率指标
   */
  async getCoordinationMetrics(): Promise<CoordinationMetrics> {
    const allAgents = Array.from(this.agentMetrics.keys());
    const latestMetrics = allAgents.map(agentId => {
      const history = this.agentMetrics.get(agentId) || [];
      return history[history.length - 1];
    }).filter(Boolean);

    const totalCoordinationTasks = latestMetrics.reduce((sum, m) => 
      sum + m.coordination.tasksProcessed + m.coordination.tasksQueued, 0);
    
    const avgCoordinationTime = latestMetrics.length > 0 ? 
      latestMetrics.reduce((sum, m) => sum + m.coordination.coordinationLatency, 0) / latestMetrics.length : 0;
    
    const totalConflicts = latestMetrics.reduce((sum, m) => sum + m.coordination.conflictsResolved, 0);
    const totalMessages = latestMetrics.reduce((sum, m) => sum + m.coordination.messagessent, 0);
    const deliveredMessages = latestMetrics.reduce((sum, m) => sum + m.coordination.messagesReceived, 0);
    
    const systemCoherence = this.calculateSystemCoherence(latestMetrics);
    const adaptabilityScore = this.calculateAdaptabilityScore();
    const emergentBehaviors = this.detectEmergentBehaviors(latestMetrics);

    return {
      totalAgents: latestMetrics.length,
      activeCoordinations: totalCoordinationTasks,
      averageCoordinationTime: avgCoordinationTime,
      conflictResolutionRate: totalConflicts > 0 ? 1 : 0, // 简化计算
      messageDeliveryRate: totalMessages > 0 ? deliveredMessages / totalMessages : 1,
      systemCoherence,
      adaptabilityScore,
      emergentBehaviors
    };
  }

  /**
   * 实时监控仪表板注册
   */
  registerDashboardConnection(connection: any): void {
    this.dashboardConnections.add(connection);
    
    // 发送当前状态
    const currentMetrics = {
      systemMetrics: this.systemMetricsHistory[this.systemMetricsHistory.length - 1],
      activeAlerts: Array.from(this.activeAlerts.values()),
      agentCount: this.agentMetrics.size,
      trends: Array.from(this.performanceTrends.values()).slice(-10)
    };
    
    connection.send(JSON.stringify({
      type: 'initial_state',
      data: currentMetrics
    }));
  }

  /**
   * 广播到实时仪表板
   */
  private broadcastToRealtimeDashboard(type: string, data: any): void {
    const message = JSON.stringify({ type, data, timestamp: new Date() });
    
    this.dashboardConnections.forEach(connection => {
      try {
        if (connection.readyState === 1) { // WebSocket.OPEN
          connection.send(message);
        }
      } catch (error) {
        this.logger.error('Error broadcasting to dashboard:', error);
        this.dashboardConnections.delete(connection);
      }
    });
  }

  /**
   * 订阅告警
   */
  subscribeToAlerts(callback: (alert: Alert) => void): () => void {
    this.alertSubscribers.add(callback);
    
    return () => {
      this.alertSubscribers.delete(callback);
    };
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;
    
    alert.acknowledged = true;
    (alert as any).acknowledgedBy = acknowledgedBy;
    (alert as any).acknowledgedAt = new Date();
    
    this.eventEmitter.emit('alert.acknowledged', alert);
    this.broadcastToRealtimeDashboard('alert_acknowledged', alert);
    
    return true;
  }

  /**
   * 解决告警
   */
  async resolveAlert(alertId: string, resolvedBy: string, notes?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;
    
    alert.resolved = true;
    alert.resolvedAt = new Date();
    (alert as any).resolvedBy = resolvedBy;
    (alert as any).resolutionNotes = notes;
    
    this.activeAlerts.delete(alertId);
    this.resolvedAlerts.push(alert);
    
    // 保持解决的告警历史记录
    if (this.resolvedAlerts.length > 1000) {
      this.resolvedAlerts.splice(0, this.resolvedAlerts.length - 1000);
    }
    
    this.eventEmitter.emit('alert.resolved', alert);
    this.broadcastToRealtimeDashboard('alert_resolved', alert);
    
    return true;
  }

  /**
   * 定期监控任务
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async performSystemMonitoring(): Promise<void> {
    try {
      await this.calculateSystemMetrics();
      await this.cleanupExpiredAlerts();
      await this.generateSystemHealthReport();
    } catch (error) {
      this.logger.error('❌ System monitoring error:', error);
    }
  }

  /**
   * 定期趋势分析
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performTrendAnalysis(): Promise<void> {
    try {
      await this.generateTrendReport();
      await this.predictSystemCapacity();
      await this.detectAnomalies();
    } catch (error) {
      this.logger.error('❌ Trend analysis error:', error);
    }
  }

  // 私有辅助方法实现
  private createEmptySystemMetrics(): SystemMetrics {
    return {
      timestamp: new Date(),
      overallHealth: 1,
      totalThroughput: 0,
      averageLatency: 0,
      errorRate: 0,
      availabilityScore: 1,
      coordinationEfficiency: 1,
      resourceUtilization: { cpu: 0, memory: 0, network: 0, storage: 0 },
      activeAgents: 0,
      healthyAgents: 0,
      degradedAgents: 0,
      criticalAlerts: 0
    };
  }

  private calculateOverallHealth(metrics: AgentPerformanceMetrics[]): number {
    if (metrics.length === 0) return 1;
    
    const healthScores = metrics.map(m => {
      const cpuHealth = 1 - Math.min(1, m.cpu.usage);
      const memoryHealth = 1 - Math.min(1, m.memory.used / m.memory.total);
      const errorHealth = 1 - Math.min(1, m.application.errorRate);
      
      return (cpuHealth + memoryHealth + errorHealth) / 3;
    });
    
    return healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;
  }

  private calculateTotalThroughput(metrics: AgentPerformanceMetrics[]): number {
    return metrics.reduce((sum, m) => sum + m.application.requestsPerSecond, 0);
  }

  private calculateAverageLatency(metrics: AgentPerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const validMetrics = metrics.filter(m => m.application.averageResponseTime > 0);
    if (validMetrics.length === 0) return 0;
    
    return validMetrics.reduce((sum, m) => sum + m.application.averageResponseTime, 0) / validMetrics.length;
  }

  private calculateSystemErrorRate(metrics: AgentPerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const totalRequests = metrics.reduce((sum, m) => sum + m.application.requestsPerSecond, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + (m.application.requestsPerSecond * m.application.errorRate), 0);
    
    return totalRequests > 0 ? totalErrors / totalRequests : 0;
  }

  private calculateAvailabilityScore(metrics: AgentPerformanceMetrics[]): number {
    if (metrics.length === 0) return 1;
    
    const availableAgents = metrics.filter(m => m.application.errorRate < 0.05).length;
    return availableAgents / metrics.length;
  }

  private calculateCoordinationEfficiency(metrics: AgentPerformanceMetrics[]): number {
    if (metrics.length === 0) return 1;
    
    const avgLatency = metrics.reduce((sum, m) => sum + m.coordination.coordinationLatency, 0) / metrics.length;
    const avgThroughput = metrics.reduce((sum, m) => sum + m.coordination.tasksProcessed, 0) / metrics.length;
    
    // 简化的效率计算：高吞吐量、低延迟 = 高效率
    const latencyScore = Math.max(0, 1 - avgLatency / 1000); // 假设1000ms为基准
    const throughputScore = Math.min(1, avgThroughput / 100); // 假设100 tasks/min为基准
    
    return (latencyScore + throughputScore) / 2;
  }

  private calculateResourceUtilization(metrics: AgentPerformanceMetrics[]): SystemMetrics['resourceUtilization'] {
    if (metrics.length === 0) {
      return { cpu: 0, memory: 0, network: 0, storage: 0 };
    }
    
    return {
      cpu: metrics.reduce((sum, m) => sum + m.cpu.usage, 0) / metrics.length,
      memory: metrics.reduce((sum, m) => sum + (m.memory.used / m.memory.total), 0) / metrics.length,
      network: metrics.reduce((sum, m) => sum + (m.network.bytesIn + m.network.bytesOut) / (100 * 1024 * 1024), 0) / metrics.length,
      storage: 0.5 // 简化实现
    };
  }

  private countHealthyAgents(metrics: AgentPerformanceMetrics[]): number {
    return metrics.filter(m => 
      m.cpu.usage < 0.8 && 
      m.memory.used / m.memory.total < 0.8 && 
      m.application.errorRate < 0.05
    ).length;
  }

  private countDegradedAgents(metrics: AgentPerformanceMetrics[]): number {
    return metrics.filter(m => 
      (m.cpu.usage >= 0.8 || m.memory.used / m.memory.total >= 0.8 || m.application.errorRate >= 0.05) &&
      m.application.errorRate < 0.2
    ).length;
  }

  private countCriticalAlerts(): number {
    return Array.from(this.activeAlerts.values()).filter(a => a.severity === 'critical').length;
  }

  private extractMetricValue(metrics: AgentPerformanceMetrics, metricPath: string): number | undefined {
    const parts = metricPath.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  private evaluateThreshold(value: number, threshold: MonitoringThreshold): boolean {
    switch (threshold.operator) {
      case '>': return value > threshold.value;
      case '<': return value < threshold.value;
      case '>=': return value >= threshold.value;
      case '<=': return value <= threshold.value;
      case '==': return Math.abs(value - threshold.value) < 0.001;
      case '!=': return Math.abs(value - threshold.value) >= 0.001;
      default: return false;
    }
  }

  private categorizeMetric(metric: string): Alert['category'] {
    if (metric.includes('cpu') || metric.includes('memory') || metric.includes('responseTime')) {
      return 'performance';
    }
    if (metric.includes('error') || metric.includes('availability')) {
      return 'availability';
    }
    if (metric.includes('coordination') || metric.includes('conflict')) {
      return 'coordination';
    }
    return 'performance';
  }

  private scheduleAlertEscalation(alert: Alert, rules: NonNullable<MonitoringThreshold['escalationRules']>): void {
    setTimeout(() => {
      if (this.activeAlerts.has(alert.id) && !alert.acknowledged) {
        alert.escalated = true;
        this.eventEmitter.emit('alert.escalated', { alert, escalateTo: rules.escalateTo });
      }
    }, rules.escalateAfter);
  }

  private calculateSystemCoherence(metrics: AgentPerformanceMetrics[]): number {
    // 简化的系统一致性计算
    if (metrics.length < 2) return 1;
    
    const avgLatency = metrics.reduce((sum, m) => sum + m.coordination.coordinationLatency, 0) / metrics.length;
    const latencyVariance = metrics.reduce((sum, m) => sum + Math.pow(m.coordination.coordinationLatency - avgLatency, 2), 0) / metrics.length;
    
    return Math.max(0, 1 - latencyVariance / (avgLatency + 1));
  }

  private calculateAdaptabilityScore(): number {
    // 基于最近的配置变更和响应时间计算适应性
    const recentChanges = this.systemMetricsHistory.slice(-10);
    if (recentChanges.length < 2) return 1;
    
    const variability = recentChanges.reduce((sum, current, idx) => {
      if (idx === 0) return 0;
      const prev = recentChanges[idx - 1];
      return sum + Math.abs(current.overallHealth - prev.overallHealth);
    }, 0) / (recentChanges.length - 1);
    
    return Math.max(0, 1 - variability);
  }

  private detectEmergentBehaviors(metrics: AgentPerformanceMetrics[]): string[] {
    const behaviors: string[] = [];
    
    // 检测负载均衡行为
    const loadBalance = this.checkLoadBalancing(metrics);
    if (loadBalance) behaviors.push('automatic_load_balancing');
    
    // 检测自适应行为
    const adaptive = this.checkAdaptiveBehavior(metrics);
    if (adaptive) behaviors.push('adaptive_resource_allocation');
    
    // 检测协同行为
    const coordination = this.checkCoordinationEmergence(metrics);
    if (coordination) behaviors.push('emergent_coordination_patterns');
    
    return behaviors;
  }

  private checkLoadBalancing(metrics: AgentPerformanceMetrics[]): boolean {
    if (metrics.length < 2) return false;
    
    const cpuUsages = metrics.map(m => m.cpu.usage);
    const avgCpu = cpuUsages.reduce((sum, cpu) => sum + cpu, 0) / cpuUsages.length;
    const variance = cpuUsages.reduce((sum, cpu) => sum + Math.pow(cpu - avgCpu, 2), 0) / cpuUsages.length;
    
    return variance < 0.1; // 低方差表示负载均衡
  }

  private checkAdaptiveBehavior(metrics: AgentPerformanceMetrics[]): boolean {
    // 检查是否有代理根据负载调整了行为
    return metrics.some(m => m.coordination.tasksProcessed > 0 && m.coordination.coordinationLatency < 100);
  }

  private checkCoordinationEmergence(metrics: AgentPerformanceMetrics[]): boolean {
    // 检查代理间是否出现了协调模式
    const totalConflicts = metrics.reduce((sum, m) => sum + m.coordination.conflictsResolved, 0);
    const totalTasks = metrics.reduce((sum, m) => sum + m.coordination.tasksProcessed, 0);
    
    return totalTasks > 0 && totalConflicts / totalTasks < 0.1; // 低冲突率表示良好协调
  }

  private setupEventListeners(): void {
    this.eventEmitter.on('agent.metrics', (metrics) => this.recordAgentMetrics(metrics));
    this.eventEmitter.on('system.scaling', (event) => this.handleScalingEvent(event));
    this.eventEmitter.on('coordination.conflict', (event) => this.handleCoordinationEvent(event));
  }

  private async handleScalingEvent(event: any): Promise<void> {
    // 记录扩缩容事件影响
    this.logger.log(`📊 Scaling event recorded: ${event.type}`);
  }

  private async handleCoordinationEvent(event: any): Promise<void> {
    // 记录协调事件
    this.logger.log(`🤝 Coordination event recorded: ${event.type}`);
  }

  private async cleanupExpiredAlerts(): Promise<void> {
    const now = Date.now();
    const expiredAlerts: string[] = [];
    
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.autoResolve && now - alert.timestamp.getTime() > 24 * 60 * 60 * 1000) { // 24小时自动解决
        expiredAlerts.push(alertId);
      }
    }
    
    for (const alertId of expiredAlerts) {
      await this.resolveAlert(alertId, 'system', 'Auto-resolved due to expiration');
    }
  }

  private async generateSystemHealthReport(): Promise<void> {
    const metrics = this.systemMetricsHistory[this.systemMetricsHistory.length - 1];
    if (!metrics) return;
    
    if (metrics.overallHealth < 0.8) {
      this.eventEmitter.emit('system.health.degraded', metrics);
    }
  }

  private async generateTrendReport(): Promise<void> {
    const trends = Array.from(this.performanceTrends.values());
    const degradingTrends = trends.filter(t => t.trend === 'degrading' && t.significance > 0.7);
    
    if (degradingTrends.length > 0) {
      this.eventEmitter.emit('system.trends.degrading', degradingTrends);
    }
  }

  private async predictSystemCapacity(): Promise<void> {
    // 容量预测逻辑
    const currentMetrics = this.systemMetricsHistory[this.systemMetricsHistory.length - 1];
    if (currentMetrics && currentMetrics.resourceUtilization.cpu > 0.8) {
      this.eventEmitter.emit('system.capacity.warning', currentMetrics);
    }
  }

  private async detectAnomalies(): Promise<void> {
    // 异常检测逻辑
    const recentMetrics = this.systemMetricsHistory.slice(-10);
    if (recentMetrics.length < 5) return;
    
    const avgHealth = recentMetrics.reduce((sum, m) => sum + m.overallHealth, 0) / recentMetrics.length;
    const currentHealth = recentMetrics[recentMetrics.length - 1].overallHealth;
    
    if (currentHealth < avgHealth * 0.8) {
      this.eventEmitter.emit('system.anomaly.detected', { currentHealth, avgHealth });
    }
  }

  private initializeDefaultThresholds(): void {
    const defaultThresholds: MonitoringThreshold[] = [
      {
        id: 'cpu_high',
        name: 'High CPU Usage',
        metric: 'cpu.usage',
        operator: '>',
        value: 0.8,
        duration: 300000, // 5分钟
        severity: 'warning',
        autoResolve: true
      },
      {
        id: 'memory_critical',
        name: 'Critical Memory Usage',
        metric: 'memory.used',
        operator: '>',
        value: 0.9,
        duration: 60000, // 1分钟
        severity: 'critical',
        autoResolve: false,
        escalationRules: {
          escalateAfter: 600000, // 10分钟
          escalateTo: ['admin@example.com']
        }
      },
      {
        id: 'error_rate_high',
        name: 'High Error Rate',
        metric: 'application.errorRate',
        operator: '>',
        value: 0.05,
        duration: 120000, // 2分钟
        severity: 'error',
        autoResolve: true
      },
      {
        id: 'response_time_slow',
        name: 'Slow Response Time',
        metric: 'application.averageResponseTime',
        operator: '>',
        value: 1000,
        duration: 180000, // 3分钟
        severity: 'warning',
        autoResolve: true
      }
    ];
    
    defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.id, threshold);
    });
  }

  /**
   * 获取监控状态
   */
  getMonitoringStatus(): any {
    return {
      agentsMonitored: this.agentMetrics.size,
      activeAlerts: this.activeAlerts.size,
      criticalAlerts: this.countCriticalAlerts(),
      thresholds: this.thresholds.size,
      trends: this.performanceTrends.size,
      dashboardConnections: this.dashboardConnections.size,
      systemHistory: this.systemMetricsHistory.length,
      latestSystemMetrics: this.systemMetricsHistory[this.systemMetricsHistory.length - 1]
    };
  }
}