/**
 * Security Monitoring System
 * Real-time security threat detection and anomaly monitoring
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * HTTP Request interface for security monitoring
 * Compatible with Express/Fastify request objects
 */
export interface HttpRequest {
  url: string;
  method: string;
  headers: {
    'user-agent'?: string;
    'x-forwarded-for'?: string;
    'x-real-ip'?: string;
    [key: string]: string | undefined;
  };
  body?: unknown;
  query?: Record<string, unknown>;
  connection?: { remoteAddress?: string };
  socket?: { remoteAddress?: string };
}

export interface SecurityEvent {
  id: string;
  type: 'authentication_failure' | 'suspicious_activity' | 'ddos_attempt' | 'data_breach' | 'unauthorized_access' | 'injection_attempt' | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  source: {
    ip: string;
    userAgent?: string;
    userId?: string;
    location?: string;
  };
  details: {
    endpoint?: string;
    method?: string;
    payload?: unknown;
    description: string;
    riskScore: number; // 0-100
  };
  response: {
    action: 'blocked' | 'flagged' | 'monitored' | 'escalated';
    reason: string;
  };
}

export interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  blockedRequests: number;
  failedLogins: number;
  suspiciousIPs: number;
  averageRiskScore: number;
  topThreats: Array<{
    type: string;
    count: number;
    lastSeen: Date;
  }>;
}

export interface SecurityThresholds {
  failedLoginsPerHour: number;
  requestsPerMinutePerIP: number;
  maxRiskScore: number;
  suspiciousActivityWindow: number; // minutes
}

@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger(SecurityMonitorService.name);
  private readonly eventEmitter = new EventEmitter2();
  
  private securityEvents: SecurityEvent[] = [];
  private ipTracker = new Map<string, Array<{ timestamp: Date; endpoint: string }>>();
  private failedAttempts = new Map<string, Array<{ timestamp: Date; userId?: string }>>();
  private suspiciousIPs = new Set<string>();
  private blockedIPs = new Set<string>();
  
  private readonly thresholds: SecurityThresholds = {
    failedLoginsPerHour: 5,
    requestsPerMinutePerIP: 100,
    maxRiskScore: 80,
    suspiciousActivityWindow: 15,
  };

  constructor() {
    this.logger.log('🛡️ Security Monitor initialized');
  }

  /**
   * Monitor HTTP request for security threats
   */
  monitorRequest(req: HttpRequest): SecurityEvent | null {
    const clientIP = this.extractClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const endpoint = req.url;
    const method = req.method;
    
    // Check if IP is blocked
    if (this.blockedIPs.has(clientIP)) {
      return this.createSecurityEvent({
        type: 'unauthorized_access',
        severity: 'high',
        source: { ip: clientIP, userAgent },
        details: {
          endpoint,
          method,
          description: 'Request from blocked IP',
          riskScore: 90,
        },
        response: { action: 'blocked', reason: 'IP in blocklist' },
      });
    }

    // Track request rate per IP
    this.trackIPActivity(clientIP, endpoint);
    
    // Check for rate limiting violations
    const rateLimitViolation = this.checkRateLimit(clientIP);
    if (rateLimitViolation) {
      return rateLimitViolation;
    }

    // Check for SQL injection attempts
    const sqlInjection = this.detectSQLInjection(req);
    if (sqlInjection) {
      return sqlInjection;
    }

    // Check for XSS attempts
    const xssAttempt = this.detectXSSAttempt(req);
    if (xssAttempt) {
      return xssAttempt;
    }

    // Check for path traversal
    const pathTraversal = this.detectPathTraversal(req);
    if (pathTraversal) {
      return pathTraversal;
    }

    return null;
  }

  /**
   * Monitor authentication attempts
   */
  monitorAuthAttempt(ip: string, userId: string | null, success: boolean, userAgent?: string): SecurityEvent | null {
    if (!success) {
      this.trackFailedAttempt(ip, userId);
      
      const recentFailures = this.getRecentFailedAttempts(ip, 60); // Last hour
      
      if (recentFailures.length >= this.thresholds.failedLoginsPerHour) {
        this.suspiciousIPs.add(ip);
        
        return this.createSecurityEvent({
          type: 'authentication_failure',
          severity: recentFailures.length > 10 ? 'critical' : 'high',
          source: { ip, userAgent, userId: userId || undefined },
          details: {
            description: `${recentFailures.length} failed login attempts in last hour`,
            riskScore: Math.min(recentFailures.length * 10, 100),
          },
          response: { 
            action: recentFailures.length > 10 ? 'blocked' : 'flagged',
            reason: 'Excessive failed login attempts'
          },
        });
      }
    } else {
      // Successful login from previously suspicious IP
      if (this.suspiciousIPs.has(ip)) {
        return this.createSecurityEvent({
          type: 'suspicious_activity',
          severity: 'medium',
          source: { ip, userAgent, userId: userId || undefined },
          details: {
            description: 'Successful login from previously flagged IP',
            riskScore: 60,
          },
          response: { action: 'monitored', reason: 'IP was previously flagged' },
        });
      }
    }

    return null;
  }

  /**
   * Monitor data access patterns
   */
  monitorDataAccess(userId: string, resource: string, action: string, ip: string): SecurityEvent | null {
    // Check for unusual data access patterns
    const isUnusualAccess = this.detectUnusualDataAccess(userId, resource, action);
    
    if (isUnusualAccess) {
      return this.createSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        source: { ip, userId },
        details: {
          description: `Unusual data access pattern: ${action} on ${resource}`,
          riskScore: 70,
        },
        response: { action: 'monitored', reason: 'Unusual access pattern detected' },
      });
    }

    // Check for privilege escalation attempts
    const privilegeEscalation = this.detectPrivilegeEscalation(userId, resource, action);
    if (privilegeEscalation) {
      return privilegeEscalation;
    }

    return null;
  }

  /**
   * Get current security metrics
   */
  getSecurityMetrics(hours: number = 24): SecurityMetrics {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const recentEvents = this.securityEvents.filter(e => e.timestamp.getTime() > cutoffTime);
    
    const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
    const blockedRequests = recentEvents.filter(e => e.response.action === 'blocked').length;
    const failedLogins = recentEvents.filter(e => e.type === 'authentication_failure').length;
    
    // Calculate top threats
    const threatCounts = new Map<string, number>();
    recentEvents.forEach(event => {
      threatCounts.set(event.type, (threatCounts.get(event.type) || 0) + 1);
    });
    
    const topThreats = Array.from(threatCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        lastSeen: recentEvents
          .filter(e => e.type === type)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp || new Date(),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalRiskScore = recentEvents.reduce((sum, e) => sum + e.details.riskScore, 0);
    const averageRiskScore = recentEvents.length > 0 ? totalRiskScore / recentEvents.length : 0;

    return {
      totalEvents: recentEvents.length,
      criticalEvents,
      blockedRequests,
      failedLogins,
      suspiciousIPs: this.suspiciousIPs.size,
      averageRiskScore,
      topThreats,
    };
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 100, severity?: string): SecurityEvent[] {
    let events = [...this.securityEvents];
    
    if (severity) {
      events = events.filter(e => e.severity === severity);
    }
    
    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Block or unblock IP address
   */
  blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    this.logger.warn(`🚫 Blocked IP: ${ip} - Reason: ${reason}`);
    
    this.createSecurityEvent({
      type: 'unauthorized_access',
      severity: 'high',
      source: { ip },
      details: {
        description: `IP blocked: ${reason}`,
        riskScore: 95,
      },
      response: { action: 'blocked', reason },
    });
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    this.logger.log(`✅ Unblocked IP: ${ip}`);
  }

  /**
   * Periodic security analysis
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performSecurityAnalysis(): Promise<void> {
    try {
      const metrics = this.getSecurityMetrics(1); // Last hour
      
      // Check for security incidents
      if (metrics.criticalEvents > 0) {
        this.eventEmitter.emit('security.critical', { metrics, events: this.getRecentEvents(10, 'critical') });
      }
      
      if (metrics.averageRiskScore > this.thresholds.maxRiskScore) {
        this.eventEmitter.emit('security.high-risk', { metrics });
      }
      
      // Auto-block IPs with excessive violations
      this.autoBlockMaliciousIPs();
      
      this.logger.debug(`🛡️ Security Analysis: ${metrics.totalEvents} events, ${metrics.criticalEvents} critical, ${metrics.suspiciousIPs} suspicious IPs`);
      
    } catch (error) {
      this.logger.error('❌ Error during security analysis:', error);
    }
  }

  /**
   * Cleanup old security events
   */
  @Cron(CronExpression.EVERY_HOUR)
  cleanupSecurityEvents(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    this.securityEvents = this.securityEvents.filter(event => 
      event.timestamp.getTime() > cutoffTime
    );
    
    // Cleanup IP tracking
    for (const [ip, activities] of this.ipTracker.entries()) {
      const recentActivities = activities.filter(a => a.timestamp.getTime() > cutoffTime);
      if (recentActivities.length === 0) {
        this.ipTracker.delete(ip);
      } else {
        this.ipTracker.set(ip, recentActivities);
      }
    }
    
    this.logger.debug('🧹 Cleaned up old security events');
  }

  /**
   * Private helper methods
   */
  private createSecurityEvent(eventData: Partial<SecurityEvent>): SecurityEvent {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...eventData as SecurityEvent,
    };
    
    this.securityEvents.push(event);
    
    // Emit event for real-time alerting
    this.eventEmitter.emit('security.event', event);
    
    this.logger.warn(`🚨 Security Event: ${event.type} (${event.severity}) from ${event.source.ip}`);
    
    return event;
  }

  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractClientIP(req: HttpRequest): string {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'unknown';
  }

  private trackIPActivity(ip: string, endpoint: string): void {
    const activities = this.ipTracker.get(ip) || [];
    activities.push({ timestamp: new Date(), endpoint });
    
    // Keep only last 1000 activities per IP
    if (activities.length > 1000) {
      activities.splice(0, activities.length - 1000);
    }
    
    this.ipTracker.set(ip, activities);
  }

  private checkRateLimit(ip: string): SecurityEvent | null {
    const activities = this.ipTracker.get(ip) || [];
    const oneMinuteAgo = Date.now() - (60 * 1000);
    const recentRequests = activities.filter(a => a.timestamp.getTime() > oneMinuteAgo);
    
    if (recentRequests.length > this.thresholds.requestsPerMinutePerIP) {
      return this.createSecurityEvent({
        type: 'ddos_attempt',
        severity: 'high',
        source: { ip },
        details: {
          description: `Rate limit exceeded: ${recentRequests.length} requests in 1 minute`,
          riskScore: 85,
        },
        response: { action: 'blocked', reason: 'Rate limit exceeded' },
      });
    }
    
    return null;
  }

  private detectSQLInjection(req: HttpRequest): SecurityEvent | null {
    const sqlPatterns = [
      /(\s*(union|select|insert|update|delete|drop|create|alter)\s+)/i,
      /(\s*(or|and)\s+\d+\s*=\s*\d+)/i,
      /(\s*;\s*(drop|delete|update|insert)\s+)/i,
      /(\s*'\s*(or|and)\s*'\d+'\s*=\s*'\d+')/i,
    ];
    
    const testString = JSON.stringify(req.body) + req.url + JSON.stringify(req.query);
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(testString)) {
        return this.createSecurityEvent({
          type: 'injection_attempt',
          severity: 'critical',
          source: { ip: this.extractClientIP(req), userAgent: req.headers['user-agent'] },
          details: {
            endpoint: req.url,
            method: req.method,
            description: 'SQL injection attempt detected',
            riskScore: 95,
          },
          response: { action: 'blocked', reason: 'SQL injection pattern detected' },
        });
      }
    }
    
    return null;
  }

  private detectXSSAttempt(req: HttpRequest): SecurityEvent | null {
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>.*<\/iframe>/i,
      /eval\s*\(/i,
    ];
    
    const testString = JSON.stringify(req.body) + req.url + JSON.stringify(req.query);
    
    for (const pattern of xssPatterns) {
      if (pattern.test(testString)) {
        return this.createSecurityEvent({
          type: 'injection_attempt',
          severity: 'high',
          source: { ip: this.extractClientIP(req), userAgent: req.headers['user-agent'] },
          details: {
            endpoint: req.url,
            method: req.method,
            description: 'XSS attempt detected',
            riskScore: 80,
          },
          response: { action: 'blocked', reason: 'XSS pattern detected' },
        });
      }
    }
    
    return null;
  }

  private detectPathTraversal(req: HttpRequest): SecurityEvent | null {
    const pathTraversalPatterns = [
      /\.\.\//,
      /\.\.\\\/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
    ];
    
    const testString = req.url + JSON.stringify(req.query);
    
    for (const pattern of pathTraversalPatterns) {
      if (pattern.test(testString)) {
        return this.createSecurityEvent({
          type: 'unauthorized_access',
          severity: 'high',
          source: { ip: this.extractClientIP(req), userAgent: req.headers['user-agent'] },
          details: {
            endpoint: req.url,
            method: req.method,
            description: 'Path traversal attempt detected',
            riskScore: 85,
          },
          response: { action: 'blocked', reason: 'Path traversal pattern detected' },
        });
      }
    }
    
    return null;
  }

  private trackFailedAttempt(ip: string, userId: string | null): void {
    const attempts = this.failedAttempts.get(ip) || [];
    attempts.push({ timestamp: new Date(), userId: userId || undefined });
    
    // Keep only last 100 attempts per IP
    if (attempts.length > 100) {
      attempts.splice(0, attempts.length - 100);
    }
    
    this.failedAttempts.set(ip, attempts);
  }

  private getRecentFailedAttempts(ip: string, minutes: number): Array<{ timestamp: Date; userId?: string }> {
    const attempts = this.failedAttempts.get(ip) || [];
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    
    return attempts.filter(attempt => attempt.timestamp.getTime() > cutoffTime);
  }

  private detectUnusualDataAccess(userId: string, resource: string, action: string): boolean {
    // Simplified unusual access detection
    // In production, this would use ML models and user behavior baselines
    const sensitiveResources = ['user-profiles', 'payment-data', 'admin-panel'];
    const sensitiveActions = ['delete', 'export', 'modify'];
    
    return sensitiveResources.includes(resource) && sensitiveActions.includes(action);
  }

  private detectPrivilegeEscalation(userId: string, resource: string, action: string): SecurityEvent | null {
    // Check for admin resource access from non-admin users
    const adminResources = ['admin-panel', 'user-management', 'system-config'];
    
    if (adminResources.includes(resource) && !this.isAdminUser(userId)) {
      return this.createSecurityEvent({
        type: 'privilege_escalation',
        severity: 'critical',
        source: { ip: 'internal', userId },
        details: {
          description: `Non-admin user attempting to access admin resource: ${resource}`,
          riskScore: 90,
        },
        response: { action: 'blocked', reason: 'Privilege escalation attempt' },
      });
    }
    
    return null;
  }

  private isAdminUser(userId: string): boolean {
    // In production, check against actual user roles
    return userId.includes('admin') || userId.includes('superuser');
  }

  private autoBlockMaliciousIPs(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentEvents = this.securityEvents.filter(e => e.timestamp.getTime() > oneHourAgo);
    
    // Group events by IP
    const ipEventCounts = new Map<string, number>();
    recentEvents.forEach(event => {
      const ip = event.source.ip;
      ipEventCounts.set(ip, (ipEventCounts.get(ip) || 0) + 1);
    });
    
    // Auto-block IPs with excessive security events
    for (const [ip, count] of ipEventCounts.entries()) {
      if (count >= 10 && !this.blockedIPs.has(ip)) {
        this.blockIP(ip, `Auto-blocked: ${count} security events in last hour`);
      }
    }
  }
}