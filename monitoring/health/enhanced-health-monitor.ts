/**
 * Enhanced Health Monitoring System
 * Comprehensive health checks for all system components with predictive analysis
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as os from 'os';
import * as process from 'process';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  lastCheck: Date;
  responseTime: number;
  details: {
    message: string;
    data?: any;
    error?: string;
    trend?: 'improving' | 'stable' | 'degrading';
    prediction?: 'stable' | 'risk' | 'critical';
  };
  metrics?: {
    availability: number; // Last 24h availability percentage
    avgResponseTime: number; // Average response time in ms
    errorCount: number; // Number of errors in last hour
    lastError?: Date;
  };
}

export interface SystemHealthSummary {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  services: HealthCheckResult[];
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  predictions: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    potentialIssues: string[];
    recommendations: string[];
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
}

export interface HealthThresholds {
  responseTime: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  availability: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  errorRate: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

@Injectable()
export class EnhancedHealthMonitorService implements OnModuleInit {
  private readonly logger = new Logger(EnhancedHealthMonitorService.name);
  private readonly eventEmitter = new EventEmitter2();
  private readonly startTime = Date.now();
  
  private healthHistory = new Map<string, HealthCheckResult[]>();
  private currentHealth = new Map<string, HealthCheckResult>();
  private healthChecks = new Map<string, () => Promise<HealthCheckResult>>();
  
  private readonly thresholds: HealthThresholds = {
    responseTime: { healthy: 500, degraded: 1000, unhealthy: 2000 },
    availability: { healthy: 99.9, degraded: 99.0, unhealthy: 95.0 },
    errorRate: { healthy: 0.1, degraded: 1.0, unhealthy: 5.0 },
  };

  constructor() {}

  async onModuleInit() {
    this.logger.log('🏥 Initializing Enhanced Health Monitor');
    this.registerDefaultHealthChecks();
    await this.performInitialHealthChecks();
  }

  /**
   * Register a custom health check
   */
  registerHealthCheck(name: string, checkFunction: () => Promise<HealthCheckResult>): void {
    this.healthChecks.set(name, checkFunction);
    this.logger.debug(`📋 Registered health check: ${name}`);
  }

  /**
   * Get comprehensive system health summary
   */
  async getSystemHealth(): Promise<SystemHealthSummary> {
    const services = Array.from(this.currentHealth.values());
    const overall = this.calculateOverallHealth(services);
    const predictions = this.generatePredictions(services);
    const performance = await this.getPerformanceMetrics();

    return {
      overall,
      services,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      predictions,
      performance,
    };
  }

  /**
   * Get health status for specific service
   */
  getServiceHealth(serviceName: string): HealthCheckResult | null {
    return this.currentHealth.get(serviceName) || null;
  }

  /**
   * Get health history for analysis
   */
  getHealthHistory(serviceName: string, hours: number = 24): HealthCheckResult[] {
    const history = this.healthHistory.get(serviceName) || [];
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    return history.filter(record => record.lastCheck.getTime() > cutoffTime);
  }

  /**
   * Perform health checks every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async performScheduledHealthChecks(): Promise<void> {
    try {
      await this.performAllHealthChecks();
    } catch (error) {
      this.logger.error('❌ Error during scheduled health checks:', error);
    }
  }

  /**
   * Perform deep health analysis every 5 minutes
   */
  @Cron('0 */5 * * * *')
  async performDeepHealthAnalysis(): Promise<void> {
    try {
      const systemHealth = await this.getSystemHealth();
      
      // Emit health events for alerting system
      if (systemHealth.overall === 'critical') {
        this.eventEmitter.emit('health.critical', systemHealth);
      } else if (systemHealth.overall === 'unhealthy') {
        this.eventEmitter.emit('health.unhealthy', systemHealth);
      } else if (systemHealth.predictions.riskLevel === 'high') {
        this.eventEmitter.emit('health.risk.high', systemHealth);
      }

      // Log health summary
      this.logger.log(`🏥 System Health: ${systemHealth.overall} | Services: ${systemHealth.services.length} | Risk: ${systemHealth.predictions.riskLevel}`);
      
    } catch (error) {
      this.logger.error('❌ Error during deep health analysis:', error);
    }
  }

  /**
   * Cleanup old health records every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  cleanupHealthHistory(): void {
    const cutoffTime = Date.now() - (72 * 60 * 60 * 1000); // Keep 72 hours of history
    
    for (const [serviceName, history] of this.healthHistory.entries()) {
      const filteredHistory = history.filter(record => record.lastCheck.getTime() > cutoffTime);
      this.healthHistory.set(serviceName, filteredHistory);
    }
    
    this.logger.debug('🧹 Cleaned up health history');
  }

  /**
   * Perform all registered health checks
   */
  private async performAllHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.healthChecks.entries()).map(
      async ([name, checkFunction]) => {
        try {
          const result = await Promise.race([
            checkFunction(),
            this.createTimeoutPromise(10000), // 10s timeout
          ]);
          
          this.updateHealthRecord(name, result);
          return result;
        } catch (error) {
          const errorResult: HealthCheckResult = {
            name,
            status: 'critical',
            lastCheck: new Date(),
            responseTime: 10000,
            details: {
              message: 'Health check failed',
              error: error.message,
              trend: 'degrading',
              prediction: 'critical',
            },
          };
          
          this.updateHealthRecord(name, errorResult);
          return errorResult;
        }
      }
    );

    await Promise.all(checkPromises);
  }

  /**
   * Perform initial health checks
   */
  private async performInitialHealthChecks(): Promise<void> {
    this.logger.log('🏁 Performing initial health checks...');
    await this.performAllHealthChecks();
    this.logger.log('✅ Initial health checks completed');
  }

  /**
   * Update health record and history
   */
  private updateHealthRecord(serviceName: string, result: HealthCheckResult): void {
    // Update current health
    this.currentHealth.set(serviceName, result);
    
    // Update health history
    const history = this.healthHistory.get(serviceName) || [];
    history.push(result);
    
    // Keep only last 1000 records per service
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.healthHistory.set(serviceName, history);
    
    // Calculate metrics
    this.calculateHealthMetrics(serviceName, result);
  }

  /**
   * Calculate health metrics for a service
   */
  private calculateHealthMetrics(serviceName: string, currentResult: HealthCheckResult): void {
    const history = this.getHealthHistory(serviceName, 24);
    
    if (history.length === 0) return;

    // Calculate availability
    const healthyCount = history.filter(r => r.status === 'healthy').length;
    const availability = (healthyCount / history.length) * 100;

    // Calculate average response time
    const responseTimes = history.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    // Calculate error count (last hour)
    const lastHour = Date.now() - (60 * 60 * 1000);
    const errorCount = history.filter(r => 
      r.status === 'unhealthy' || r.status === 'critical' && 
      r.lastCheck.getTime() > lastHour
    ).length;

    // Find last error
    const errors = history.filter(r => r.details.error);
    const lastError = errors.length > 0 ? errors[errors.length - 1].lastCheck : undefined;

    // Update current result with metrics
    currentResult.metrics = {
      availability,
      avgResponseTime,
      errorCount,
      lastError,
    };

    // Calculate trend
    if (history.length >= 3) {
      const recentResults = history.slice(-3);
      const recentAvailability = recentResults.filter(r => r.status === 'healthy').length / 3 * 100;
      
      if (recentAvailability > availability + 5) {
        currentResult.details.trend = 'improving';
      } else if (recentAvailability < availability - 5) {
        currentResult.details.trend = 'degrading';
      } else {
        currentResult.details.trend = 'stable';
      }
    }

    // Generate prediction
    currentResult.details.prediction = this.predictServiceHealth(serviceName, currentResult);
  }

  /**
   * Predict service health based on trends
   */
  private predictServiceHealth(serviceName: string, currentResult: HealthCheckResult): 'stable' | 'risk' | 'critical' {
    const history = this.getHealthHistory(serviceName, 6); // Last 6 hours
    
    if (history.length < 10) return 'stable';

    const metrics = currentResult.metrics;
    if (!metrics) return 'stable';

    // Critical conditions
    if (metrics.availability < this.thresholds.availability.unhealthy) return 'critical';
    if (metrics.errorCount > 10) return 'critical';
    if (currentResult.status === 'critical') return 'critical';

    // Risk conditions
    if (metrics.availability < this.thresholds.availability.degraded) return 'risk';
    if (metrics.avgResponseTime > this.thresholds.responseTime.degraded) return 'risk';
    if (currentResult.details.trend === 'degrading') return 'risk';

    return 'stable';
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(services: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' | 'critical' {
    if (services.length === 0) return 'healthy';

    const criticalCount = services.filter(s => s.status === 'critical').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    // Critical if any service is critical or >50% unhealthy
    if (criticalCount > 0 || unhealthyCount > services.length * 0.5) {
      return 'critical';
    }

    // Unhealthy if >30% services are unhealthy
    if (unhealthyCount > services.length * 0.3) {
      return 'unhealthy';
    }

    // Degraded if any services are unhealthy or degraded
    if (unhealthyCount > 0 || degradedCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Generate predictions and recommendations
   */
  private generatePredictions(services: HealthCheckResult[]): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    potentialIssues: string[];
    recommendations: string[];
  } {
    const criticalServices = services.filter(s => s.details.prediction === 'critical');
    const riskServices = services.filter(s => s.details.prediction === 'risk');
    const degradingServices = services.filter(s => s.details.trend === 'degrading');

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const potentialIssues: string[] = [];
    const recommendations: string[] = [];

    // Determine risk level
    if (criticalServices.length > 0) {
      riskLevel = 'critical';
    } else if (riskServices.length > services.length * 0.3) {
      riskLevel = 'high';
    } else if (riskServices.length > 0 || degradingServices.length > 0) {
      riskLevel = 'medium';
    }

    // Generate issues and recommendations
    if (criticalServices.length > 0) {
      potentialIssues.push(`${criticalServices.length} services predicted to fail`);
      recommendations.push('Immediate investigation required for critical services');
    }

    if (degradingServices.length > 0) {
      potentialIssues.push(`${degradingServices.length} services showing degrading trends`);
      recommendations.push('Monitor degrading services closely');
    }

    const highLatencyServices = services.filter(s => 
      s.metrics && s.metrics.avgResponseTime > this.thresholds.responseTime.degraded
    );
    
    if (highLatencyServices.length > 0) {
      potentialIssues.push(`${highLatencyServices.length} services with high latency`);
      recommendations.push('Investigate performance bottlenecks');
    }

    return { riskLevel, potentialIssues, recommendations };
  }

  /**
   * Get current performance metrics
   */
  private async getPerformanceMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    
    return {
      cpuUsage: Math.min(cpuUsage, 100),
      memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      diskUsage: 45, // Placeholder - implement actual disk monitoring
      networkLatency: Math.random() * 50 + 10, // Placeholder
    };
  }

  /**
   * Create timeout promise for health checks
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Register default health checks for all system components
   */
  private registerDefaultHealthChecks(): void {
    // Database health check
    this.registerHealthCheck('database', async () => {
      const startTime = Date.now();
      try {
        // Mock database connection check
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        const responseTime = Date.now() - startTime;
        const success = Math.random() > 0.02; // 98% success rate

        return {
          name: 'database',
          status: success ? 'healthy' : 'degraded',
          lastCheck: new Date(),
          responseTime,
          details: {
            message: success ? 'Database connection healthy' : 'Database experiencing delays',
            data: {
              connectionPool: success ? 'active' : 'degraded',
              activeConnections: Math.floor(Math.random() * 20) + 5,
              queryTime: responseTime,
            },
          },
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'critical',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          details: {
            message: 'Database connection failed',
            error: error.message,
          },
        };
      }
    });

    // Cache (Redis) health check
    this.registerHealthCheck('cache', async () => {
      const startTime = Date.now();
      try {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        const responseTime = Date.now() - startTime;
        const success = Math.random() > 0.01; // 99% success rate

        return {
          name: 'cache',
          status: success ? 'healthy' : 'degraded',
          lastCheck: new Date(),
          responseTime,
          details: {
            message: success ? 'Cache service healthy' : 'Cache service degraded',
            data: {
              hitRate: Math.random() * 20 + 80, // 80-100%
              memoryUsage: Math.random() * 30 + 40, // 40-70%
            },
          },
        };
      } catch (error) {
        return {
          name: 'cache',
          status: 'unhealthy',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          details: {
            message: 'Cache service unavailable',
            error: error.message,
          },
        };
      }
    });

    // Message Queue (NATS) health check
    this.registerHealthCheck('message-queue', async () => {
      const startTime = Date.now();
      try {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 75));
        const responseTime = Date.now() - startTime;
        const success = Math.random() > 0.015; // 98.5% success rate

        return {
          name: 'message-queue',
          status: success ? 'healthy' : 'degraded',
          lastCheck: new Date(),
          responseTime,
          details: {
            message: success ? 'Message queue healthy' : 'Message queue experiencing delays',
            data: {
              connectedClients: Math.floor(Math.random() * 10) + 3,
              queueDepth: Math.floor(Math.random() * 100),
              throughput: Math.floor(Math.random() * 1000) + 500,
            },
          },
        };
      } catch (error) {
        return {
          name: 'message-queue',
          status: 'critical',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          details: {
            message: 'Message queue connection failed',
            error: error.message,
          },
        };
      }
    });

    // Microservices health checks
    const microservices = [
      'resume-parser-svc',
      'jd-extractor-svc',
      'scoring-engine-svc',
      'report-generator-svc',
    ];

    microservices.forEach(service => {
      this.registerHealthCheck(service, async () => {
        const startTime = Date.now();
        try {
          // Simulate service health check
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
          const responseTime = Date.now() - startTime;
          const success = Math.random() > 0.05; // 95% success rate

          return {
            name: service,
            status: success ? 'healthy' : (Math.random() > 0.5 ? 'degraded' : 'unhealthy'),
            lastCheck: new Date(),
            responseTime,
            details: {
              message: success ? `${service} is healthy` : `${service} is experiencing issues`,
              data: {
                version: '1.0.0',
                uptime: Date.now() - this.startTime,
                memoryUsage: Math.random() * 50 + 30, // 30-80%
              },
            },
          };
        } catch (error) {
          return {
            name: service,
            status: 'critical',
            lastCheck: new Date(),
            responseTime: Date.now() - startTime,
            details: {
              message: `${service} is not responding`,
              error: error.message,
            },
          };
        }
      });
    });

    this.logger.log(`✅ Registered ${this.healthChecks.size} health checks`);
  }
}