import { Injectable, Logger } from '@nestjs/common';
import type { ReportRepository } from './report.repository';

/**
 * Defines the shape of the performance metrics.
 */
export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: {
    reportType?: string;
    jobId?: string;
    resumeId?: string;
    outputFormat?: string;
    llmModel?: string;
    tokensUsed?: number;
    confidence?: number;
    fileSize?: number;
  };
}

/**
 * Defines the shape of the quality metrics.
 */
export interface QualityMetrics {
  reportId: string;
  qualityScore: number;
  criteriaScores: {
    completeness: number;
    accuracy: number;
    relevance: number;
    clarity: number;
    actionability: number;
  };
  reviewerFeedback?: string;
  improvementSuggestions?: string[];
  timestamp: Date;
}

/**
 * Defines the shape of the performance summary.
 */
export interface PerformanceSummary {
  totalReports: number;
  successRate: number;
  averageGenerationTime: number;
  medianGenerationTime: number;
  averageQualityScore: number;
  reportsByType: Record<string, number>;
  reportsByFormat: Record<string, number>;
  errorBreakdown: Record<string, number>;
  qualityTrends: {
    date: string;
    averageQuality: number;
    reportCount: number;
  }[];
  performanceTrends: {
    date: string;
    averageTime: number;
    successRate: number;
    reportCount: number;
  }[];
}

/**
 * Provides performance monitor functionality.
 */
@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly activeMetrics = new Map<string, PerformanceMetrics>();
  private readonly qualityMetrics: QualityMetrics[] = [];
  private readonly performanceHistory: PerformanceMetrics[] = [];

  // Performance thresholds (configurable via environment)
  private readonly thresholds = {
    maxGenerationTime: parseInt(
      process.env.MAX_REPORT_GENERATION_TIME_MS || '30000',
    ), // 30 seconds
    minSuccessRate: parseFloat(process.env.MIN_SUCCESS_RATE || '0.95'), // 95%
    minQualityScore: parseFloat(process.env.MIN_QUALITY_SCORE || '4.0'), // 4.0/5.0
    maxRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '30'), // 30 days
  };

  /**
   * Initializes a new instance of the Performance Monitor Service.
   * @param reportRepository - The report repository.
   */
  constructor(private readonly _reportRepository: ReportRepository) {
    // Clean up old metrics every hour
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000);
  }

  /**
   * Performs the start operation operation.
   * @param operationName - The operation name.
   * @param metadata - The metadata.
   * @returns The string value.
   */
  startOperation(
    operationName: string,
    metadata?: PerformanceMetrics['metadata'],
  ): string {
    const operationId = `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metrics: PerformanceMetrics = {
      operationName,
      startTime: Date.now(),
      success: false,
      metadata,
    };

    this.activeMetrics.set(operationId, metrics);

    this.logger.debug(`Started operation: ${operationName} [${operationId}]`);
    return operationId;
  }

  /**
   * Performs the end operation operation.
   * @param operationId - The operation id.
   * @param success - The success.
   * @param errorMessage - The error message.
   * @param additionalMetadata - The additional metadata.
   * @returns The PerformanceMetrics | null.
   */
  endOperation(
    operationId: string,
    success: boolean,
    errorMessage?: string,
    additionalMetadata?: Partial<PerformanceMetrics['metadata']>,
  ): PerformanceMetrics | null {
    const metrics = this.activeMetrics.get(operationId);

    if (!metrics) {
      this.logger.warn(`Operation not found: ${operationId}`);
      return null;
    }

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.success = success;
    metrics.errorMessage = errorMessage;

    if (additionalMetadata) {
      metrics.metadata = { ...metrics.metadata, ...additionalMetadata };
    }

    // Move to history and remove from active
    this.performanceHistory.push(metrics);
    this.activeMetrics.delete(operationId);

    // Log performance alerts
    this.checkPerformanceAlerts(metrics);

    this.logger.debug(
      `Completed operation: ${metrics.operationName} in ${metrics.duration}ms [${operationId}]`,
    );
    return metrics;
  }

  /**
   * Performs the record quality metrics operation.
   * @param qualityMetrics - The quality metrics.
   */
  recordQualityMetrics(qualityMetrics: QualityMetrics): void {
    this.qualityMetrics.push({
      ...qualityMetrics,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Recorded quality metrics for report: ${qualityMetrics.reportId}, score: ${qualityMetrics.qualityScore}`,
    );

    // Check quality alerts
    this.checkQualityAlerts(qualityMetrics);
  }

  /**
   * Retrieves performance summary.
   * @param dateRange - The date range.
   * @returns A promise that resolves to PerformanceSummary.
   */
  async getPerformanceSummary(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<PerformanceSummary> {
    try {
      this.logger.debug('Generating performance summary');

      const startDate =
        dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = dateRange?.endDate || new Date();

      // Filter metrics by date range
      const filteredMetrics = this.performanceHistory.filter(
        (metric) =>
          metric.startTime >= startDate.getTime() &&
          metric.startTime <= endDate.getTime(),
      );

      const filteredQualityMetrics = this.qualityMetrics.filter(
        (metric) =>
          metric.timestamp >= startDate && metric.timestamp <= endDate,
      );

      // Calculate basic statistics
      const totalReports = filteredMetrics.length;
      const successfulReports = filteredMetrics.filter((m) => m.success).length;
      const successRate =
        totalReports > 0 ? successfulReports / totalReports : 0;

      const generationTimes = filteredMetrics
        .filter((m) => m.duration !== undefined)
        .map((m) => m.duration!);

      const averageGenerationTime =
        generationTimes.length > 0
          ? generationTimes.reduce((sum, time) => sum + time, 0) /
            generationTimes.length
          : 0;

      const medianGenerationTime = this.calculateMedian(generationTimes);

      const qualityScores = filteredQualityMetrics.map((m) => m.qualityScore);
      const averageQualityScore =
        qualityScores.length > 0
          ? qualityScores.reduce((sum, score) => sum + score, 0) /
            qualityScores.length
          : 0;

      // Group by report type and format
      const reportsByType: Record<string, number> = {};
      const reportsByFormat: Record<string, number> = {};
      const errorBreakdown: Record<string, number> = {};

      filteredMetrics.forEach((metric) => {
        const reportType = metric.metadata?.reportType || 'unknown';
        const outputFormat = metric.metadata?.outputFormat || 'unknown';

        reportsByType[reportType] = (reportsByType[reportType] || 0) + 1;
        reportsByFormat[outputFormat] =
          (reportsByFormat[outputFormat] || 0) + 1;

        if (!metric.success && metric.errorMessage) {
          const errorType = this.categorizeError(metric.errorMessage);
          errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
        }
      });

      // Generate trends
      const qualityTrends = this.generateQualityTrends(
        filteredQualityMetrics,
        startDate,
        endDate,
      );
      const performanceTrends = this.generatePerformanceTrends(
        filteredMetrics,
        startDate,
        endDate,
      );

      return {
        totalReports,
        successRate,
        averageGenerationTime,
        medianGenerationTime,
        averageQualityScore,
        reportsByType,
        reportsByFormat,
        errorBreakdown,
        qualityTrends,
        performanceTrends,
      };
    } catch (error) {
      this.logger.error('Failed to generate performance summary', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Retrieves system health.
   * @returns The Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; metrics: { activeOperations: number; recentSuccessRate: number; averageResponseTime: number; qualityScore: number; }; alerts: string[]; }>.
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      activeOperations: number;
      recentSuccessRate: number;
      averageResponseTime: number;
      qualityScore: number;
    };
    alerts: string[];
  }> {
    try {
      // Analyze recent performance (last hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentMetrics = this.performanceHistory.filter(
        (metric) => metric.startTime >= oneHourAgo,
      );

      const activeOperations = this.activeMetrics.size;
      const recentSuccessRate =
        recentMetrics.length > 0
          ? recentMetrics.filter((m) => m.success).length / recentMetrics.length
          : 1;

      const recentTimes = recentMetrics
        .filter((m) => m.duration !== undefined)
        .map((m) => m.duration!);

      const averageResponseTime =
        recentTimes.length > 0
          ? recentTimes.reduce((sum, time) => sum + time, 0) /
            recentTimes.length
          : 0;

      const recentQualityMetrics = this.qualityMetrics.filter(
        (metric) => metric.timestamp.getTime() >= oneHourAgo,
      );

      const qualityScore =
        recentQualityMetrics.length > 0
          ? recentQualityMetrics.reduce(
              (sum, metric) => sum + metric.qualityScore,
              0,
            ) / recentQualityMetrics.length
          : 0;

      // Determine system status
      const alerts: string[] = [];
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (recentSuccessRate < this.thresholds.minSuccessRate) {
        alerts.push(
          `Success rate (${(recentSuccessRate * 100).toFixed(1)}%) below threshold`,
        );
        status = recentSuccessRate < 0.8 ? 'unhealthy' : 'degraded';
      }

      if (averageResponseTime > this.thresholds.maxGenerationTime) {
        alerts.push(
          `Average response time (${averageResponseTime}ms) above threshold`,
        );
        status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      }

      if (qualityScore > 0 && qualityScore < this.thresholds.minQualityScore) {
        alerts.push(
          `Quality score (${qualityScore.toFixed(1)}) below threshold`,
        );
        status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      }

      if (activeOperations > 10) {
        alerts.push(`High number of active operations (${activeOperations})`);
      }

      return {
        status,
        metrics: {
          activeOperations,
          recentSuccessRate,
          averageResponseTime,
          qualityScore,
        },
        alerts,
      };
    } catch (error) {
      this.logger.error('Failed to get system health', {
        error: error.message,
      });
      return {
        status: 'unhealthy',
        metrics: {
          activeOperations: 0,
          recentSuccessRate: 0,
          averageResponseTime: 0,
          qualityScore: 0,
        },
        alerts: ['System health check failed'],
      };
    }
  }

  private checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    if (
      metrics.duration &&
      metrics.duration > this.thresholds.maxGenerationTime
    ) {
      this.logger.warn(
        `Slow operation detected: ${metrics.operationName} took ${metrics.duration}ms`,
        {
          operationName: metrics.operationName,
          duration: metrics.duration,
          metadata: metrics.metadata,
        },
      );
    }

    if (!metrics.success) {
      this.logger.error(`Operation failed: ${metrics.operationName}`, {
        operationName: metrics.operationName,
        errorMessage: metrics.errorMessage,
        metadata: metrics.metadata,
      });
    }
  }

  private checkQualityAlerts(qualityMetrics: QualityMetrics): void {
    if (qualityMetrics.qualityScore < this.thresholds.minQualityScore) {
      this.logger.warn(
        `Low quality report detected: ${qualityMetrics.reportId} scored ${qualityMetrics.qualityScore}`,
        {
          reportId: qualityMetrics.reportId,
          qualityScore: qualityMetrics.qualityScore,
          criteriaScores: qualityMetrics.criteriaScores,
        },
      );
    }
  }

  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }

  private categorizeError(errorMessage: string): string {
    if (errorMessage.toLowerCase().includes('timeout')) return 'timeout';
    if (errorMessage.toLowerCase().includes('validation')) return 'validation';
    if (errorMessage.toLowerCase().includes('not found')) return 'not_found';
    if (errorMessage.toLowerCase().includes('permission'))
      return 'authorization';
    if (errorMessage.toLowerCase().includes('network')) return 'network';
    if (
      errorMessage.toLowerCase().includes('llm') ||
      errorMessage.toLowerCase().includes('gemini')
    )
      return 'llm_error';
    if (errorMessage.toLowerCase().includes('database')) return 'database';
    return 'other';
  }

  private generateQualityTrends(
    qualityMetrics: QualityMetrics[],
    _startDate: Date,
    _endDate: Date,
  ): { date: string; averageQuality: number; reportCount: number }[] {
    const dailyData = new Map<string, { scores: number[]; count: number }>();

    qualityMetrics.forEach((metric) => {
      const date = metric.timestamp.toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { scores: [], count: 0 });
      }
      const dayData = dailyData.get(date)!;
      dayData.scores.push(metric.qualityScore);
      dayData.count++;
    });

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        averageQuality:
          data.scores.reduce((sum, score) => sum + score, 0) /
          data.scores.length,
        reportCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private generatePerformanceTrends(
    performanceMetrics: PerformanceMetrics[],
    _startDate: Date,
    _endDate: Date,
  ): {
    date: string;
    averageTime: number;
    successRate: number;
    reportCount: number;
  }[] {
    const dailyData = new Map<
      string,
      { times: number[]; successes: number; total: number }
    >();

    performanceMetrics.forEach((metric) => {
      const date = new Date(metric.startTime).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { times: [], successes: 0, total: 0 });
      }
      const dayData = dailyData.get(date)!;
      if (metric.duration) {
        dayData.times.push(metric.duration);
      }
      if (metric.success) {
        dayData.successes++;
      }
      dayData.total++;
    });

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        averageTime:
          data.times.length > 0
            ? data.times.reduce((sum, time) => sum + time, 0) /
              data.times.length
            : 0,
        successRate: data.total > 0 ? data.successes / data.total : 0,
        reportCount: data.total,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private cleanupOldMetrics(): void {
    const cutoffTime =
      Date.now() - this.thresholds.maxRetentionDays * 24 * 60 * 60 * 1000;

    // Clean performance history
    const beforeCount = this.performanceHistory.length;
    while (
      this.performanceHistory.length > 0 &&
      this.performanceHistory[0].startTime < cutoffTime
    ) {
      this.performanceHistory.shift();
    }

    // Clean quality metrics
    const beforeQualityCount = this.qualityMetrics.length;
    while (
      this.qualityMetrics.length > 0 &&
      this.qualityMetrics[0].timestamp.getTime() < cutoffTime
    ) {
      this.qualityMetrics.shift();
    }

    const removedPerformance = beforeCount - this.performanceHistory.length;
    const removedQuality = beforeQualityCount - this.qualityMetrics.length;

    if (removedPerformance > 0 || removedQuality > 0) {
      this.logger.debug(
        `Cleaned up old metrics: ${removedPerformance} performance, ${removedQuality} quality`,
      );
    }
  }
}
