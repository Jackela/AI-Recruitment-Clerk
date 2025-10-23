/**
 * @fileoverview DBC Production Monitoring and Performance Optimization
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 1.0.0
 * @module DBCMonitoring
 */

import { ContractViolationError } from './dbc.decorators';

/**
 * Defines the shape of the contract metrics.
 */
export interface ContractMetrics {
  operationName: string;
  contractType: 'PRE' | 'POST' | 'INVARIANT';
  executionTime: number;
  memoryUsage: number;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  serviceContext: string;
}

/**
 * Defines the shape of the performance profile.
 */
export interface PerformanceProfile {
  serviceName: string;
  operationName: string;
  averageExecutionTime: number;
  maxExecutionTime: number;
  contractViolations: number;
  successRate: number;
  lastUpdated: Date;
}

/**
 * Defines the shape of the alert threshold.
 */
export interface AlertThreshold {
  metricName: string;
  operator: 'gt' | 'lt' | 'eq';
  value: number;
  alertLevel: 'warning' | 'critical';
  cooldownMs: number;
}

/**
 * Production monitoring system for Design by Contract framework
 *
 * @class DBCMonitor
 * @implements Contract performance monitoring and alerting
 *
 * @since 1.0.0
 */
export class DBCMonitor {
  private metrics: ContractMetrics[] = [];
  private performanceProfiles: Map<string, PerformanceProfile> = new Map();
  private alertThresholds: AlertThreshold[] = [];
  private alertCooldowns: Map<string, number> = new Map();
  private readonly MAX_METRICS_HISTORY = 10000;

  /**
   * Initializes a new instance of the Dbc Monitor.
   */
  constructor() {
    this.initializeDefaultThresholds();
    this.startPerformanceAggregation();
  }

  /**
   * Records contract execution metrics
   *
   * @method recordContractExecution
   * @param {ContractMetrics} metric - Contract execution metrics
   */
  recordContractExecution(metric: ContractMetrics): void {
    // Add to metrics history
    this.metrics.push(metric);

    // Maintain metrics history size
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }

    // Update performance profile
    this.updatePerformanceProfile(metric);

    // Check alert thresholds
    this.checkAlertThresholds(metric);

    // Log high-level metrics for production monitoring
    if (!metric.success) {
      console.error(
        `[DBC_VIOLATION] ${metric.serviceContext}.${metric.operationName}`,
        {
          contractType: metric.contractType,
          error: metric.errorMessage,
          executionTime: metric.executionTime,
          timestamp: metric.timestamp,
        },
      );
    }
  }

  /**
   * Gets current performance statistics
   *
   * @method getPerformanceStats
   * @returns {Object} Current performance statistics
   */
  getPerformanceStats(): any {
    const totalContracts = this.metrics.length;
    const violations = this.metrics.filter((m) => !m.success).length;
    const avgExecutionTime =
      totalContracts > 0
        ? this.metrics.reduce((sum, m) => sum + m.executionTime, 0) /
          totalContracts
        : 0;

    const serviceStats = Array.from(this.performanceProfiles.values());

    return {
      totalContracts,
      contractViolations: violations,
      violationRate: totalContracts > 0 ? violations / totalContracts : 0,
      averageExecutionTime: avgExecutionTime,
      servicePerformance: serviceStats,
      lastUpdated: new Date(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }

  /**
   * Gets alerts that should be triggered
   *
   * @method getActiveAlerts
   * @returns {Array} Active alerts based on current metrics
   */
  getActiveAlerts(): any[] {
    const currentStats = this.getPerformanceStats();
    const alerts: any[] = [];

    this.alertThresholds.forEach((threshold) => {
      const metricValue = this.extractMetricValue(
        currentStats,
        threshold.metricName,
      );
      const shouldAlert = this.evaluateThreshold(metricValue, threshold);

      if (
        shouldAlert &&
        this.canTriggerAlert(threshold.metricName, threshold.cooldownMs)
      ) {
        alerts.push({
          alertId: `${threshold.metricName}_${threshold.alertLevel}_${Date.now()}`,
          metricName: threshold.metricName,
          currentValue: metricValue,
          threshold: threshold.value,
          alertLevel: threshold.alertLevel,
          message: this.generateAlertMessage(threshold, metricValue),
          timestamp: new Date(),
          serviceContext: 'DBC_Framework',
        });

        // Set cooldown
        this.alertCooldowns.set(threshold.metricName, Date.now());
      }
    });

    return alerts;
  }

  /**
   * Optimizes contract validation performance
   *
   * @method optimizePerformance
   * @returns {Object} Performance optimization results
   */
  optimizePerformance(): any {
    const optimizations: any[] = [];
    const stats = this.getPerformanceStats();

    // Identify slow operations
    const slowOperations = stats.servicePerformance
      .filter(
        (profile: PerformanceProfile) => profile.averageExecutionTime > 100,
      )
      .sort(
        (a: PerformanceProfile, b: PerformanceProfile) =>
          b.averageExecutionTime - a.averageExecutionTime,
      );

    if (slowOperations.length > 0) {
      optimizations.push({
        type: 'performance',
        issue: 'slow_contract_validation',
        recommendation:
          'Consider caching validation results for repeated checks',
        affectedServices: slowOperations.map(
          (op: PerformanceProfile) => op.serviceName,
        ),
        impact: 'high',
      });
    }

    // Identify high violation rates
    const highViolationServices = stats.servicePerformance
      .filter((profile: PerformanceProfile) => profile.successRate < 0.95)
      .sort(
        (a: PerformanceProfile, b: PerformanceProfile) =>
          a.successRate - b.successRate,
      );

    if (highViolationServices.length > 0) {
      optimizations.push({
        type: 'quality',
        issue: 'high_contract_violation_rate',
        recommendation: 'Review input validation and error handling logic',
        affectedServices: highViolationServices.map(
          (service: PerformanceProfile) => service.serviceName,
        ),
        impact: 'critical',
      });
    }

    // Memory usage optimization
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) {
      // 500MB
      optimizations.push({
        type: 'memory',
        issue: 'high_memory_usage',
        recommendation:
          'Consider reducing metrics history size or implementing metric aggregation',
        currentUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        impact: 'medium',
      });
    }

    return {
      optimizations,
      totalIssues: optimizations.length,
      priority: optimizations.some((opt) => opt.impact === 'critical')
        ? 'critical'
        : optimizations.some((opt) => opt.impact === 'high')
          ? 'high'
          : 'low',
      generatedAt: new Date(),
    };
  }

  /**
   * Generates production health report
   *
   * @method generateHealthReport
   * @returns {Object} Comprehensive health report
   */
  generateHealthReport(): any {
    const stats = this.getPerformanceStats();
    const alerts = this.getActiveAlerts();
    const optimizations = this.optimizePerformance();

    // Calculate health score (0-100)
    let healthScore = 100;

    // Deduct for violations
    healthScore -= Math.min(30, stats.violationRate * 100);

    // Deduct for slow performance
    if (stats.averageExecutionTime > 50) {
      healthScore -= Math.min(20, (stats.averageExecutionTime - 50) / 5);
    }

    // Deduct for active alerts
    healthScore -= Math.min(25, alerts.length * 5);

    // Ensure minimum score
    healthScore = Math.max(0, healthScore);

    const healthStatus =
      healthScore >= 90
        ? 'excellent'
        : healthScore >= 75
          ? 'good'
          : healthScore >= 50
            ? 'fair'
            : 'poor';

    return {
      healthScore: Math.round(healthScore),
      healthStatus,
      summary: {
        totalContracts: stats.totalContracts,
        violations: stats.contractViolations,
        violationRate: `${(stats.violationRate * 100).toFixed(2)}%`,
        averageExecutionTime: `${stats.averageExecutionTime.toFixed(2)}ms`,
        activeAlerts: alerts.length,
        optimizationIssues: optimizations.totalIssues,
      },
      details: {
        performance: stats,
        alerts: alerts,
        optimizations: optimizations.optimizations,
      },
      recommendations: this.generateHealthRecommendations(
        healthScore,
        stats,
        alerts,
        optimizations,
      ),
      generatedAt: new Date(),
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  // Private helper methods

  private initializeDefaultThresholds(): void {
    this.alertThresholds = [
      {
        metricName: 'violationRate',
        operator: 'gt',
        value: 0.05, // 5% violation rate
        alertLevel: 'warning',
        cooldownMs: 300000, // 5 minutes
      },
      {
        metricName: 'violationRate',
        operator: 'gt',
        value: 0.15, // 15% violation rate
        alertLevel: 'critical',
        cooldownMs: 300000, // 5 minutes
      },
      {
        metricName: 'averageExecutionTime',
        operator: 'gt',
        value: 100, // 100ms average
        alertLevel: 'warning',
        cooldownMs: 600000, // 10 minutes
      },
      {
        metricName: 'averageExecutionTime',
        operator: 'gt',
        value: 500, // 500ms average
        alertLevel: 'critical',
        cooldownMs: 300000, // 5 minutes
      },
    ];
  }

  private startPerformanceAggregation(): void {
    // Aggregate performance data every 5 minutes
    setInterval(
      () => {
        this.aggregatePerformanceData();
      },
      5 * 60 * 1000,
    );
  }

  private updatePerformanceProfile(metric: ContractMetrics): void {
    const key = `${metric.serviceContext}.${metric.operationName}`;
    let profile = this.performanceProfiles.get(key);

    if (!profile) {
      profile = {
        serviceName: metric.serviceContext,
        operationName: metric.operationName,
        averageExecutionTime: metric.executionTime,
        maxExecutionTime: metric.executionTime,
        contractViolations: metric.success ? 0 : 1,
        successRate: metric.success ? 1 : 0,
        lastUpdated: new Date(),
      };
    } else {
      const recentMetrics = this.getRecentMetrics(key, 100);
      const totalMetrics = recentMetrics.length;
      const successfulMetrics = recentMetrics.filter((m) => m.success).length;

      profile.averageExecutionTime =
        recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
        totalMetrics;
      profile.maxExecutionTime = Math.max(
        profile.maxExecutionTime,
        metric.executionTime,
      );
      profile.contractViolations = totalMetrics - successfulMetrics;
      profile.successRate = successfulMetrics / totalMetrics;
      profile.lastUpdated = new Date();
    }

    this.performanceProfiles.set(key, profile);
  }

  private getRecentMetrics(
    operationKey: string,
    count: number,
  ): ContractMetrics[] {
    return this.metrics
      .filter((m) => `${m.serviceContext}.${m.operationName}` === operationKey)
      .slice(-count);
  }

  private checkAlertThresholds(metric: ContractMetrics): void {
    // This method would trigger real-time alerts based on individual metrics
    if (!metric.success && metric.contractType === 'POST') {
      // Critical contract violation in postcondition
      console.error(
        `[CRITICAL_DBC_VIOLATION] ${metric.serviceContext}.${metric.operationName}`,
        {
          error: metric.errorMessage,
          timestamp: metric.timestamp,
        },
      );
    }

    if (metric.executionTime > 1000) {
      // Very slow contract validation
      console.warn(
        `[SLOW_DBC_VALIDATION] ${metric.serviceContext}.${metric.operationName}`,
        {
          executionTime: metric.executionTime,
          timestamp: metric.timestamp,
        },
      );
    }
  }

  private extractMetricValue(stats: any, metricName: string): number {
    switch (metricName) {
      case 'violationRate':
        return stats.violationRate;
      case 'averageExecutionTime':
        return stats.averageExecutionTime;
      case 'memoryUsage':
        return stats.memoryUsage.heapUsed;
      default:
        return 0;
    }
  }

  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt':
        return value > threshold.value;
      case 'lt':
        return value < threshold.value;
      case 'eq':
        return value === threshold.value;
      default:
        return false;
    }
  }

  private canTriggerAlert(metricName: string, cooldownMs: number): boolean {
    const lastAlert = this.alertCooldowns.get(metricName);
    return !lastAlert || Date.now() - lastAlert > cooldownMs;
  }

  private generateAlertMessage(
    threshold: AlertThreshold,
    currentValue: number,
  ): string {
    const operator =
      threshold.operator === 'gt'
        ? 'above'
        : threshold.operator === 'lt'
          ? 'below'
          : 'equal to';
    return `${threshold.metricName} is ${operator} threshold: ${currentValue} ${threshold.operator} ${threshold.value}`;
  }

  private aggregatePerformanceData(): void {
    // Clean up old metrics
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.metrics = this.metrics.filter(
      (m) => m.timestamp.getTime() > fiveMinutesAgo,
    );

    // Update performance profiles
    this.performanceProfiles.forEach((profile, key) => {
      const recentMetrics = this.getRecentMetrics(key, 50);
      if (recentMetrics.length > 0) {
        profile.averageExecutionTime =
          recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
          recentMetrics.length;
        profile.successRate =
          recentMetrics.filter((m) => m.success).length / recentMetrics.length;
        profile.lastUpdated = new Date();
      }
    });
  }

  private generateHealthRecommendations(
    healthScore: number,
    stats: any,
    alerts: any[],
    optimizations: any,
  ): string[] {
    const recommendations: string[] = [];

    if (healthScore < 50) {
      recommendations.push(
        'URGENT: Review all contract violations and performance issues immediately',
      );
      recommendations.push(
        'Consider implementing circuit breaker pattern for failing services',
      );
    }

    if (stats.violationRate > 0.1) {
      recommendations.push(
        'High contract violation rate detected - review input validation logic',
      );
      recommendations.push(
        'Consider adding more comprehensive precondition checks',
      );
    }

    if (stats.averageExecutionTime > 100) {
      recommendations.push(
        'Contract validation performance is slow - consider optimization',
      );
      recommendations.push(
        'Implement caching for frequently validated data structures',
      );
    }

    if (alerts.length > 0) {
      recommendations.push(
        `${alerts.length} active alert(s) require immediate attention`,
      );
    }

    if (optimizations.totalIssues > 0) {
      recommendations.push(
        `${optimizations.totalIssues} optimization opportunity(s) identified`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'DBC framework is performing well - maintain current practices',
      );
      recommendations.push(
        'Consider periodic health reviews to maintain quality standards',
      );
    }

    return recommendations;
  }
}

// Singleton instance for production use
export const dbcMonitor = new DBCMonitor();

/**
 * Production-ready contract performance decorator
 *
 * @function withMonitoring
 * @param {string} serviceContext - Service context name
 * @returns {Function} Method decorator for monitoring
 *
 * @example
 * ```typescript
 * @withMonitoring('ScoringService')
 * async calculateScore(jd, resume) {
 *   // Implementation
 * }
 * ```
 */
export function withMonitoring(serviceContext: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // Touch target to satisfy TS6133 in strict settings
    void target;
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;

      try {
        const result = await originalMethod.apply(this, args);

        // Record successful execution
        dbcMonitor.recordContractExecution({
          operationName: propertyKey,
          contractType: 'POST',
          executionTime: Date.now() - startTime,
          memoryUsage: process.memoryUsage().heapUsed - initialMemory,
          success: true,
          timestamp: new Date(),
          serviceContext,
        });

        return result;
      } catch (error) {
        // Record contract violation or error
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        dbcMonitor.recordContractExecution({
          operationName: propertyKey,
          contractType:
            error instanceof ContractViolationError
              ? errorMessage.includes('PRE')
                ? 'PRE'
                : 'POST'
              : 'POST',
          executionTime: Date.now() - startTime,
          memoryUsage: process.memoryUsage().heapUsed - initialMemory,
          success: false,
          errorMessage,
          timestamp: new Date(),
          serviceContext,
        });

        throw error;
      }
    };

    return descriptor;
  };
}
