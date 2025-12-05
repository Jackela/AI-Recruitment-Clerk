import { Injectable, Logger } from '@nestjs/common';

enum MetricUnit {
  COUNT = 'count',
  PERCENTAGE = 'percentage',
  MILLISECONDS = 'milliseconds',
}

/**
 * Fallback domain service for metrics.
 */
class MetricsDomainService {
  async createBusinessMetricEvent(
    _metricName: string,
    _value: number,
    _unit: any,
    _metadata?: any,
  ): Promise<any> {
    return {
      success: true,
      data: {
        id: `metric_${Date.now()}`,
        status: 'PROCESSED',
        props: { timestamp: new Date() },
      },
    };
  }

  async createSystemPerformanceEvent(
    _operation: string,
    _duration: number,
    _success: boolean,
    _metadata?: any,
  ): Promise<any> {
    return { success: true, data: { id: `perf_${Date.now()}`, status: 'PROCESSED' } };
  }
}

/**
 * Service for metrics collection operations.
 * Extracted from AnalyticsIntegrationService to follow SRP.
 */
@Injectable()
export class MetricsCollectionService {
  private readonly logger = new Logger(MetricsCollectionService.name);
  private readonly domainService: MetricsDomainService;

  constructor() {
    this.domainService = new MetricsDomainService();
  }

  /**
   * Record a metric with full configuration.
   */
  async recordMetric(metricData: {
    metricName: string;
    value: number;
    unit: string;
    organizationId: string;
    recordedBy: string;
    timestamp: Date;
    category: string;
    operation?: string;
    service?: string;
    status?: 'success' | 'error' | 'timeout';
    duration?: number;
    dimensions?: Record<string, any>;
    tags?: string[];
    metadata?: any;
  }) {
    try {
      const result = await this.domainService.createBusinessMetricEvent(
        metricData.metricName,
        metricData.value,
        metricData.unit as any,
        {
          operation: metricData.operation,
          service: metricData.service,
          status: metricData.status,
          duration: metricData.duration,
          organizationId: metricData.organizationId,
          recordedBy: metricData.recordedBy,
          category: metricData.category,
          timestamp: metricData.timestamp,
          dimensions: metricData.dimensions,
          tags: metricData.tags,
          ...metricData.metadata,
        },
      );

      if (result.success && result.data) {
        return {
          metricId: result.data.id,
          metricName: metricData.metricName,
          value: metricData.value,
          unit: metricData.unit,
          category: metricData.category,
          timestamp: (result.data as any).props.timestamp,
          status: result.data.status,
        };
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to record metric');
      }
    } catch (error) {
      this.logger.error('Error recording metric', error);
      throw error;
    }
  }

  /**
   * Track system performance.
   */
  async trackSystemPerformance(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any,
  ) {
    try {
      return await this.domainService.createSystemPerformanceEvent(
        operation,
        duration,
        success,
        metadata,
      );
    } catch (error) {
      this.logger.error('Error tracking system performance', error);
      throw error;
    }
  }

  /**
   * Record business metric with simplified interface.
   */
  async recordBusinessMetric(
    metricName: string,
    metricValue: number,
    metricUnit: MetricUnit,
    dimensions?: Record<string, string>,
  ) {
    try {
      return await this.domainService.createBusinessMetricEvent(
        metricName,
        metricValue,
        metricUnit,
        dimensions,
      );
    } catch (error) {
      this.logger.error('Error recording business metric', error);
      throw error;
    }
  }
}
