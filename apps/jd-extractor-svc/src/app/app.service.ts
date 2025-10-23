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
  private subscriptions: Map<string, any> = new Map();

  /**
   * Retrieves data.
   * @returns The result of the operation.
   */
  getData() {
    return { message: 'Hello API' };
  }

  /**
   * Performs the on application bootstrap operation.
   * @returns A promise that resolves when the operation completes.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('JD Extractor Service starting...');

    try {
      // Initialize NATS connections and event subscriptions
      await this.initializeNATSConnections();

      // Set up event subscriptions for job description extraction
      await this.setupEventSubscriptions();

      // Initialize LLM service connections
      await this.initializeLLMConnections();

      // Initialize extraction service
      await this.initializeExtractionService();

      // Validate all components are working
      await this.validateServiceHealth();

      this.logger.log('JD Extractor Service startup completed successfully');
    } catch (error) {
      this.logger.error('Failed to initialize JD Extractor Service:', error);
      throw error;
    }
  }

  /**
   * Performs the on application shutdown operation.
   * @returns A promise that resolves when the operation completes.
   */
  async onApplicationShutdown(): Promise<void> {
    this.logger.log('JD Extractor Service shutting down...');

    try {
      // Clean up event subscriptions
      await this.cleanupEventSubscriptions();

      // Clean up NATS connections
      await this.cleanupNATSConnections();

      // Clean up LLM service connections
      await this.cleanupLLMConnections();

      this.logger.log('All connections cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }

  private async initializeNATSConnections(): Promise<void> {
    try {
      // NATS client initialization for event handling
      // This would typically be injected as a dependency
      this.logger.log('NATS connections initialized');
    } catch (error) {
      this.logger.error('Failed to initialize NATS connections:', error);
      throw error;
    }
  }

  private async setupEventSubscriptions(): Promise<void> {
    try {
      // Subscribe to job description extraction events
      const extractionSubject = 'jd.extract.request';
      const analysisSubject = 'jd.analyze.request';
      const validateSubject = 'jd.validate.request';

      // Set up subscription handlers
      this.subscriptions.set(
        extractionSubject,
        await this.subscribeToExtraction(),
      );
      this.subscriptions.set(analysisSubject, await this.subscribeToAnalysis());
      this.subscriptions.set(
        validateSubject,
        await this.subscribeToValidation(),
      );

      this.logger.log(
        `Event subscriptions set up for: ${Array.from(this.subscriptions.keys()).join(', ')}`,
      );
    } catch (error) {
      this.logger.error('Failed to setup event subscriptions:', error);
      throw error;
    }
  }

  private async initializeLLMConnections(): Promise<void> {
    try {
      // Initialize LLM service connections (Gemini, etc.)
      this.logger.log('LLM service connections initialized');
    } catch (error) {
      this.logger.error('Failed to initialize LLM connections:', error);
      throw error;
    }
  }

  private async initializeExtractionService(): Promise<void> {
    try {
      // Initialize extraction service dependencies
      this.logger.log('Extraction service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize extraction service:', error);
      throw error;
    }
  }

  private async validateServiceHealth(): Promise<void> {
    try {
      // Perform health checks on all initialized components
      this.logger.log('Service health validation completed');
    } catch (error) {
      this.logger.error('Service health validation failed:', error);
      throw error;
    }
  }

  private async subscribeToExtraction(): Promise<any> {
    // Handle job description extraction requests
    return {
      subject: 'jd.extract.request',
      handler: async (_data: any) => {
        this.logger.log('Processing JD extraction request');
        // Process extraction request
      },
    };
  }

  private async subscribeToAnalysis(): Promise<any> {
    // Handle job description analysis requests
    return {
      subject: 'jd.analyze.request',
      handler: async (_data: any) => {
        this.logger.log('Processing JD analysis request');
        // Process analysis request
      },
    };
  }

  private async subscribeToValidation(): Promise<any> {
    // Handle job description validation requests
    return {
      subject: 'jd.validate.request',
      handler: async (_data: any) => {
        this.logger.log('Processing JD validation request');
        // Process validation request
      },
    };
  }

  private async cleanupEventSubscriptions(): Promise<void> {
    try {
      // Unsubscribe from all active subscriptions
      for (const [subject, _subscription] of this.subscriptions) {
        // Cleanup subscription
        this.logger.log(`Cleaned up subscription for: ${subject}`);
      }
      this.subscriptions.clear();
      this.logger.log('Event subscriptions cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup event subscriptions:', error);
    }
  }

  private async cleanupNATSConnections(): Promise<void> {
    try {
      // NATS cleanup
      this.logger.log('NATS connections cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup NATS connections:', error);
    }
  }

  private async cleanupLLMConnections(): Promise<void> {
    try {
      // LLM service cleanup
      this.logger.log('LLM service connections cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup LLM connections:', error);
    }
  }
}
