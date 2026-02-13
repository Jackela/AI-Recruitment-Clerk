import {
  EventStatus,
  ConsentStatus,
  UserSession,
} from './analytics.dto';
import { AnalyticsRules } from './analytics.rules';
import type {
  IAnalyticsRepository,
  IDomainEventBus,
  IAuditLogger,
} from './analytics-interfaces';
import {
  BatchProcessingItem,
  BatchProcessingResult,
  EventProcessingMetricsResult,
  DataPrivacyMetricsResult,
} from './analytics-result-classes';

/**
 * Service for aggregating and processing analytics events.
 * Handles batch processing and metrics calculation.
 */
export class AnalyticsAggregationService {
  constructor(
    private readonly repository: IAnalyticsRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
  ) {}

  /**
   * 批量处理事件
   */
  public async processBatchEvents(eventIds: string[]): Promise<BatchProcessingResult> {
    try {
      // 获取所有事件
      const events = await this.repository.findByIds(eventIds);
      if (events.length === 0) {
        return BatchProcessingResult.failed([
          'No valid events found for processing',
        ]);
      }

      // 验证批量处理资格
      const batchValidation = AnalyticsRules.canBatchProcessEvents(events);
      if (!batchValidation.isEligible) {
        return BatchProcessingResult.failed(batchValidation.errors);
      }

      // 处理每个事件
      const results: BatchProcessingItem[] = [];
      let successCount = 0;

      for (const event of events) {
        if (event.getStatus() !== EventStatus.PENDING_PROCESSING) {
          results.push({
            eventId: event.getId().getValue(),
            success: false,
            error: `Event status is ${event.getStatus()}, expected pending_processing`,
          });
          continue;
        }

        try {
          // 处理事件
          event.processEvent();
          await this.repository.save(event);

          // 发布领域事件
          const domainEvents = event.getUncommittedEvents();
          for (const domainEvent of domainEvents) {
            await this.eventBus.publish(domainEvent);
          }
          event.markEventsAsCommitted();

          results.push({
            eventId: event.getId().getValue(),
            success: true,
            processedAt: new Date(),
          });

          successCount++;
        } catch (processingError) {
          const errorMessage =
            processingError instanceof Error
              ? processingError.message
              : 'Processing error';
          results.push({
            eventId: event.getId().getValue(),
            success: false,
            error: errorMessage,
          });
        }
      }

      await this.auditLogger.logBusinessEvent('BATCH_EVENTS_PROCESSED', {
        totalEvents: eventIds.length,
        successCount,
        failureCount: eventIds.length - successCount,
      });

      return BatchProcessingResult.success({
        totalEvents: eventIds.length,
        successCount,
        failureCount: eventIds.length - successCount,
        results,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('BATCH_PROCESSING_ERROR', {
        eventIds,
        error: errorMessage,
      });
      console.error('Error processing batch events:', error);
      return BatchProcessingResult.failed([
        'Internal error occurred while processing batch events',
      ]);
    }
  }

  /**
   * 获取事件处理性能指标
   */
  public async getEventProcessingMetrics(timeRange: {
    startDate: Date;
    endDate: Date;
  }): Promise<EventProcessingMetricsResult> {
    try {
      const events = await this.repository.findByDateRange(
        timeRange.startDate,
        timeRange.endDate,
      );

      const totalEvents = events.length;
      const processedEvents = events.filter(
        (e) => e.getStatus() === EventStatus.PROCESSED,
      ).length;
      const failedEvents = events.filter(
        (e) => e.getStatus() === EventStatus.ERROR,
      ).length;

      // 计算平均处理时间
      const processedEventsWithTimes = events.filter(
        (e) => e.getStatus() === EventStatus.PROCESSED && e.getCreatedAt(),
      );

      let totalProcessingTime = 0;
      processedEventsWithTimes.forEach((_event) => {
        // 估算处理时间（这里需要根据实际实现调整）
        totalProcessingTime += 100; // 默认100ms处理时间
      });

      const averageProcessingTime =
        processedEventsWithTimes.length > 0
          ? totalProcessingTime / processedEventsWithTimes.length
          : 0;

      // 计算吞吐量
      const timeSpanMs =
        timeRange.endDate.getTime() - timeRange.startDate.getTime();
      const timeSpanSeconds = timeSpanMs / 1000;
      const throughputPerSecond =
        timeSpanSeconds > 0 ? processedEvents / timeSpanSeconds : 0;

      // 计算错误率
      const errorRate =
        totalEvents > 0 ? (failedEvents / totalEvents) * 100 : 0;

      const metrics = {
        totalEvents,
        processedEvents,
        failedEvents,
        averageProcessingTime,
        throughputPerSecond,
        errorRate,
      };

      return EventProcessingMetricsResult.success(metrics);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('PROCESSING_METRICS_ERROR', {
        timeRange,
        error: errorMessage,
      });
      console.error('Error getting event processing metrics:', error);
      return EventProcessingMetricsResult.failed([
        'Internal error occurred while getting processing metrics',
      ]);
    }
  }

  /**
   * 获取数据隐私合规指标
   */
  public async getDataPrivacyMetrics(timeRange: {
    startDate: Date;
    endDate: Date;
  }): Promise<DataPrivacyMetricsResult> {
    try {
      const events = await this.repository.findByDateRange(
        timeRange.startDate,
        timeRange.endDate,
      );

      const totalEvents = events.length;
      const anonymizedEvents = events.filter(
        (e) => e.getStatus() === EventStatus.ANONYMIZED,
      ).length;
      const expiredEvents = events.filter(
        (e) => e.getStatus() === EventStatus.EXPIRED,
      ).length;

      // 计算需要匿名化的事件数量
      const pendingAnonymization = events.filter((event) => {
        const requirement =
          AnalyticsRules.validateAnonymizationRequirement(event);
        return (
          requirement.isRequired && event.getStatus() !== EventStatus.ANONYMIZED
        );
      }).length;

      // 计算合规分数
      const compliantEvents = events.filter((event) => {
        const session = new UserSession({
          sessionId: event.getSessionId(),
          userId: event.getUserId(),
          consentStatus: ConsentStatus.GRANTED,
          isSystemSession: false,
        });
        const riskAssessment = AnalyticsRules.assessPrivacyComplianceRisk(
          event,
          session,
        );
        return riskAssessment.riskLevel === 'LOW';
      }).length;

      const complianceScore =
        totalEvents > 0 ? (compliantEvents / totalEvents) * 100 : 100;

      // 确定整体风险等级
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (complianceScore >= 90) {
        riskLevel = 'LOW';
      } else if (complianceScore >= 75) {
        riskLevel = 'MEDIUM';
      } else if (complianceScore >= 50) {
        riskLevel = 'HIGH';
      } else {
        riskLevel = 'CRITICAL';
      }

      const metrics = {
        totalEvents,
        anonymizedEvents,
        expiredEvents,
        pendingAnonymization,
        complianceScore,
        riskLevel,
      };

      return DataPrivacyMetricsResult.success(metrics);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('PRIVACY_METRICS_ERROR', {
        timeRange,
        error: errorMessage,
      });
      console.error('Error getting data privacy metrics:', error);
      return DataPrivacyMetricsResult.failed([
        'Internal error occurred while getting privacy metrics',
      ]);
    }
  }
}
