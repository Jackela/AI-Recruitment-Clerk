import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Redis } from 'ioredis';
import { UserProfile } from '../schemas/user-profile.schema';

export interface SecurityEvent {
  id: string;
  type: 'LOGIN_FAILURE' | 'ACCOUNT_LOCKOUT' | 'MFA_FAILURE' | 'SUSPICIOUS_ACTIVITY' | 'PASSWORD_RESET' | 'PRIVILEGE_ESCALATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highSeverityEvents: number;
  mediumSeverityEvents: number;
  lowSeverityEvents: number;
  resolvedEvents: number;
  unresolvedEvents: number;
  topEventTypes: Array<{ type: string; count: number }>;
  topSourceIPs: Array<{ ip: string; count: number }>;
  eventsByHour: Array<{ hour: number; count: number }>;
}

@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger(SecurityMonitorService.name);
  private redis: Redis;
  
  constructor(
    @InjectModel(UserProfile.name) private userModel: Model<UserProfile>,
    private configService: ConfigService,
  ) {
    this.initializeRedis();
    this.startPeriodicAnalysis();
  }

  private initializeRedis() {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get<string>('REDIS_PORT') || '6379'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error in security monitor:', error);
    });
  }

  async recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    const eventId = `security_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const securityEvent: SecurityEvent = {
      id: eventId,
      timestamp: new Date(),
      resolved: false,
      ...event
    };

    try {
      // Store in Redis for fast access
      const eventKey = `security_events:${eventId}`;
      await this.redis.setex(eventKey, 86400 * 30, JSON.stringify(securityEvent)); // 30 days

      // Add to sorted set for time-based queries
      const timeSeriesKey = 'security_events:timeline';
      await this.redis.zadd(timeSeriesKey, Date.now(), eventId);
      await this.redis.expire(timeSeriesKey, 86400 * 30);

      // Update metrics
      await this.updateSecurityMetrics(securityEvent);

      // Trigger alerts for high severity events
      if (securityEvent.severity === 'HIGH' || securityEvent.severity === 'CRITICAL') {
        await this.triggerSecurityAlert(securityEvent);
      }

      this.logger.warn(`Security event recorded: ${event.type} from ${event.ip}`, {
        eventId,
        severity: event.severity,
        userId: event.userId
      });

      return eventId;
    } catch (error) {
      this.logger.error(`Failed to record security event: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSecurityEvents(options: {
    limit?: number;
    offset?: number;
    severity?: string[];
    type?: string[];
    resolved?: boolean;
    ip?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{ events: SecurityEvent[]; total: number }> {
    try {
      const {
        limit = 50,
        offset = 0,
        severity,
        type,
        resolved,
        ip,
        userId,
        startDate,
        endDate
      } = options;

      // Get event IDs from timeline
      const timelineKey = 'security_events:timeline';
      const startScore = startDate ? startDate.getTime() : '-inf';
      const endScore = endDate ? endDate.getTime() : '+inf';
      
      const eventIds = await this.redis.zrevrangebyscore(
        timelineKey,
        endScore,
        startScore,
        'LIMIT',
        offset,
        limit + offset
      );

      const events: SecurityEvent[] = [];
      
      for (const eventId of eventIds) {
        const eventKey = `security_events:${eventId}`;
        const eventData = await this.redis.get(eventKey);
        
        if (eventData) {
          const event: SecurityEvent = JSON.parse(eventData);
          
          // Apply filters
          if (severity && !severity.includes(event.severity)) continue;
          if (type && !type.includes(event.type)) continue;
          if (resolved !== undefined && event.resolved !== resolved) continue;
          if (ip && event.ip !== ip) continue;
          if (userId && event.userId !== userId) continue;
          
          events.push(event);
        }
      }

      const total = await this.redis.zcard(timelineKey);
      
      return {
        events: events.slice(0, limit),
        total
      };
    } catch (error) {
      this.logger.error(`Failed to get security events: ${error.message}`, error.stack);
      return { events: [], total: 0 };
    }
  }

  async getSecurityMetrics(period: 'hour' | 'day' | 'week' = 'day'): Promise<SecurityMetrics> {
    try {
      const periodMs = period === 'hour' ? 3600000 : period === 'day' ? 86400000 : 604800000;
      const startTime = Date.now() - periodMs;
      
      const timelineKey = 'security_events:timeline';
      const eventIds = await this.redis.zrangebyscore(timelineKey, startTime, '+inf');
      
      const metrics: SecurityMetrics = {
        totalEvents: 0,
        criticalEvents: 0,
        highSeverityEvents: 0,
        mediumSeverityEvents: 0,
        lowSeverityEvents: 0,
        resolvedEvents: 0,
        unresolvedEvents: 0,
        topEventTypes: [],
        topSourceIPs: [],
        eventsByHour: []
      };

      const eventTypeCounts = new Map<string, number>();
      const ipCounts = new Map<string, number>();
      const hourlyBuckets = new Map<number, number>();

      for (const eventId of eventIds) {
        const eventKey = `security_events:${eventId}`;
        const eventData = await this.redis.get(eventKey);
        
        if (eventData) {
          const event: SecurityEvent = JSON.parse(eventData);
          
          metrics.totalEvents++;
          
          switch (event.severity) {
            case 'CRITICAL': metrics.criticalEvents++; break;
            case 'HIGH': metrics.highSeverityEvents++; break;
            case 'MEDIUM': metrics.mediumSeverityEvents++; break;
            case 'LOW': metrics.lowSeverityEvents++; break;
          }
          
          if (event.resolved) {
            metrics.resolvedEvents++;
          } else {
            metrics.unresolvedEvents++;
          }
          
          // Count event types
          eventTypeCounts.set(event.type, (eventTypeCounts.get(event.type) || 0) + 1);
          
          // Count source IPs
          ipCounts.set(event.ip, (ipCounts.get(event.ip) || 0) + 1);
          
          // Count by hour
          const hour = new Date(event.timestamp).getHours();
          hourlyBuckets.set(hour, (hourlyBuckets.get(hour) || 0) + 1);
        }
      }

      // Convert maps to sorted arrays
      metrics.topEventTypes = Array.from(eventTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      metrics.topSourceIPs = Array.from(ipCounts.entries())
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      metrics.eventsByHour = Array.from(hourlyBuckets.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour);

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get security metrics: ${error.message}`, error.stack);
      return {
        totalEvents: 0,
        criticalEvents: 0,
        highSeverityEvents: 0,
        mediumSeverityEvents: 0,
        lowSeverityEvents: 0,
        resolvedEvents: 0,
        unresolvedEvents: 0,
        topEventTypes: [],
        topSourceIPs: [],
        eventsByHour: []
      };
    }
  }

  async resolveSecurityEvent(eventId: string, resolvedBy: string, resolution: string): Promise<boolean> {
    try {
      const eventKey = `security_events:${eventId}`;
      const eventData = await this.redis.get(eventKey);
      
      if (!eventData) {
        return false;
      }
      
      const event: SecurityEvent = JSON.parse(eventData);
      event.resolved = true;
      event.resolvedAt = new Date();
      event.resolvedBy = resolvedBy;
      event.details.resolution = resolution;
      
      await this.redis.setex(eventKey, 86400 * 30, JSON.stringify(event));
      
      this.logger.log(`Security event ${eventId} resolved by ${resolvedBy}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to resolve security event: ${error.message}`, error.stack);
      return false;
    }
  }

  private async updateSecurityMetrics(event: SecurityEvent) {
    const date = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    
    // Daily metrics
    await this.redis.incr(`security_metrics:${date}:total`);
    await this.redis.incr(`security_metrics:${date}:severity:${event.severity.toLowerCase()}`);
    await this.redis.incr(`security_metrics:${date}:type:${event.type.toLowerCase()}`);
    
    // Hourly metrics
    await this.redis.incr(`security_metrics:${date}:hour:${hour}`);
    
    // Set expiry on metric keys (30 days)
    await this.redis.expire(`security_metrics:${date}:total`, 86400 * 30);
    await this.redis.expire(`security_metrics:${date}:severity:${event.severity.toLowerCase()}`, 86400 * 30);
    await this.redis.expire(`security_metrics:${date}:type:${event.type.toLowerCase()}`, 86400 * 30);
    await this.redis.expire(`security_metrics:${date}:hour:${hour}`, 86400 * 30);
  }

  private async triggerSecurityAlert(event: SecurityEvent) {
    try {
      const webhookUrl = this.configService.get<string>('SECURITY_WEBHOOK_URL');
      
      if (webhookUrl) {
        // Send webhook notification (implement based on your monitoring system)
        this.logger.warn(`High severity security alert: ${event.type}`, {
          eventId: event.id,
          ip: event.ip,
          userId: event.userId,
          severity: event.severity
        });
      }
      
      // Store alert for dashboard
      const alertKey = `security_alerts:${event.id}`;
      const alert = {
        ...event,
        alertTriggeredAt: new Date(),
        acknowledged: false
      };
      
      await this.redis.setex(alertKey, 86400 * 7, JSON.stringify(alert)); // 7 days
      
      // Add to alerts timeline
      await this.redis.zadd('security_alerts:timeline', Date.now(), event.id);
      await this.redis.expire('security_alerts:timeline', 86400 * 7);
      
    } catch (error) {
      this.logger.error(`Failed to trigger security alert: ${error.message}`, error.stack);
    }
  }

  private startPeriodicAnalysis() {
    // Run security analysis every hour
    setInterval(async () => {
      try {
        await this.performSecurityAnalysis();
      } catch (error) {
        this.logger.error('Periodic security analysis failed:', error);
      }
    }, 3600000); // 1 hour

    this.logger.log('Periodic security analysis started');
  }

  private async performSecurityAnalysis() {
    this.logger.debug('Starting periodic security analysis');
    
    try {
      // Analyze patterns in security events
      const metrics = await this.getSecurityMetrics('hour');
      
      // Check for anomalies
      if (metrics.criticalEvents > 0) {
        this.logger.warn(`Critical security events detected in last hour: ${metrics.criticalEvents}`);
      }
      
      if (metrics.highSeverityEvents > 10) {
        this.logger.warn(`High number of high-severity events in last hour: ${metrics.highSeverityEvents}`);
      }
      
      // Clean up old events (older than 30 days)
      const cutoffTime = Date.now() - (86400000 * 30);
      await this.redis.zremrangebyscore('security_events:timeline', '-inf', cutoffTime);
      await this.redis.zremrangebyscore('security_alerts:timeline', '-inf', cutoffTime);
      
      this.logger.debug('Periodic security analysis completed');
    } catch (error) {
      this.logger.error('Security analysis error:', error);
    }
  }

  // Helper method for other services to use
  async recordLoginFailure(ip: string, userAgent: string, attemptedEmail?: string, userId?: string) {
    return this.recordSecurityEvent({
      type: 'LOGIN_FAILURE',
      severity: 'MEDIUM',
      ip,
      userAgent,
      userId,
      details: {
        attemptedEmail,
        timestamp: new Date().toISOString()
      }
    });
  }

  async recordAccountLockout(ip: string, userAgent: string, userId: string, reason: string) {
    return this.recordSecurityEvent({
      type: 'ACCOUNT_LOCKOUT',
      severity: 'HIGH',
      ip,
      userAgent,
      userId,
      details: {
        reason,
        timestamp: new Date().toISOString()
      }
    });
  }

  async recordMfaFailure(ip: string, userAgent: string, userId: string, method: string) {
    return this.recordSecurityEvent({
      type: 'MFA_FAILURE',
      severity: 'HIGH',
      ip,
      userAgent,
      userId,
      details: {
        mfaMethod: method,
        timestamp: new Date().toISOString()
      }
    });
  }

  async recordSuspiciousActivity(ip: string, userAgent: string, activity: string, details?: any) {
    return this.recordSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'HIGH',
      ip,
      userAgent,
      details: {
        activity,
        additionalDetails: details,
        timestamp: new Date().toISOString()
      }
    });
  }
}