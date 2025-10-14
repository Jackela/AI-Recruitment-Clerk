import { Injectable, Logger } from '@nestjs/common';

/**
 * Defines the shape of the query performance metrics.
 */
export interface QueryPerformanceMetrics {
  queryName: string;
  totalExecutions: number;
  totalDuration: number;
  totalMemory: number;
  successCount: number;
  errorCount: number;
  maxDuration: number;
  minDuration: number;
  avgDuration: number;
  successRate: number;
  p95Duration?: number;
  p99Duration?: number;
}

/**
 * Defines the shape of the query execution.
 */
export interface QueryExecution {
  duration: number;
  memoryDelta: number;
  success: boolean;
  timestamp: Date;
}

/**
 * High-performance database query monitoring utility
 * Tracks query performance with minimal overhead and provides detailed analytics
 */
@Injectable()
export class DatabasePerformanceMonitor {
  private readonly logger = new Logger(DatabasePerformanceMonitor.name);
  private readonly queryMetrics = new Map<
    string,
    {
      totalExecutions: number;
      totalDuration: number;
      totalMemory: number;
      successCount: number;
      errorCount: number;
      maxDuration: number;
      minDuration: number;
      executions: QueryExecution[];
    }
  >();

  private readonly PERFORMANCE_WARNING_THRESHOLD_MS = 1000;
  private readonly PERFORMANCE_ERROR_THRESHOLD_MS = 5000;
  private readonly MAX_EXECUTION_HISTORY = 1000;

  /**
   * Execute a database operation with comprehensive performance monitoring
   * @param operation The database operation to execute
   * @param queryName Unique identifier for the query type
   * @param expectedPerformanceMs Expected query time for comparison (optional)
   * @returns Promise resolving to the operation result
   */
  async executeWithMonitoring<T>(
    operation: () => Promise<T>,
    queryName: string,
    expectedPerformanceMs?: number,
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;

      // Record successful execution metrics
      this.recordQueryExecution(queryName, duration, memoryDelta, true);

      // Performance alerting
      this.evaluatePerformance(queryName, duration, expectedPerformanceMs);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;

      // Record failed execution metrics
      this.recordQueryExecution(queryName, duration, memoryDelta, false);

      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Query ${queryName} failed after ${duration}ms`, {
        duration,
        memoryDelta,
        error: errMsg,
      });

      throw error;
    }
  }

  /**
   * Execute with timeout and performance monitoring
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    queryName: string,
    timeoutMs: number = 10000,
  ): Promise<T> {
    return this.executeWithMonitoring(
      () => this.withTimeout(operation(), timeoutMs),
      queryName,
      timeoutMs * 0.8, // Set warning at 80% of timeout
    );
  }

  /**
   * Record query execution metrics
   */
  private recordQueryExecution(
    queryName: string,
    duration: number,
    memoryDelta: number,
    success: boolean,
  ): void {
    let metrics = this.queryMetrics.get(queryName);

    if (!metrics) {
      metrics = {
        totalExecutions: 0,
        totalDuration: 0,
        totalMemory: 0,
        successCount: 0,
        errorCount: 0,
        maxDuration: 0,
        minDuration: Infinity,
        executions: [],
      };
      this.queryMetrics.set(queryName, metrics);
    }

    // Update cumulative metrics
    metrics.totalExecutions++;
    metrics.totalDuration += duration;
    metrics.totalMemory += memoryDelta;
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    metrics.minDuration = Math.min(metrics.minDuration, duration);

    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    // Store individual execution for percentile calculations
    const execution: QueryExecution = {
      duration,
      memoryDelta,
      success,
      timestamp: new Date(),
    };

    metrics.executions.push(execution);

    // Maintain bounded history
    if (metrics.executions.length > this.MAX_EXECUTION_HISTORY) {
      metrics.executions.shift();
    }
  }

  /**
   * Evaluate query performance and emit appropriate logs/alerts
   */
  private evaluatePerformance(
    queryName: string,
    duration: number,
    expectedPerformanceMs?: number,
  ): void {
    const performanceRatio = expectedPerformanceMs
      ? duration / expectedPerformanceMs
      : null;

    if (duration > this.PERFORMANCE_ERROR_THRESHOLD_MS) {
      this.logger.error(
        `🚨 CRITICAL: Query ${queryName} took ${duration}ms (threshold: ${this.PERFORMANCE_ERROR_THRESHOLD_MS}ms)`,
        {
          queryName,
          duration,
          expectedPerformanceMs,
          performanceRatio,
        },
      );
    } else if (duration > this.PERFORMANCE_WARNING_THRESHOLD_MS) {
      this.logger.warn(
        `⚠️ SLOW: Query ${queryName} took ${duration}ms (threshold: ${this.PERFORMANCE_WARNING_THRESHOLD_MS}ms)`,
        {
          queryName,
          duration,
          expectedPerformanceMs,
          performanceRatio,
        },
      );
    } else if (
      expectedPerformanceMs &&
      performanceRatio &&
      performanceRatio < 0.5
    ) {
      this.logger.debug(
        `🚀 OPTIMIZED: Query ${queryName} performed ${Math.round((1 - performanceRatio) * 100)}% better than expected`,
        {
          queryName,
          duration,
          expectedPerformanceMs,
          improvement: `${Math.round((1 - performanceRatio) * 100)}%`,
        },
      );
    }
  }

  /**
   * Calculate percentiles from execution history
   */
  private calculatePercentiles(executions: QueryExecution[]): {
    p95Duration: number;
    p99Duration: number;
  } {
    const successfulExecutions = executions
      .filter((e) => e.success)
      .map((e) => e.duration)
      .sort((a, b) => a - b);

    if (successfulExecutions.length === 0) {
      return { p95Duration: 0, p99Duration: 0 };
    }

    const p95Index = Math.floor(successfulExecutions.length * 0.95);
    const p99Index = Math.floor(successfulExecutions.length * 0.99);

    return {
      p95Duration: successfulExecutions[p95Index] || 0,
      p99Duration: successfulExecutions[p99Index] || 0,
    };
  }

  /**
   * Get comprehensive performance report for all monitored queries
   */
  getPerformanceReport(): Record<string, QueryPerformanceMetrics> {
    const report: Record<string, QueryPerformanceMetrics> = {};

    for (const [queryName, rawMetrics] of this.queryMetrics.entries()) {
      const percentiles = this.calculatePercentiles(rawMetrics.executions);

      const metrics: QueryPerformanceMetrics = {
        queryName,
        totalExecutions: rawMetrics.totalExecutions,
        totalDuration: rawMetrics.totalDuration,
        totalMemory: rawMetrics.totalMemory,
        successCount: rawMetrics.successCount,
        errorCount: rawMetrics.errorCount,
        maxDuration: rawMetrics.maxDuration,
        minDuration:
          rawMetrics.minDuration === Infinity ? 0 : rawMetrics.minDuration,
        avgDuration:
          rawMetrics.totalExecutions > 0
            ? Math.round(rawMetrics.totalDuration / rawMetrics.totalExecutions)
            : 0,
        successRate:
          rawMetrics.totalExecutions > 0
            ? Math.round(
                (rawMetrics.successCount / rawMetrics.totalExecutions) * 100,
              )
            : 0,
        p95Duration: percentiles.p95Duration,
        p99Duration: percentiles.p99Duration,
      };

      report[queryName] = metrics;
    }

    return report;
  }

  /**
   * Get performance metrics for a specific query
   */
  getQueryMetrics(queryName: string): QueryPerformanceMetrics | null {
    const report = this.getPerformanceReport();
    return report[queryName] || null;
  }

  /**
   * Get top slowest queries
   */
  getSlowestQueries(limit = 10): QueryPerformanceMetrics[] {
    const report = this.getPerformanceReport();
    return Object.values(report)
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get queries with lowest success rates
   */
  getProblematicQueries(minExecutions = 5): QueryPerformanceMetrics[] {
    const report = this.getPerformanceReport();
    return Object.values(report)
      .filter((m) => m.totalExecutions >= minExecutions)
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 10);
  }

  /**
   * Reset metrics for a specific query or all queries
   */
  resetMetrics(queryName?: string): void {
    if (queryName) {
      this.queryMetrics.delete(queryName);
      this.logger.log(`Reset metrics for query: ${queryName}`);
    } else {
      this.queryMetrics.clear();
      this.logger.log('Reset all query metrics');
    }
  }

  /**
   * Get real-time performance summary
   */
  getRealTimeStats(): {
    totalQueries: number;
    avgResponseTime: number;
    successRate: number;
    slowQueries: number;
  } {
    const report = this.getPerformanceReport();
    const queries = Object.values(report);

    const totalExecutions = queries.reduce(
      (sum, q) => sum + q.totalExecutions,
      0,
    );
    const totalDuration = queries.reduce((sum, q) => sum + q.totalDuration, 0);
    const totalSuccesses = queries.reduce((sum, q) => sum + q.successCount, 0);
    const slowQueries = queries.filter(
      (q) => q.avgDuration > this.PERFORMANCE_WARNING_THRESHOLD_MS,
    ).length;

    return {
      totalQueries: totalExecutions,
      avgResponseTime:
        totalExecutions > 0 ? Math.round(totalDuration / totalExecutions) : 0,
      successRate:
        totalExecutions > 0
          ? Math.round((totalSuccesses / totalExecutions) * 100)
          : 0,
      slowQueries,
    };
  }

  /**
   * Helper method to add timeout to promises
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    timestamp: Date;
    metrics: Record<string, QueryPerformanceMetrics>;
    summary: ReturnType<
      typeof DatabasePerformanceMonitor.prototype.getRealTimeStats
    >;
  } {
    return {
      timestamp: new Date(),
      metrics: this.getPerformanceReport(),
      summary: this.getRealTimeStats(),
    };
  }
}
