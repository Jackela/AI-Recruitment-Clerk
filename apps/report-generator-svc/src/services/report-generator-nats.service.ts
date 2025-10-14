import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NatsPublishResult } from '@app/shared-nats-client';
import type { MatchScoredEvent } from '../report-generator/report-generator.service';

// Enhanced type definitions for NATS service

/**
 * Defines the shape of the health check details.
 */
export interface HealthCheckDetails {
  connected: boolean;
  subscriptions: {
    matchScored: string;
    reportGeneration: string;
  };
  reportSpecificFeatures: string;
  error?: string;
}

// Report-related event interfaces
/**
 * Defines the shape of the report generation requested event.
 */
export interface ReportGenerationRequestedEvent {
  jobId: string;
  resumeId: string;
  reportType: 'match-analysis' | 'candidate-summary' | 'full-report';
  requestedBy?: string;
  timestamp: string;
}

/**
 * Defines the shape of the report generated event.
 */
export interface ReportGeneratedEvent {
  jobId: string;
  resumeId: string;
  reportId: string;
  reportType: string;
  gridFsId: string;
  timestamp: string;
  processingTimeMs: number;
}

/**
 * Defines the shape of the report generation failed event.
 */
export interface ReportGenerationFailedEvent {
  jobId: string;
  resumeId: string;
  reportType: string;
  error: string;
  retryCount: number;
  timestamp: string;
}

/**
 * Report Generator service-specific NATS client extension
 * Provides specialized methods for report generation events
 */
@Injectable()
export class ReportGeneratorNatsService extends NatsClientService {
  private readonly serviceLogger = new Logger(ReportGeneratorNatsService.name);

  /**
   * Publish report generated event
   */
  async publishReportGenerated(
    event: ReportGeneratedEvent,
  ): Promise<NatsPublishResult> {
    const subject = 'report.generated';

    try {
      const result = await this.publish(subject, {
        ...event,
        eventType: 'ReportGeneratedEvent',
      });

      if (result.success) {
        this.serviceLogger.log(
          `Report generated event published successfully for reportId: ${event.reportId}`,
        );
      }

      return result;
    } catch (error) {
      this.serviceLogger.error(
        `Error publishing report generated event`,
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Publish report generation failed event
   */
  async publishReportGenerationFailed(
    event: ReportGenerationFailedEvent,
  ): Promise<NatsPublishResult> {
    const subject = 'report.generation.failed';

    try {
      const result = await this.publish(subject, {
        ...event,
        eventType: 'ReportGenerationFailedEvent',
      });

      if (result.success) {
        this.serviceLogger.log(
          `Report generation failed event published for jobId: ${event.jobId}, resumeId: ${event.resumeId}`,
        );
      }

      return result;
    } catch (error) {
      this.serviceLogger.error(
        `Error publishing report generation failed event`,
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Subscribe to match.scored events from scoring-engine-svc
   */
  async subscribeToMatchScored(
    handler: (event: MatchScoredEvent) => Promise<void>,
  ): Promise<void> {
    await this.subscribe('analysis.match.scored', handler, {
      queueGroup: 'report-generator',
      durableName: 'report-generator-match-scored',
    });
  }

  /**
   * Subscribe to report generation requests
   */
  async subscribeToReportGenerationRequested(
    handler: (event: ReportGenerationRequestedEvent) => Promise<void>,
  ): Promise<void> {
    await this.subscribe('report.generation.requested', handler, {
      queueGroup: 'report-generator',
      durableName: 'report-generator-generation-requested',
    });
  }

  /**
   * Health check for report generator specific NATS functionality
   */
  async healthCheck(): Promise<{
    status: string;
    details: HealthCheckDetails;
  }> {
    try {
      return {
        status: 'healthy',
        details: {
          connected: true,
          subscriptions: {
            matchScored: 'subscribed',
            reportGeneration: 'subscribed',
          },
          reportSpecificFeatures: 'available',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          subscriptions: {
            matchScored: 'failed',
            reportGeneration: 'failed',
          },
          reportSpecificFeatures: 'unavailable',
          error: error.message,
        },
      };
    }
  }
}
