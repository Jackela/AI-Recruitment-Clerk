import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { GridFsService } from '../gridfs/gridfs.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { ParsingService } from '../parsing/parsing.service';

@Injectable()
export class AppService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(AppService.name);
  private isInitialized = false;

  constructor(
    private readonly gridFsService: GridFsService,
    private readonly natsService: ResumeParserNatsService,
    private readonly parsingService: ParsingService,
  ) {}

  getData(): { message: string } {
    return { 
      message: 'Resume Parser Service API',
      status: this.isInitialized ? 'ready' : 'initializing'
    };
  }

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Resume Parser Service starting...');
    
    try {
      // Initialize GridFS connections (already handled by GridFsService.onModuleInit)
      this.logger.log('GridFS service initialized');
      
      // Initialize NATS subscriptions (already handled by NatsClient.onModuleInit)
      this.logger.log('NATS client initialized');
      
      // Set up event subscriptions for resume processing
      await this.setupEventSubscriptions();
      
      // Initialize parsing service
      await this.initializeParsingService();
      
      this.isInitialized = true;
      this.logger.log('Resume Parser Service startup completed successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize Resume Parser Service:', error);
      throw error;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Resume Parser Service shutting down...');
    
    try {
      // Clean up event subscriptions
      await this.cleanupEventSubscriptions();
      
      // GridFS and NATS cleanup handled by their respective onModuleDestroy
      this.logger.log('All connections cleaned up successfully');
      
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }

  private async setupEventSubscriptions(): Promise<void> {
    try {
      // Subscribe to resume processing events through shared NATS service
      await this.natsService.subscribe('resume.parse.request', async (data) => {
        await this.parsingService.handleParseRequest(data);
      });

      await this.natsService.subscribe('resume.retry.request', async (data) => {
        await this.parsingService.handleRetryRequest(data);
      });

      this.logger.log('Event subscriptions set up successfully');
    } catch (error) {
      this.logger.error('Failed to setup event subscriptions:', error);
      throw error;
    }
  }

  private async cleanupEventSubscriptions(): Promise<void> {
    try {
      // Unsubscribe from all subjects
      // Note: NATS client handles cleanup in onModuleDestroy
      this.logger.log('Event subscriptions cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup event subscriptions:', error);
    }
  }

  private async initializeParsingService(): Promise<void> {
    try {
      // Initialize any parsing service dependencies
      // Add health check or validation if needed
      this.logger.log('Parsing service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize parsing service:', error);
      throw error;
    }
  }
}
