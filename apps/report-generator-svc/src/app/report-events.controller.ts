import {
  Controller,
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  ReportGeneratorService,
  MatchScoredEvent,
} from '../report-generator/report-generator.service';
import {
  ReportGeneratorNatsService,
  ReportGenerationRequestedEvent,
  ReportGeneratedEvent,
  ReportGenerationFailedEvent,
} from '../services/report-generator-nats.service';

// Enhanced type definition for health check details
/**
 * Defines the shape of the health check details.
 */
export interface HealthCheckDetails {
  natsConnected: boolean;
  processingReportsCount: number;
  processingReports: string[];
  natsDetails: {
    connected: boolean;
    subscriptions?: Record<string, string>;
    reportSpecificFeatures?: string;
    error?: string;
  };
  error?: string;
}

/**
 * Exposes endpoints for report events.
 */
@Controller()
@Injectable()
export class ReportEventsController implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReportEventsController.name);
  private readonly processingReports = new Set<string>();

  /**
   * Initializes a new instance of the Report Events Controller.
   * @param natsService - The nats service.
   * @param reportGeneratorService - The report generator service.
   */
  constructor(
    private readonly natsService: ReportGeneratorNatsService,
    private readonly reportGeneratorService: ReportGeneratorService,
  ) {}

  /**
   * Performs the on module init operation.
   * @returns A promise that resolves when the operation completes.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing Report Events Controller...');

      // Subscribe to relevant events using shared NATS service
      await this.subscribeToEvents();

      this.logger.log('Report Events Controller initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Report Events Controller', error);
      throw error;
    }
  }

  /**
   * Performs the on module destroy operation.
   * @returns A promise that resolves when the operation completes.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Shutting down Report Events Controller...');
      // Shared NATS service handles disconnection automatically
      this.logger.log('Report Events Controller shut down successfully');
    } catch (error) {
      this.logger.error(
        'Error during Report Events Controller shutdown',
        error,
      );
    }
  }

  private async subscribeToEvents(): Promise<void> {
    // Subscribe to match.scored events using shared NATS service
    await this.natsService.subscribeToMatchScored(
      this.handleMatchScored.bind(this),
    );

    // Subscribe to report generation requests using shared NATS service
    await this.natsService.subscribeToReportGenerationRequested(
      this.handleReportGenerationRequested.bind(this),
    );

    this.logger.log(
      'Successfully subscribed to all report events using shared NATS service',
    );
  }

  /**
   * Handles match scored.
   * @param event - The event.
   * @returns A promise that resolves when the operation completes.
   */
  async handleMatchScored(event: MatchScoredEvent): Promise<void> {
    const { jobId, resumeId } = event;
    const reportKey = `${jobId}_${resumeId}`;

    try {
      this.logger.log(
        `Received match.scored event for jobId: ${jobId}, resumeId: ${resumeId}`,
      );

      // Check if we're already processing this report
      if (this.processingReports.has(reportKey)) {
        this.logger.warn(
          `Report ${reportKey} is already being processed, skipping duplicate event`,
        );
        return;
      }

      this.processingReports.add(reportKey);

      // Validate event data
      if (!jobId || !resumeId || !event.scoreDto) {
        throw new Error(
          `Invalid match scored event: jobId=${jobId}, resumeId=${resumeId}`,
        );
      }

      const startTime = Date.now();

      // Generate report using the report generator service
      await this.reportGeneratorService.handleMatchScored(event);

      const processingTimeMs = Date.now() - startTime;

      // Publish success event
      const reportGeneratedEvent: ReportGeneratedEvent = {
        jobId,
        resumeId,
        reportId: this.generateReportId(jobId, resumeId),
        reportType: 'match-analysis',
        gridFsId: 'placeholder-gridfs-id', // Would be returned from the service
        timestamp: new Date().toISOString(),
        processingTimeMs,
      };

      await this.natsService.publishReportGenerated(reportGeneratedEvent);

      this.logger.log(
        `Successfully processed match.scored event and generated report for ${reportKey}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing match.scored event for ${reportKey}`,
        error,
      );
      await this.handleReportGenerationError(
        error,
        jobId,
        resumeId,
        'match-analysis',
      );
    } finally {
      this.processingReports.delete(reportKey);
    }
  }

  /**
   * Handles report generation requested.
   * @param event - The event.
   * @returns A promise that resolves when the operation completes.
   */
  async handleReportGenerationRequested(
    event: ReportGenerationRequestedEvent,
  ): Promise<void> {
    const { jobId, resumeId, reportType } = event;
    const reportKey = `${jobId}_${resumeId}_${reportType}`;

    try {
      this.logger.log(
        `Received report generation request for jobId: ${jobId}, resumeId: ${resumeId}, type: ${reportType}`,
      );

      // Check if we're already processing this report
      if (this.processingReports.has(reportKey)) {
        this.logger.warn(
          `Report ${reportKey} is already being processed, skipping duplicate request`,
        );
        return;
      }

      this.processingReports.add(reportKey);

      // Validate request
      if (!jobId || !resumeId || !reportType) {
        throw new Error(
          `Invalid report generation request: jobId=${jobId}, resumeId=${resumeId}, type=${reportType}`,
        );
      }

      const startTime = Date.now();

      // Generate report based on type
      let reportId: string;
      switch (reportType) {
        case 'match-analysis':
          reportId = await this.generateMatchAnalysisReport(jobId, resumeId);
          break;
        case 'candidate-summary':
          reportId = await this.generateCandidateSummaryReport(jobId, resumeId);
          break;
        case 'full-report':
          reportId = await this.generateFullReport(jobId, resumeId);
          break;
        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      const processingTimeMs = Date.now() - startTime;

      // Publish success event
      const reportGeneratedEvent: ReportGeneratedEvent = {
        jobId,
        resumeId,
        reportId,
        reportType,
        gridFsId: 'placeholder-gridfs-id', // Would be actual GridFS ID
        timestamp: new Date().toISOString(),
        processingTimeMs,
      };

      await this.natsService.publishReportGenerated(reportGeneratedEvent);

      this.logger.log(
        `Successfully generated ${reportType} report for ${jobId}_${resumeId}`,
      );
    } catch (error) {
      this.logger.error(`Error generating report for ${reportKey}`, error);
      await this.handleReportGenerationError(
        error,
        jobId,
        resumeId,
        reportType,
      );
    } finally {
      this.processingReports.delete(reportKey);
    }
  }

  private async handleReportGenerationError(
    error: Error,
    jobId: string,
    resumeId: string,
    reportType: string,
  ): Promise<void> {
    try {
      const failedEvent: ReportGenerationFailedEvent = {
        jobId,
        resumeId,
        reportType,
        error: error.message,
        retryCount: 0,
        timestamp: new Date().toISOString(),
      };

      await this.natsService.publishReportGenerationFailed(failedEvent);
    } catch (publishError) {
      this.logger.error(
        `Failed to publish report generation failed event`,
        publishError,
      );
    }
  }

  private async generateMatchAnalysisReport(
    jobId: string,
    resumeId: string,
  ): Promise<string> {
    // Mock implementation - would call actual report generation logic
    this.logger.log(
      `Generating match analysis report for jobId: ${jobId}, resumeId: ${resumeId}`,
    );

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    return this.generateReportId(jobId, resumeId);
  }

  private async generateCandidateSummaryReport(
    jobId: string,
    resumeId: string,
  ): Promise<string> {
    // Mock implementation - would call actual report generation logic
    this.logger.log(
      `Generating candidate summary report for jobId: ${jobId}, resumeId: ${resumeId}`,
    );

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 150));

    return this.generateReportId(jobId, resumeId);
  }

  private async generateFullReport(
    jobId: string,
    resumeId: string,
  ): Promise<string> {
    // Mock implementation - would call actual report generation logic
    this.logger.log(
      `Generating full report for jobId: ${jobId}, resumeId: ${resumeId}`,
    );

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 200));

    return this.generateReportId(jobId, resumeId);
  }

  private generateReportId(jobId: string, resumeId: string): string {
    return `report_${jobId}_${resumeId}_${Date.now()}`;
  }

  // Health check endpoint
  /**
   * Performs the health check operation.
   * @returns A promise that resolves to { status: string; details: HealthCheckDetails }.
   */
  async healthCheck(): Promise<{
    status: string;
    details: HealthCheckDetails;
  }> {
    try {
      const healthCheck = await this.natsService.healthCheck();
      const natsConnected = healthCheck.status === 'healthy';
      const processingReportsCount = this.processingReports.size;

      return {
        status: natsConnected ? 'healthy' : 'degraded',
        details: {
          natsConnected,
          processingReportsCount,
          processingReports: Array.from(this.processingReports),
          natsDetails: healthCheck.details,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          natsConnected: false,
          processingReportsCount: this.processingReports.size,
          processingReports: Array.from(this.processingReports),
          natsDetails: {
            connected: false,
            error: error instanceof Error ? error.message : String(error),
          },
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
