import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NatsPublishResult } from '@app/shared-nats-client';

// Report-related event interfaces
export interface ReportGenerationRequestedEvent {
  jobId: string;
  resumeId: string;
  reportType: 'match-analysis' | 'candidate-summary' | 'full-report';
  requestedBy?: string;
  timestamp: string;
}

export interface ReportGeneratedEvent {
  jobId: string;
  resumeId: string;
  reportId: string;
  reportType: string;
  gridFsId: string;
  timestamp: string;
  processingTimeMs: number;
}

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
  private readonly logger = new Logger(ReportGeneratorNatsService.name);

  /**
   * Publish report generated event
   */
  async publishReportGenerated(event: ReportGeneratedEvent): Promise<NatsPublishResult> {
    const subject = 'report.generated';
    
    try {
      const result = await this.publish(subject, {
        ...event,
        eventType: 'ReportGeneratedEvent',
      });
      
      if (result.success) {
        this.logger.log(`Report generated event published successfully for reportId: ${event.reportId}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error publishing report generated event`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Publish report generation failed event
   */
  async publishReportGenerationFailed(event: ReportGenerationFailedEvent): Promise<NatsPublishResult> {
    const subject = 'report.generation.failed';
    
    try {
      const result = await this.publish(subject, {
        ...event,
        eventType: 'ReportGenerationFailedEvent',
      });
      
      if (result.success) {
        this.logger.log(`Report generation failed event published for jobId: ${event.jobId}, resumeId: ${event.resumeId}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error publishing report generation failed event`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Subscribe to match.scored events from scoring-engine-svc
   */
  async subscribeToMatchScored(handler: (event: any) => Promise<void>): Promise<void> {
    await this.subscribe(
      'analysis.match.scored',
      handler,
      { 
        queueGroup: 'report-generator',
        durableName: 'report-generator-match-scored'
      }
    );
  }

  /**
   * Subscribe to report generation requests
   */
  async subscribeToReportGenerationRequested(handler: (event: ReportGenerationRequestedEvent) => Promise<void>): Promise<void> {
    await this.subscribe(
      'report.generation.requested',
      handler,
      { 
        queueGroup: 'report-generator',
        durableName: 'report-generator-generation-requested'
      }
    );
  }

  /**
   * Health check for report generator specific NATS functionality
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const baseHealth = await super.healthCheck();
      
      return {
        status: baseHealth.connected ? 'healthy' : 'degraded',
        details: {
          ...baseHealth,
          subscriptions: {
            matchScored: 'subscribed',
            reportGeneration: 'subscribed',
          },
          reportSpecificFeatures: 'available'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message
        }
      };
    }
  }
}