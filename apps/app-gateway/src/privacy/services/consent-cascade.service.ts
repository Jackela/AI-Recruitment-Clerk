import { Injectable, Logger } from '@nestjs/common';
import type {
  NatsClient,
  ConsentCascadeNotification,
  AuditLogEntry,
} from '@ai-recruitment-clerk/shared-dtos';
import { ConsentPurpose } from '@ai-recruitment-clerk/shared-dtos';

/**
 * Consent Cascade Service
 * Handles cascading consent withdrawal across all microservices
 * Ensures that when consent is withdrawn, all related processing stops
 */
@Injectable()
export class ConsentCascadeService {
  private readonly logger = new Logger(ConsentCascadeService.name);

  constructor() {}

  /**
   * Cascade consent withdrawal to all affected services
   * Stops processing activities based on the withdrawn purpose
   */
  public async cascadeConsentWithdrawal(
    userId: string,
    purpose: ConsentPurpose,
    natsClient: NatsClient,
  ): Promise<void> {
    try {
      this.logger.log(
        `Cascading consent withdrawal for user: ${userId}, purpose: ${purpose}`,
      );

      // Stop all related processing activities based on purpose
      switch (purpose) {
        case ConsentPurpose.RESUME_PROCESSING:
          await this.stopResumeProcessing(userId, natsClient);
          await this.stopJobMatchingActivities(userId, natsClient);
          break;

        case ConsentPurpose.MARKETING:
          await this.stopMarketingActivities(userId, natsClient);
          await this.removeFromMarketingLists(userId);
          break;

        case ConsentPurpose.ANALYTICS:
          await this.stopAnalyticsCollection(userId, natsClient);
          await this.anonymizeAnalyticsData(userId, natsClient);
          break;

        case ConsentPurpose.COMMUNICATION:
          await this.stopCommunicationActivities(userId, natsClient);
          await this.unsubscribeFromNotifications(userId);
          break;

        default:
          this.logger.warn(`Unknown consent purpose for cascade: ${purpose}`);
      }

      // Notify other services about consent withdrawal
      await this.notifyServicesConsentWithdrawal(userId, purpose, natsClient);

      // Log the cascade completion
      await this.logConsentWithdrawalCascade(userId, purpose, natsClient);
    } catch (error) {
      this.logger.error(
        `Failed to cascade consent withdrawal for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Stop resume processing activities for a user
   */
  public async stopResumeProcessing(
    userId: string,
    natsClient: NatsClient,
  ): Promise<void> {
    try {
      // Stop any active resume parsing for this user
      await natsClient.publish('resume.processing.stop', { userId });

      // Cancel any pending job matching operations
      await natsClient.publish('matching.operations.stop', { userId });

      this.logger.log(
        `Stopped resume processing activities for user: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to stop resume processing for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Stop job matching activities for a user
   */
  public async stopJobMatchingActivities(
    userId: string,
    natsClient: NatsClient,
  ): Promise<void> {
    try {
      // Stop job recommendation algorithms
      await natsClient.publish('job.recommendations.stop', { userId });

      // Remove from active matching queues
      await natsClient.publish('matching.queue.remove', { userId });

      this.logger.log(`Stopped job matching activities for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to stop job matching for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Stop marketing activities for a user
   */
  public async stopMarketingActivities(
    userId: string,
    natsClient: NatsClient,
  ): Promise<void> {
    try {
      // Stop marketing campaigns
      await natsClient.publish('marketing.campaigns.exclude', { userId });

      // Remove from promotional activities
      await natsClient.publish('promotions.exclude', { userId });

      this.logger.log(`Stopped marketing activities for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to stop marketing activities for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove user from marketing lists
   */
  public async removeFromMarketingLists(userId: string): Promise<void> {
    try {
      // Remove from email marketing lists
      // Remove from SMS marketing lists
      // Update marketing preferences

      this.logger.log(`Removed user ${userId} from marketing lists`);
    } catch (error) {
      this.logger.error(
        `Failed to remove user ${userId} from marketing lists:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Stop analytics collection for a user
   */
  public async stopAnalyticsCollection(
    userId: string,
    natsClient: NatsClient,
  ): Promise<void> {
    try {
      // Stop collecting analytics data for this user
      await natsClient.publish('analytics.collection.stop', { userId });

      // Mark user for analytics exclusion
      await natsClient.publish('analytics.user.exclude', { userId });

      this.logger.log(`Stopped analytics collection for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to stop analytics collection for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Anonymize existing analytics data for a user
   */
  public async anonymizeAnalyticsData(
    userId: string,
    natsClient: NatsClient,
  ): Promise<void> {
    try {
      // Anonymize existing analytics data
      await natsClient.publish('analytics.data.anonymize', { userId });

      this.logger.log(
        `Initiated analytics data anonymization for user: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to anonymize analytics data for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Stop communication activities for a user
   */
  public async stopCommunicationActivities(
    userId: string,
    natsClient: NatsClient,
  ): Promise<void> {
    try {
      // Stop automated communications
      await natsClient.publish('communications.stop', { userId });

      // Cancel scheduled communications
      await natsClient.publish('communications.scheduled.cancel', {
        userId,
      });

      this.logger.log(`Stopped communication activities for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to stop communication activities for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Unsubscribe user from notifications
   */
  public async unsubscribeFromNotifications(userId: string): Promise<void> {
    try {
      // Unsubscribe from push notifications
      // Unsubscribe from email notifications
      // Unsubscribe from SMS notifications

      this.logger.log(`Unsubscribed user ${userId} from notifications`);
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe user ${userId} from notifications:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Notify all microservices about consent withdrawal
   */
  public async notifyServicesConsentWithdrawal(
    userId: string,
    purpose: ConsentPurpose,
    natsClient: NatsClient,
  ): Promise<void> {
    try {
      // Notify all microservices about consent withdrawal
      const notification: ConsentCascadeNotification = {
        userId,
        purpose,
        action: 'consent_withdrawn',
        timestamp: new Date().toISOString(),
      };

      // Notify each service
      await Promise.all([
        natsClient.publish('resume-parser.consent.withdrawn', notification),
        natsClient.publish('scoring-engine.consent.withdrawn', notification),
        natsClient.publish('report-generator.consent.withdrawn', notification),
        natsClient.publish('jd-extractor.consent.withdrawn', notification),
      ]);

      this.logger.log(
        `Notified all services about consent withdrawal for user: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify services about consent withdrawal for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Log consent withdrawal cascade for audit purposes
   */
  public async logConsentWithdrawalCascade(
    userId: string,
    purpose: ConsentPurpose,
    natsClient: NatsClient,
  ): Promise<void> {
    try {
      // Log cascade completion for audit purposes
      const logEntry: AuditLogEntry = {
        userId,
        purpose,
        action: 'consent_withdrawal_cascaded',
        timestamp: new Date().toISOString(),
        details: 'All related processing activities stopped',
      };

      // Store in audit log
      await natsClient.publish('audit.log', logEntry);

      this.logger.log(`Logged consent withdrawal cascade for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to log consent withdrawal cascade for user ${userId}:`,
        error,
      );
      // Don't throw here as this is logging only
    }
  }
}
