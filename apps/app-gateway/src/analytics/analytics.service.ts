import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AnalyticsEventDto,
  BusinessMetricDto,
  PerformanceMetricDto,
} from './analytics.dto';

interface ClientLogDto {
  level: string;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

interface StoredMetric {
  id: string;
  metricName: string;
  value: number;
  timestamp: Date;
}

@Injectable()
export class AnalyticsService {
  private events: AnalyticsEventDto[] = [];
  private performanceMetrics: StoredMetric[] = [];
  private businessMetrics: StoredMetric[] = [];
  private clientLogs: ClientLogDto[] = [];

  public recordEvent(event: AnalyticsEventDto): void {
    this.events.push(event);
    this.trim();
  }

  public recordPerformanceMetric(metric: PerformanceMetricDto): string {
    const metricId = this.createId('met');
    this.performanceMetrics.push({
      id: metricId,
      metricName: metric.metricName,
      value: metric.value,
      timestamp: new Date(),
    });
    this.trim();
    return metricId;
  }

  public recordBusinessMetric(metric: BusinessMetricDto): string {
    const metricId = this.createId('met');
    this.businessMetrics.push({
      id: metricId,
      metricName: metric.metricName,
      value: metric.value,
      timestamp: new Date(),
    });
    this.trim();
    return metricId;
  }

  public recordClientLog(entry: ClientLogDto): void {
    this.clientLogs.push(entry);
    this.trim();
  }

  public createReportId(): string {
    return this.createId('rep');
  }

  public createExportId(): string {
    return this.createId('exp');
  }

  public getDashboard(): {
    summary: { events: number; metrics: number; clientLogs: number };
    charts: Array<{ id: string; title: string; data: unknown[] }>;
  } {
    return {
      summary: {
        events: this.events.length,
        metrics: this.performanceMetrics.length + this.businessMetrics.length,
        clientLogs: this.clientLogs.length,
      },
      charts: [
        {
          id: 'metric-volume',
          title: 'Metric Volume',
          data: [
            {
              label: 'performance',
              value: this.performanceMetrics.length,
            },
            {
              label: 'business',
              value: this.businessMetrics.length,
            },
          ],
        },
      ],
    };
  }

  public getAnalysisStatistics(): {
    todayAnalyses: number;
    totalAnalyses: number;
    averageScore: number;
    successRate: number;
    monthlyAnalyses: number;
  } {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const monthKey = now.toISOString().slice(0, 7);
    const analysisMetrics = this.businessMetrics.filter((metric) =>
      metric.metricName.startsWith('analysis.'),
    );
    const scoreMetrics = this.businessMetrics.filter(
      (metric) => metric.metricName === 'analysis.score',
    );
    const completed = this.businessMetrics.filter(
      (metric) => metric.metricName === 'analysis.completed',
    );
    const failed = this.businessMetrics.filter(
      (metric) => metric.metricName === 'analysis.failed',
    );
    const todayAnalyses = completed.filter(
      (metric) => metric.timestamp.toISOString().slice(0, 10) === todayKey,
    ).length;
    const monthlyAnalyses = completed.filter(
      (metric) => metric.timestamp.toISOString().slice(0, 7) === monthKey,
    ).length;
    const totalCompleted = completed.length;
    const totalFailed = failed.length;
    const averageScore =
      scoreMetrics.length > 0
        ? Math.round(
            scoreMetrics.reduce((sum, metric) => sum + metric.value, 0) /
              scoreMetrics.length,
          )
        : 0;
    const successRate =
      totalCompleted + totalFailed > 0
        ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 1000) /
          10
        : 0;

    return {
      todayAnalyses,
      totalAnalyses: Math.max(totalCompleted, analysisMetrics.length),
      averageScore,
      successRate,
      monthlyAnalyses,
    };
  }

  private createId(prefix: string): string {
    return `${prefix}-${randomUUID()}`;
  }

  private trim(): void {
    this.events = this.events.slice(-1000);
    this.performanceMetrics = this.performanceMetrics.slice(-1000);
    this.businessMetrics = this.businessMetrics.slice(-1000);
    this.clientLogs = this.clientLogs.slice(-1000);
  }
}
