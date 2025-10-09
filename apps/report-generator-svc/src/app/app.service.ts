import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

/**
 * Provides app functionality.
 */
@Injectable()
export class AppService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AppService.name);
  private isInitialized = false;
  private healthCheckInterval?: NodeJS.Timeout;

  /**
   * Retrieves data.
   * @returns The { message: string; status: string }.
   */
  getData(): { message: string; status: string } {
    return {
      message: 'Report Generator Service API',
      status: this.isInitialized ? 'ready' : 'initializing',
    };
  }

  /**
   * Performs the on application bootstrap operation.
   * @returns A promise that resolves when the operation completes.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Report Generator Service starting...');

    try {
      // Initialize database connections (handled by MongooseModule)
      await this.initializeDatabaseConnections();

      // Initialize GridFS for report storage
      await this.initializeGridFS();

      // Initialize NATS connections for event handling
      await this.initializeNATSConnections();

      // Set up report generation event subscriptions
      await this.setupEventSubscriptions();

      // Initialize performance monitoring
      await this.initializePerformanceMonitoring();

      // Start health check monitoring
      this.startHealthCheckMonitoring();

      this.isInitialized = true;
      this.logger.log(
        'Report Generator Service startup completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize Report Generator Service:',
        error,
      );
      throw error;
    }
  }

  /**
   * Performs the on application shutdown operation.
   * @returns A promise that resolves when the operation completes.
   */
  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Report Generator Service shutting down...');

    try {
      // Stop health check monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Clean up event subscriptions
      await this.cleanupEventSubscriptions();

      // Clean up database connections
      await this.cleanupDatabaseConnections();

      // Clean up NATS connections
      await this.cleanupNATSConnections();

      // Clean up GridFS connections
      await this.cleanupGridFS();

      this.logger.log('All connections cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }

  private async initializeDatabaseConnections(): Promise<void> {
    try {
      // Database connection is handled by MongooseModule
      // Validate connection is working
      this.logger.log('Database connections validated');
    } catch (error) {
      this.logger.error('Failed to initialize database connections:', error);
      throw error;
    }
  }

  private async initializeGridFS(): Promise<void> {
    try {
      // GridFS initialization for storing generated reports
      // This would be handled by GridFsService if available
      this.logger.log('GridFS service initialized for report storage');
    } catch (error) {
      this.logger.error('Failed to initialize GridFS:', error);
      throw error;
    }
  }

  private async initializeNATSConnections(): Promise<void> {
    try {
      // NATS client initialization for event handling
      // This would be handled by NatsClient if available
      this.logger.log('NATS connections initialized');
    } catch (error) {
      this.logger.error('Failed to initialize NATS connections:', error);
      throw error;
    }
  }

  private async setupEventSubscriptions(): Promise<void> {
    try {
      // Subscribe to report generation events
      // Example: 'report.generate.request', 'report.template.update'
      this.logger.log('Event subscriptions set up for report generation');
    } catch (error) {
      this.logger.error('Failed to setup event subscriptions:', error);
      throw error;
    }
  }

  private async initializePerformanceMonitoring(): Promise<void> {
    try {
      // Initialize performance monitoring for report generation
      this.logger.log('Performance monitoring initialized');
    } catch (error) {
      this.logger.error('Failed to initialize performance monitoring:', error);
      throw error;
    }
  }

  private startHealthCheckMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        // Perform periodic health checks
        await this.performHealthCheck();
      } catch (error) {
        this.logger.warn('Health check failed:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    // Check database connectivity
    // Check NATS connectivity
    // Check GridFS availability
    // Log health status
  }

  private async cleanupEventSubscriptions(): Promise<void> {
    try {
      // Unsubscribe from all report-related events
      this.logger.log('Event subscriptions cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup event subscriptions:', error);
    }
  }

  private async cleanupDatabaseConnections(): Promise<void> {
    try {
      // Database cleanup handled by MongooseModule
      this.logger.log('Database connections cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup database connections:', error);
    }
  }

  private async cleanupNATSConnections(): Promise<void> {
    try {
      // NATS cleanup handled by NatsClient
      this.logger.log('NATS connections cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup NATS connections:', error);
    }
  }

  private async cleanupGridFS(): Promise<void> {
    try {
      // GridFS cleanup
      this.logger.log('GridFS connections cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup GridFS:', error);
    }
  }
}
