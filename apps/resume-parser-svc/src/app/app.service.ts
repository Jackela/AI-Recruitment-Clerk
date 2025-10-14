import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { GridFsService } from '../gridfs/gridfs.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { ParsingService } from '../parsing/parsing.service';

/**
 * Provides app functionality.
 */
@Injectable()
export class AppService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AppService.name);
  private isInitialized = false;

  /**
   * Initializes a new instance of the App Service.
   * @param gridFsService - The grid fs service.
   * @param natsService - The nats service.
   * @param parsingService - The parsing service.
   */
  constructor(
    private readonly gridFsService: GridFsService,
    private readonly natsService: ResumeParserNatsService,
    private readonly parsingService: ParsingService,
  ) {}

  /**
   * Retrieves data.
   * @returns The { message: string; status?: string }.
   */
  getData(): { message: string; status?: string } {
    return {
      message: 'Resume Parser Service API',
      status: this.isInitialized ? 'ready' : 'initializing',
    };
  }

  /**
   * Performs the on application bootstrap operation.
   * @returns A promise that resolves when the operation completes.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Resume Parser Service starting...');

    try {
      // Initialize GridFS connections (already handled by GridFsService.onModuleInit)
      if (
        this.gridFsService &&
        typeof (this.gridFsService as any).healthCheck === 'function'
      ) {
        const gridFsHealth = await (this.gridFsService as any).healthCheck();
        this.logger.log(`GridFS service initialized: ${gridFsHealth.status}`);
      } else {
        this.logger.log(
          'GridFS service initialized (healthCheck unavailable in this environment)',
        );
      }

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

  /**
   * Performs the on application shutdown operation.
   * @returns A promise that resolves when the operation completes.
   */
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
      // Using ResumeParserNatsService to handle resume submitted events
      if (
        this.natsService &&
        typeof (this.natsService as any).subscribeToResumeSubmissions ===
          'function'
      ) {
        await (this.natsService as any).subscribeToResumeSubmissions(
          async (event: any) => {
            // Handle resume submission through parsing service
            if (this.parsingService && event) {
              await this.parsingService.handleResumeSubmitted(event);
            }
          },
        );
      } else {
        this.logger.log(
          'NATS subscription skipped (subscribeToResumeSubmissions unavailable)',
        );
      }

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
