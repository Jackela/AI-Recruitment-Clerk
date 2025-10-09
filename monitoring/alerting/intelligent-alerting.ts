/**
 * Intelligent Alerting System
 * AI-powered alert management with smart routing and escalation
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

// Enhanced type definitions for intelligent alerting system
export type ConditionValue = string | number | boolean | string[] | number[];
export type ActionParameterValue = string | number | boolean | string[] | number[] | Record<string, unknown>;

export interface AlertContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  sourceIp?: string;
  userAgent?: string;
  additionalData?: Record<string, ConditionValue>;
}

export interface PerformanceContext {
  avgCpuUsage: number;
  avgMemoryUsage: number;
  requestThroughput: number;
  errorRate: number;
  responseTime?: number;
  activeConnections?: number;
}

export interface HealthContext {
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  serviceDetails?: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    uptime?: number;
    lastCheck?: Date;
  }>;
}

export interface SecurityContext {
  eventType: 'authentication' | 'authorization' | 'intrusion' | 'data_breach' | 'malware' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceIp?: string;
  targetResource?: string;
  attackVector?: string;
  confidence?: number;
}

export interface SystemHealthData {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  services?: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    uptime?: number;
    responseTime?: number;
  }>;
  metrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    network?: number;
  };
}

export interface SecurityEventData {
  events?: SecurityContext[];
  metrics?: {
    criticalEvents: number;
    suspiciousActivities: number;
    blockedRequests: number;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface PerformanceEventData {
  metric: string;
  value: number;
  threshold?: number;
  timeWindow?: number;
  trend?: 'improving' | 'stable' | 'degrading';
  context?: PerformanceContext;
}

export interface HealthEventData {
  systemHealth?: SystemHealthData;
  affectedServices?: string[];
  healthScore?: number;
  context?: HealthContext;
}

export interface RemediationAction {
  action: 'restart_service' | 'scale_up' | 'scale_down' | 'block_ip' | 'restart_services' | 'block_suspicious_ips' | string;
  parameters: Record<string, ActionParameterValue>;
  conditions?: Array<{
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=' | '!=' | 'contains' | 'not_contains';
    value: ConditionValue;
  }>;
}

export interface SuppressionCondition {
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=' | 'contains' | 'not_contains';
  value: ConditionValue;
}

export interface Alert {
  id: string;
  type: 'health' | 'performance' | 'security' | 'business' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  metadata: {
    affectedServices?: string[];
    metrics?: Record<string, number>;
    predictions?: {
      timeToResolution?: number;
      impactLevel?: 'low' | 'medium' | 'high' | 'critical';
      autoResolvable?: boolean;
    };
    context?: AlertContext;
  };
  escalation: {
    level: number;
    escalatedAt?: Date;
    assignedTo?: string[];
    escalationHistory: Array<{
      level: number;
      timestamp: Date;
      reason: string;
      assignedTo: string[];
    }>;
  };
  actions: {
    taken: Array<{
      action: string;
      timestamp: Date;
      result: string;
      automated: boolean;
    }>;
    suggested: Array<{
      action: string;
      priority: number;
      description: string;
      automated: boolean;
    }>;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  condition: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=' | '!=' | 'contains' | 'not_contains';
    threshold: number | string;
    timeWindow: number; // minutes
    consecutiveOccurrences?: number;
  };
  severity: Alert['severity'];
  enabled: boolean;
  suppressionRules?: {
    conditions: SuppressionCondition[];
    duration: number; // minutes
  };
  escalationPolicy: {
    level1: { delay: number; contacts: string[] };
    level2: { delay: number; contacts: string[] };
    level3: { delay: number; contacts: string[] };
  };
  autoRemediation?: {
    enabled: boolean;
    actions: Array<{
      action: string;
      parameters: Record<string, ActionParameterValue>;
      conditions?: Array<{
        metric: string;
        operator: '>' | '<' | '=' | '>=' | '<=' | '!=' | 'contains' | 'not_contains';
        value: ConditionValue;
      }>;
    }>;
  };
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'pagerduty';
  config: {
    endpoint?: string;
    credentials?: Record<string, string>;
    preferences?: {
      minSeverity?: Alert['severity'];
      businessHoursOnly?: boolean;
      quietHours?: { start: string; end: string };
    };
  };
  status: 'active' | 'disabled' | 'error';
}

@Injectable()
export class IntelligentAlertingService {
  private readonly logger = new Logger(IntelligentAlertingService.name);
  private readonly eventEmitter = new EventEmitter2();
  
  private alerts = new Map<string, Alert>();
  private alertRules = new Map<string, AlertRule>();
  private notificationChannels = new Map<string, NotificationChannel>();
  private metricHistory = new Map<string, Array<{ timestamp: Date; value: number }>>();
  private suppressedAlerts = new Map<string, Date>(); // alertId -> suppressUntil
  
  // Alert correlation and grouping
  private alertGroups = new Map<string, string[]>(); // groupId -> alertIds
  private correlationRules = new Map<string, (alerts: Alert[]) => boolean>();

  constructor() {
    this.initializeDefaultRules();
    this.initializeNotificationChannels();
    this.logger.log('🚨 Intelligent Alerting System initialized');
  }

  /**
   * Create a new alert
   */
  createAlert(alertData: Partial<Alert>): Alert {
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      status: 'active',
      escalation: {
        level: 0,
        escalationHistory: [],
      },
      actions: {
        taken: [],
        suggested: [],
      },
      metadata: {},
      ...alertData as Alert,
    };

    // Apply intelligent analysis
    this.enrichAlert(alert);
    
    // Check for suppression
    if (this.shouldSuppressAlert(alert)) {
      alert.status = 'suppressed';
      this.suppressedAlerts.set(alert.id, new Date(Date.now() + 15 * 60 * 1000)); // Suppress for 15 minutes
    }

    // Store alert
    this.alerts.set(alert.id, alert);
    
    // Correlate with existing alerts
    this.correlateAlert(alert);
    
    // Generate suggested actions
    this.generateSuggestedActions(alert);
    
    // Attempt auto-remediation
    if (alert.status === 'active') {
      this.attemptAutoRemediation(alert);
    }
    
    // Send notifications
    this.sendNotifications(alert);
    
    this.logger.warn(`🚨 Alert Created: ${alert.title} (${alert.severity})`);
    this.eventEmitter.emit('alert.created', alert);
    
    return alert;
  }

  /**
   * Update alert status
   */
  updateAlert(alertId: string, updates: Partial<Alert>): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    Object.assign(alert, updates);
    
    this.eventEmitter.emit('alert.updated', alert);
    this.logger.debug(`📝 Alert Updated: ${alertId} - Status: ${alert.status}`);
    
    return alert;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') return false;

    alert.status = 'acknowledged';
    alert.actions.taken.push({
      action: 'acknowledged',
      timestamp: new Date(),
      result: `Acknowledged by ${userId}`,
      automated: false,
    });

    this.eventEmitter.emit('alert.acknowledged', { alert, userId });
    this.logger.log(`✅ Alert Acknowledged: ${alertId} by ${userId}`);
    
    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolution: string, automated: boolean = false): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.actions.taken.push({
      action: 'resolved',
      timestamp: new Date(),
      result: resolution,
      automated,
    });

    this.eventEmitter.emit('alert.resolved', { alert, resolution, automated });
    this.logger.log(`✅ Alert Resolved: ${alertId} - ${resolution}`);
    
    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(filters?: {
    type?: Alert['type'];
    severity?: Alert['severity'];
    source?: string;
    limit?: number;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values())
      .filter(alert => alert.status === 'active');

    if (filters) {
      if (filters.type) alerts = alerts.filter(a => a.type === filters.type);
      if (filters.severity) alerts = alerts.filter(a => a.severity === filters.severity);
      if (filters.source) alerts = alerts.filter(a => a.source === filters.source);
      if (filters.limit) alerts = alerts.slice(0, filters.limit);
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity] ||
             b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(hours: number = 24) {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const recentAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.timestamp.getTime() > cutoffTime);

    const stats = {
      total: recentAlerts.length,
      active: recentAlerts.filter(a => a.status === 'active').length,
      critical: recentAlerts.filter(a => a.severity === 'critical').length,
      resolved: recentAlerts.filter(a => a.status === 'resolved').length,
      autoResolved: recentAlerts.filter(a => 
        a.status === 'resolved' && 
        a.actions.taken.some(action => action.automated && action.action === 'resolved')
      ).length,
      meanTimeToResolution: this.calculateMTTR(recentAlerts),
      topSources: this.getTopAlertSources(recentAlerts),
      severityDistribution: {
        critical: recentAlerts.filter(a => a.severity === 'critical').length,
        error: recentAlerts.filter(a => a.severity === 'error').length,
        warning: recentAlerts.filter(a => a.severity === 'warning').length,
        info: recentAlerts.filter(a => a.severity === 'info').length,
      },
    };

    return stats;
  }

  /**
   * Event handlers for system monitoring
   */
  @OnEvent('health.critical')
  handleHealthCritical(data: HealthEventData): void {
    this.createAlert({
      type: 'health',
      severity: 'critical',
      title: 'System Health Critical',
      description: `System health has reached critical state: ${data.systemHealth?.overall}`,
      source: 'health-monitor',
      metadata: {
        affectedServices: data.systemHealth?.services?.filter((s: any) => s.status === 'critical').map((s: any) => s.name) || [],
        context: data,
      },
    });
  }

  @OnEvent('health.unhealthy')
  handleHealthUnhealthy(data: HealthEventData): void {
    this.createAlert({
      type: 'health',
      severity: 'error',
      title: 'System Health Degraded',
      description: 'One or more services are unhealthy',
      source: 'health-monitor',
      metadata: {
        affectedServices: data.systemHealth?.services?.filter((s: any) => s.status === 'unhealthy').map((s: any) => s.name) || [],
        context: data,
      },
    });
  }

  @OnEvent('security.critical')
  handleSecurityCritical(data: SecurityEventData): void {
    this.createAlert({
      type: 'security',
      severity: 'critical',
      title: 'Critical Security Incident',
      description: `Critical security events detected: ${data.metrics?.criticalEvents} events`,
      source: 'security-monitor',
      metadata: {
        metrics: data.metrics,
        context: data.events,
      },
    });
  }

  @OnEvent('performance.degraded')
  handlePerformanceDegraded(data: PerformanceEventData): void {
    this.createAlert({
      type: 'performance',
      severity: 'warning',
      title: 'Performance Degradation',
      description: `System performance has degraded: ${data.metric} = ${data.value}`,
      source: 'performance-monitor',
      metadata: {
        metrics: { [data.metric]: data.value },
        context: data,
      },
    });
  }

  /**
   * Escalation management
   */
  @Cron(CronExpression.EVERY_MINUTE)
  processEscalations(): void {
    const activeAlerts = this.getActiveAlerts();
    
    for (const alert of activeAlerts) {
      this.checkEscalation(alert);
    }
  }

  /**
   * Cleanup resolved alerts
   */
  @Cron(CronExpression.EVERY_HOUR)
  cleanupResolvedAlerts(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.status === 'resolved' && alert.timestamp.getTime() < cutoffTime) {
        this.alerts.delete(alertId);
      }
    }
    
    // Cleanup suppressed alerts
    for (const [alertId, suppressUntil] of this.suppressedAlerts.entries()) {
      if (suppressUntil.getTime() < Date.now()) {
        this.suppressedAlerts.delete(alertId);
      }
    }
    
    this.logger.debug('🧹 Cleaned up old alerts');
  }

  /**
   * Private helper methods
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private enrichAlert(alert: Alert): void {
    // Add predictions based on historical data
    alert.metadata.predictions = {
      timeToResolution: this.predictTimeToResolution(alert),
      impactLevel: this.assessImpactLevel(alert),
      autoResolvable: this.isAutoResolvable(alert),
    };

    // Add context from related metrics
    if (alert.type === 'performance') {
      alert.metadata.context = this.getPerformanceContext();
    } else if (alert.type === 'health') {
      alert.metadata.context = this.getHealthContext();
    }
  }

  private shouldSuppressAlert(alert: Alert): boolean {
    // Check if similar alert was recently suppressed
    const similarAlerts = Array.from(this.alerts.values())
      .filter(existing => 
        existing.type === alert.type &&
        existing.source === alert.source &&
        existing.title === alert.title &&
        existing.timestamp.getTime() > Date.now() - (15 * 60 * 1000) // Last 15 minutes
      );

    return similarAlerts.length > 3; // Suppress if more than 3 similar alerts in 15 minutes
  }

  private correlateAlert(alert: Alert): void {
    // Simple correlation based on time and affected services
    const recentAlerts = Array.from(this.alerts.values())
      .filter(existing => 
        existing.id !== alert.id &&
        existing.status === 'active' &&
        existing.timestamp.getTime() > Date.now() - (10 * 60 * 1000) // Last 10 minutes
      );

    // Find alerts affecting same services
    const relatedAlerts = recentAlerts.filter(existing => {
      const alertServices = alert.metadata.affectedServices || [];
      const existingServices = existing.metadata.affectedServices || [];
      return alertServices.some(service => existingServices.includes(service));
    });

    if (relatedAlerts.length > 0) {
      const groupId = this.generateAlertId();
      const alertIds = [alert.id, ...relatedAlerts.map(a => a.id)];
      this.alertGroups.set(groupId, alertIds);
      
      this.logger.debug(`🔗 Correlated ${alertIds.length} alerts in group ${groupId}`);
    }
  }

  private generateSuggestedActions(alert: Alert): void {
    const suggestions: Alert['actions']['suggested'] = [];

    // Generic suggestions based on alert type
    if (alert.type === 'health') {
      suggestions.push({
        action: 'restart_service',
        priority: 1,
        description: 'Restart affected services',
        automated: true,
      });
    } else if (alert.type === 'performance') {
      suggestions.push({
        action: 'scale_up',
        priority: 1,
        description: 'Scale up affected services',
        automated: true,
      });
    } else if (alert.type === 'security') {
      suggestions.push({
        action: 'block_ip',
        priority: 1,
        description: 'Block suspicious IP addresses',
        automated: true,
      });
    }

    // Add manual investigation suggestion
    suggestions.push({
      action: 'investigate',
      priority: 2,
      description: 'Manual investigation required',
      automated: false,
    });

    alert.actions.suggested = suggestions;
  }

  private attemptAutoRemediation(alert: Alert): void {
    // Check if auto-remediation is enabled for this alert type
    const rule = Array.from(this.alertRules.values())
      .find(r => r.type === alert.type && r.autoRemediation?.enabled);

    if (!rule || !rule.autoRemediation) return;

    // Execute auto-remediation actions
    for (const action of rule.autoRemediation.actions) {
      if (this.shouldExecuteAction(action, alert)) {
        this.executeRemediationAction(action, alert);
      }
    }
  }

  private shouldExecuteAction(action: RemediationAction, alert: Alert): boolean {
    if (!action.conditions) return true;

    // Check all conditions
    return action.conditions.every((condition) => {
      const metricValue = alert.metadata.metrics?.[condition.metric];
      if (metricValue === undefined) return false;

      switch (condition.operator) {
        case '>': return metricValue > condition.value;
        case '<': return metricValue < condition.value;
        case '>=': return metricValue >= condition.value;
        case '<=': return metricValue <= condition.value;
        case '=': return metricValue === condition.value;
        case '!=': return metricValue !== condition.value;
        default: return false;
      }
    });
  }

  private executeRemediationAction(action: RemediationAction, alert: Alert): void {
    // Log the action
    alert.actions.taken.push({
      action: action.action,
      timestamp: new Date(),
      result: 'Executed auto-remediation',
      automated: true,
    });

    // Simulate action execution
    this.logger.log(`🤖 Auto-remediation: ${action.action} for alert ${alert.id}`);
    
    // In production, this would call actual remediation services
    setTimeout(() => {
      // Simulate successful remediation
      if (Math.random() > 0.3) { // 70% success rate
        this.resolveAlert(alert.id, `Auto-resolved by ${action.action}`, true);
      }
    }, 5000);
  }

  private sendNotifications(alert: Alert): void {
    // Find applicable notification channels
    const channels = Array.from(this.notificationChannels.values())
      .filter(channel => 
        channel.status === 'active' &&
        this.shouldNotify(channel, alert)
      );

    for (const channel of channels) {
      this.sendNotification(channel, alert);
    }
  }

  private shouldNotify(channel: NotificationChannel, alert: Alert): boolean {
    const prefs = channel.config.preferences;
    if (!prefs) return true;

    // Check minimum severity
    if (prefs.minSeverity) {
      const severityOrder = { info: 1, warning: 2, error: 3, critical: 4 };
      if (severityOrder[alert.severity] < severityOrder[prefs.minSeverity]) {
        return false;
      }
    }

    // Check business hours
    if (prefs.businessHoursOnly) {
      const now = new Date();
      const hour = now.getHours();
      if (hour < 9 || hour > 17) return false;
    }

    // Check quiet hours
    if (prefs.quietHours) {
      const now = new Date();
      const hour = now.getHours();
      const start = parseInt(prefs.quietHours.start);
      const end = parseInt(prefs.quietHours.end);
      if (hour >= start || hour <= end) return false;
    }

    return true;
  }

  private sendNotification(channel: NotificationChannel, alert: Alert): void {
    // Simulate notification sending
    this.logger.log(`📤 Sending notification via ${channel.type} for alert ${alert.id}`);
    
    // In production, implement actual notification sending
    // e.g., email, SMS, Slack, webhook, etc.
  }

  private checkEscalation(alert: Alert): void {
    const rule = Array.from(this.alertRules.values())
      .find(r => r.type === alert.type);

    if (!rule) return;

    const alertAge = Date.now() - alert.timestamp.getTime();
    const escalationPolicy = rule.escalationPolicy;

    // Check for level 1 escalation
    if (alert.escalation.level === 0 && alertAge > escalationPolicy.level1.delay * 60 * 1000) {
      this.escalateAlert(alert, 1, escalationPolicy.level1.contacts);
    }
    // Check for level 2 escalation
    else if (alert.escalation.level === 1 && alertAge > escalationPolicy.level2.delay * 60 * 1000) {
      this.escalateAlert(alert, 2, escalationPolicy.level2.contacts);
    }
    // Check for level 3 escalation
    else if (alert.escalation.level === 2 && alertAge > escalationPolicy.level3.delay * 60 * 1000) {
      this.escalateAlert(alert, 3, escalationPolicy.level3.contacts);
    }
  }

  private escalateAlert(alert: Alert, level: number, contacts: string[]): void {
    alert.escalation.level = level;
    alert.escalation.escalatedAt = new Date();
    alert.escalation.assignedTo = contacts;
    
    alert.escalation.escalationHistory.push({
      level,
      timestamp: new Date(),
      reason: `Automatic escalation after timeout`,
      assignedTo: contacts,
    });

    this.logger.warn(`⬆️ Alert Escalated: ${alert.id} to level ${level}`);
    this.eventEmitter.emit('alert.escalated', { alert, level, contacts });
  }

  private predictTimeToResolution(alert: Alert): number {
    // Simple prediction based on historical data
    const similarAlerts = Array.from(this.alerts.values())
      .filter(existing => 
        existing.type === alert.type &&
        existing.severity === alert.severity &&
        existing.status === 'resolved'
      );

    if (similarAlerts.length === 0) return 30; // Default 30 minutes

    const resolutionTimes = similarAlerts.map(a => {
      const resolvedAction = a.actions.taken.find(action => action.action === 'resolved');
      return resolvedAction ? resolvedAction.timestamp.getTime() - a.timestamp.getTime() : 0;
    }).filter(time => time > 0);

    return resolutionTimes.length > 0 
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length / 60000) // Convert to minutes
      : 30;
  }

  private assessImpactLevel(alert: Alert): 'low' | 'medium' | 'high' | 'critical' {
    const affectedServices = alert.metadata.affectedServices?.length || 0;
    
    if (alert.severity === 'critical' || affectedServices > 3) return 'critical';
    if (alert.severity === 'error' || affectedServices > 1) return 'high';
    if (alert.severity === 'warning' || affectedServices > 0) return 'medium';
    return 'low';
  }

  private isAutoResolvable(alert: Alert): boolean {
    // Determine if alert can be auto-resolved based on type and severity
    return alert.type !== 'security' && alert.severity !== 'critical';
  }

  private getPerformanceContext(): PerformanceContext {
    return {
      avgCpuUsage: 45,
      avgMemoryUsage: 68,
      requestThroughput: 1200,
      errorRate: 2.1,
    };
  }

  private getHealthContext(): HealthContext {
    return {
      totalServices: 6,
      healthyServices: 4,
      degradedServices: 1,
      unhealthyServices: 1,
    };
  }

  private calculateMTTR(alerts: Alert[]): number {
    const resolvedAlerts = alerts.filter(a => a.status === 'resolved');
    if (resolvedAlerts.length === 0) return 0;

    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      const resolvedAction = alert.actions.taken.find(a => a.action === 'resolved');
      return sum + (resolvedAction ? resolvedAction.timestamp.getTime() - alert.timestamp.getTime() : 0);
    }, 0);

    return Math.round(totalTime / resolvedAlerts.length / 60000); // Convert to minutes
  }

  private getTopAlertSources(alerts: Alert[]): Array<{ source: string; count: number }> {
    const sourceCounts = new Map<string, number>();
    alerts.forEach(alert => {
      sourceCounts.set(alert.source, (sourceCounts.get(alert.source) || 0) + 1);
    });

    return Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private initializeDefaultRules(): void {
    // Default alert rules
    const defaultRules: AlertRule[] = [
      {
        id: 'health-critical',
        name: 'System Health Critical',
        type: 'health',
        condition: {
          metric: 'system.health.overall',
          operator: '=',
          threshold: 'critical',
          timeWindow: 1,
        },
        severity: 'critical',
        enabled: true,
        escalationPolicy: {
          level1: { delay: 5, contacts: ['on-call@company.com'] },
          level2: { delay: 15, contacts: ['team-lead@company.com'] },
          level3: { delay: 30, contacts: ['director@company.com'] },
        },
        autoRemediation: {
          enabled: true,
          actions: [{
            action: 'restart_services',
            parameters: { services: 'unhealthy' },
          }],
        },
      },
      {
        id: 'security-critical',
        name: 'Critical Security Event',
        type: 'security',
        condition: {
          metric: 'security.events.critical',
          operator: '>',
          threshold: 0,
          timeWindow: 5,
        },
        severity: 'critical',
        enabled: true,
        escalationPolicy: {
          level1: { delay: 1, contacts: ['security@company.com'] },
          level2: { delay: 5, contacts: ['security-lead@company.com'] },
          level3: { delay: 10, contacts: ['ciso@company.com'] },
        },
        autoRemediation: {
          enabled: true,
          actions: [{
            action: 'block_suspicious_ips',
            parameters: {},
          }],
        },
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private initializeNotificationChannels(): void {
    // Default notification channels
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'email-primary',
        name: 'Primary Email',
        type: 'email',
        config: {
          endpoint: 'smtp://localhost:587',
          preferences: {
            minSeverity: 'warning',
          },
        },
        status: 'active',
      },
      {
        id: 'slack-alerts',
        name: 'Slack Alerts',
        type: 'slack',
        config: {
          endpoint: process.env.SLACK_WEBHOOK_URL,
          preferences: {
            minSeverity: 'error',
          },
        },
        status: 'active',
      },
    ];

    defaultChannels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });
  }
}