import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type {
  NatsClient,
  ErasureEligibilityResult,
} from '@ai-recruitment-clerk/shared-dtos';
import type { UserProfileDocument } from '../../schemas/user-profile.schema';
import { UserProfile } from '../../schemas/user-profile.schema';

/**
 * Data Erasure Service
 * Handles GDPR right to be forgotten (Article 17)
 * Cascades data deletion across all microservices
 */
@Injectable()
export class DataErasureService {
  private readonly logger = new Logger(DataErasureService.name);

  constructor(
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
  ) {}

  /**
   * Cascade data deletion across all services
   * Deletes user data from gateway and notifies other services
   */
  public async cascadeDataDeletion(
    userId: string,
    specificCategories?: string[],
    natsClient?: NatsClient,
  ): Promise<void> {
    this.logger.log(`Cascading data deletion for user: ${userId}`, {
      specificCategories,
    });

    try {
      // Delete user profile from gateway
      await this.userProfileModel.deleteOne({ userId });
      this.logger.log(`Deleted user profile for: ${userId}`);

      // Notify other services to delete user data
      if (natsClient) {
        await Promise.all([
          natsClient.publish('user.data.delete', {
            userId,
            specificCategories,
          }),
          natsClient.publish('resume-parser.data.delete', { userId }),
          natsClient.publish('scoring-engine.data.delete', { userId }),
          natsClient.publish('report-generator.data.delete', { userId }),
          natsClient.publish('jd-extractor.data.delete', { userId }),
          natsClient.publish('analytics.data.delete', { userId }),
        ]);

        this.logger.log(
          `Notified all services about data deletion for user: ${userId}`,
        );
      }

      // Log deletion for audit purposes
      if (natsClient) {
        await natsClient.publish('audit.data_erasure', {
          userId,
          specificCategories,
          timestamp: new Date().toISOString(),
          action: 'data_deleted',
        });
      }

      this.logger.log(`Data erasure completed for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to cascade data deletion for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user is eligible for data erasure
   * Returns eligibility result with reason if not eligible
   */
  public async checkErasureEligibility(
    userId: string,
    natsClient?: NatsClient,
  ): Promise<ErasureEligibilityResult> {
    this.logger.log(`Checking erasure eligibility for user: ${userId}`);

    try {
      // TODO: Implement comprehensive eligibility checks:
      // - Active job applications that cannot be deleted
      // - Legal hold requirements
      // - Outstanding financial obligations
      // - Regulatory requirements for data retention

      // For now, return eligible
      // In production, this would check:
      // 1. Active job applications
      // 2. Pending contracts
      // 3. Legal holds
      // 4. Financial obligations
      // 5. Regulatory retention requirements

      if (natsClient) {
        // Query other services for erasure blockers
        const response = await natsClient.request(
          'erasure.eligibility.check',
          { userId },
          5000,
        );

        if (response && typeof response === 'object') {
          const eligibility = response as { eligible?: boolean; reason?: string };
          if (!eligibility.eligible) {
            return {
              eligible: false,
              reason: eligibility.reason || 'Eligibility check failed',
            };
          }
        }
      }

      return { eligible: true };
    } catch (error) {
      this.logger.error(
        `Failed to check erasure eligibility for user ${userId}:`,
        error,
      );
      // On error, default to not eligible to prevent accidental data loss
      return {
        eligible: false,
        reason: 'Unable to verify eligibility',
      };
    }
  }

  /**
   * Check for specific category deletion eligibility
   * Some data categories may have different retention requirements
   */
  public async checkCategoryErasureEligibility(
    userId: string,
    category: string,
    natsClient?: NatsClient,
  ): Promise<ErasureEligibilityResult> {
    this.logger.log(
      `Checking category erasure eligibility for user: ${userId}, category: ${category}`,
    );

    try {
      // Certain categories may have special handling
      const protectedCategories = [
        'transaction_records',
        'legal_documents',
        'audit_logs',
      ];

      if (protectedCategories.includes(category)) {
        return {
          eligible: false,
          reason: `Category ${category} is protected for legal/compliance reasons`,
        };
      }

      // Check with relevant service for category-specific eligibility
      if (natsClient) {
        await natsClient.publish('erasure.category.check', {
          userId,
          category,
        });
      }

      return { eligible: true };
    } catch (error) {
      this.logger.error(
        `Failed to check category erasure eligibility for user ${userId}:`,
        error,
      );
      return {
        eligible: false,
        reason: 'Unable to verify category eligibility',
      };
    }
  }

  /**
   * Partial data deletion for specific categories
   */
  public async deleteSpecificCategories(
    userId: string,
    categories: string[],
    natsClient?: NatsClient,
  ): Promise<void> {
    this.logger.log(
      `Deleting specific categories for user: ${userId}, categories: ${categories.join(', ')}`,
    );

    try {
      // Notify services to delete specific categories
      if (natsClient) {
        await natsClient.publish('user.data.categories.delete', {
          userId,
          categories,
        });
      }

      this.logger.log(
        `Category deletion completed for user: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete specific categories for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
