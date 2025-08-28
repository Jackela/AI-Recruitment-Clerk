import { Controller, Injectable, Logger } from '@nestjs/common';
import { ReportGeneratorService, MatchScoredEvent } from '../report-generator/report-generator.service';

// NATS-related interfaces and types
export interface NatsPublishResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NatsSubscriptionOptions {
  subject?: string;
  queueGroup?: string;
  durableName?: string;
}

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

@Injectable()
export class NatsClient {
  private readonly logger = new Logger(NatsClient.name);
  private connected = false;
  private connection: any = null;

  async connect(): Promise<void> {
    try {
      this.logger.log('Connecting to NATS JetStream...');
      
      // Mock connection - in production would use actual NATS client
      this.connected = true;
      this.logger.log('Successfully connected to NATS JetStream');
    } catch (error) {
      this.logger.error('Failed to connect to NATS', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.logger.log('Disconnecting from NATS...');
      this.connected = false;
      this.logger.log('Disconnected from NATS');
    } catch (error) {
      this.logger.error('Error during NATS disconnect', error);
      throw error;
    }
  }

  async publish(subject: string, data: any): Promise<NatsPublishResult> {
    try {
      this.logger.log(`Publishing message to subject: ${subject}`);
      
      if (!this.connected) {
        await this.connect();
      }
      
      const messageId = this.generateMessageId();
      this.logger.log(`Message published successfully. MessageId: ${messageId}`);
      
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to publish message to ${subject}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async subscribe(
    subject: string, 
    handler: (event: any) => Promise<void>,
    options?: NatsSubscriptionOptions
  ): Promise<void> {
    try {
      this.logger.log(`Subscribing to subject: ${subject}`);
      
      if (!this.connected) {
        await this.connect();
      }
      
      this.logger.log(`Successfully subscribed to ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${subject}`, error);
      throw error;
    }
  }

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

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  get isConnected(): boolean {
    return this.connected;
  }
}

@Controller()
@Injectable()
export class ReportEventsController {
  private readonly logger = new Logger(ReportEventsController.name);
  private readonly natsClient = new NatsClient();
  private readonly processingReports = new Set<string>();

  constructor(
    private readonly reportGeneratorService: ReportGeneratorService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing Report Events Controller...');
      
      // Connect to NATS
      await this.natsClient.connect();
      
      // Subscribe to relevant events
      await this.subscribeToEvents();
      
      this.logger.log('Report Events Controller initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Report Events Controller', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Shutting down Report Events Controller...');
      await this.natsClient.disconnect();
      this.logger.log('Report Events Controller shut down successfully');
    } catch (error) {
      this.logger.error('Error during Report Events Controller shutdown', error);
    }
  }

  private async subscribeToEvents(): Promise<void> {
    // Subscribe to match.scored events (from scoring-engine-svc)
    await this.natsClient.subscribe(
      'match.scored',
      this.handleMatchScored.bind(this),
      { queueGroup: 'report-generator' }
    );

    // Subscribe to report generation requests
    await this.natsClient.subscribe(
      'report.generation.requested',
      this.handleReportGenerationRequested.bind(this),
      { queueGroup: 'report-generator' }
    );

    this.logger.log('Successfully subscribed to all report events');
  }

  async handleMatchScored(event: MatchScoredEvent): Promise<void> {
    const { jobId, resumeId } = event;
    const reportKey = `${jobId}_${resumeId}`;
    
    try {
      this.logger.log(`Received match.scored event for jobId: ${jobId}, resumeId: ${resumeId}`);

      // Check if we're already processing this report
      if (this.processingReports.has(reportKey)) {
        this.logger.warn(`Report ${reportKey} is already being processed, skipping duplicate event`);
        return;
      }

      this.processingReports.add(reportKey);

      // Validate event data
      if (!jobId || !resumeId || !event.scoreDto) {
        throw new Error(`Invalid match scored event: jobId=${jobId}, resumeId=${resumeId}`);
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

      await this.natsClient.publishReportGenerated(reportGeneratedEvent);

      this.logger.log(`Successfully processed match.scored event and generated report for ${reportKey}`);
      
    } catch (error) {
      this.logger.error(`Error processing match.scored event for ${reportKey}`, error);
      await this.handleReportGenerationError(error, jobId, resumeId, 'match-analysis');
    } finally {
      this.processingReports.delete(reportKey);
    }
  }

  async handleReportGenerationRequested(event: ReportGenerationRequestedEvent): Promise<void> {
    const { jobId, resumeId, reportType } = event;
    const reportKey = `${jobId}_${resumeId}_${reportType}`;
    
    try {
      this.logger.log(`Received report generation request for jobId: ${jobId}, resumeId: ${resumeId}, type: ${reportType}`);

      // Check if we're already processing this report
      if (this.processingReports.has(reportKey)) {
        this.logger.warn(`Report ${reportKey} is already being processed, skipping duplicate request`);
        return;
      }

      this.processingReports.add(reportKey);

      // Validate request
      if (!jobId || !resumeId || !reportType) {
        throw new Error(`Invalid report generation request: jobId=${jobId}, resumeId=${resumeId}, type=${reportType}`);
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

      await this.natsClient.publishReportGenerated(reportGeneratedEvent);

      this.logger.log(`Successfully generated ${reportType} report for ${jobId}_${resumeId}`);
      
    } catch (error) {
      this.logger.error(`Error generating report for ${reportKey}`, error);
      await this.handleReportGenerationError(error, jobId, resumeId, reportType);
    } finally {
      this.processingReports.delete(reportKey);
    }
  }

  private async handleReportGenerationError(
    error: Error, 
    jobId: string, 
    resumeId: string, 
    reportType: string
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

      await this.natsClient.publishReportGenerationFailed(failedEvent);
      
    } catch (publishError) {
      this.logger.error(`Failed to publish report generation failed event`, publishError);
    }
  }

  private async generateMatchAnalysisReport(jobId: string, resumeId: string): Promise<string> {
    // Mock implementation - would call actual report generation logic
    this.logger.log(`Generating match analysis report for jobId: ${jobId}, resumeId: ${resumeId}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return this.generateReportId(jobId, resumeId);
  }

  private async generateCandidateSummaryReport(jobId: string, resumeId: string): Promise<string> {
    // Mock implementation - would call actual report generation logic
    this.logger.log(`Generating candidate summary report for jobId: ${jobId}, resumeId: ${resumeId}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return this.generateReportId(jobId, resumeId);
  }

  private async generateFullReport(jobId: string, resumeId: string): Promise<string> {
    // Mock implementation - would call actual report generation logic
    this.logger.log(`Generating full report for jobId: ${jobId}, resumeId: ${resumeId}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.generateReportId(jobId, resumeId);
  }

  private generateReportId(jobId: string, resumeId: string): string {
    return `report_${jobId}_${resumeId}_${Date.now()}`;
  }

  // Health check endpoint
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const natsConnected = this.natsClient.isConnected;
      const processingReportsCount = this.processingReports.size;
      
      return {
        status: natsConnected ? 'healthy' : 'degraded',
        details: {
          natsConnected,
          processingReportsCount,
          processingReports: Array.from(this.processingReports),
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