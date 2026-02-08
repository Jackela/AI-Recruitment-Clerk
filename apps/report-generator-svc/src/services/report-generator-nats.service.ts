import type { ConfigService } from '@nestjs/config';
import type { NatsConnectionManager } from '@ai-recruitment-clerk/shared-nats-client';
import type { NatsStreamManager } from '@ai-recruitment-clerk/shared-nats-client';
import type { NatsPublishResult } from '@ai-recruitment-clerk/shared-nats-client';
import { BaseMicroserviceService } from '@ai-recruitment-clerk/service-base';
import { Injectable } from '@nestjs/common';
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
 *
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 2.0.0 - Refactored to extend BaseMicroserviceService
 */
@Injectable()
export class ReportGeneratorNatsService extends BaseMicroserviceService {
  constructor(
    configService: ConfigService,
    connectionManager: NatsConnectionManager,
    streamManager: NatsStreamManager,
  ) {
    super(configService, connectionManager, streamManager, 'report-generator-svc');
  }

  /**
   * Publish report generated event
   */
  public async publishReportGenerated(
    event: ReportGeneratedEvent,
  ): Promise<NatsPublishResult> {
    return this.publishEvent('report.generated', event as unknown as Record<string, unknown>, {
      messageId: this.generateMessageId('report-generated', event.reportId),
      headers: {
        'report-id': event.reportId,
        'job-id': event.jobId,
        'resume-id': event.resumeId,
        'report-type': event.reportType,
      },
    });
  }

  /**
   * Publish report generation failed event
   */
  public async publishReportGenerationFailed(
    event: ReportGenerationFailedEvent,
  ): Promise<NatsPublishResult> {
    return this.publishEvent('report.generation.failed', event as unknown as Record<string, unknown>, {
      messageId: this.generateMessageId('report-failed', `${event.jobId}-${event.resumeId}`),
      headers: {
        'job-id': event.jobId,
        'resume-id': event.resumeId,
        'report-type': event.reportType,
      },
    });
  }

  /**
   * Subscribe to match.scored events from scoring-engine-svc
   */
  public async subscribeToMatchScored(
    handler: (event: MatchScoredEvent) => Promise<void>,
  ): Promise<void> {
    return this.subscribeToEvents(
      'analysis.match.scored',
      handler,
      {
        durableName: 'report-generator-match-scored',
        queueGroup: 'report-generator',
      },
    );
  }

  /**
   * Subscribe to report generation requests
   */
  public async subscribeToReportGenerationRequested(
    handler: (event: ReportGenerationRequestedEvent) => Promise<void>,
  ): Promise<void> {
    return this.subscribeToEvents(
      'report.generation.requested',
      handler,
      {
        durableName: 'report-generator-generation-requested',
        queueGroup: 'report-generator',
      },
    );
  }

  /**
   * Health check for report generator specific NATS functionality
   */
  public async healthCheck(): Promise<{
    status: string;
    details: HealthCheckDetails;
  }> {
    try {
      const baseHealth = await this.getHealthStatus();

      return {
        status: 'healthy',
        details: {
          connected: baseHealth.connected,
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
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
